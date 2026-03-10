import { NextApiResponse } from "next";
import { updateMessage } from "@/db/chatMessage";
import { updateConversation } from "@/db/chatConversation";
import { callChatLLMStream, callPaperReadingLLMStream } from "./llmService";
import {
  callFolderRAGLLMStream,
  RAGSearchResultItem,
  HistoryMessage,
} from "./llm/folderRAGService";
import { RelatedPaper } from "./autoRelatedPapers";
import { AttachmentContent } from "./messageService";
import { getFolderById } from "@/db/paperFolder";
import { searchDataset } from "@/service/fastgpt/data";
import { getRecentMessages } from "@/db/chatMessage/query";
import logger from "@/helper/logger";

export interface StreamState {
  partialContent: string;
  reasoningContent: string;
}

export interface TokenStats {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens?: number;
}

export interface ConversationInfo {
  conversationType: string;
  folderId?: string | null;
  is_deep_think?: boolean;
}

export type TokenCallback = (data: {
  type: "reasoning" | "content";
  text: string;
}) => void;

export function setupSSEHeaders(res: NextApiResponse): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Content-Encoding", "none");
}

export function createTokenCallback(
  res: NextApiResponse,
  state: StreamState,
  isClientDisconnected: () => boolean
): TokenCallback {
  return (data: { type: "reasoning" | "content"; text: string }) => {
    if (isClientDisconnected()) return;

    if (data.type === "reasoning") {
      state.reasoningContent += data.text;
    } else {
      state.partialContent += data.text;
    }

    res.write(
      `data: ${JSON.stringify({
        type: data.type === "reasoning" ? "reasoning" : "token",
        content: data.text,
      })}\n\n`
    );
  };
}

export async function callLLMByConversationType(params: {
  conversation: ConversationInfo;
  conversationId: string;
  userInput: string;
  userId: string;
  onToken: TokenCallback;
  relatedPapers?: RelatedPaper[];
  attachmentContents?: AttachmentContent[];
  ragSearchResults?: RAGSearchResultItem[];
  history?: HistoryMessage[];
  contextText?: string;
  operationType?: string;
  targetLanguage?: string;
  currentMessageAttachmentIds?: string[];
  is_deep_think?: boolean;
}): Promise<TokenStats | null> {
  const {
    conversation,
    conversationId,
    userInput,
    userId,
    onToken,
    is_deep_think,
  } = params;
  const isPaperReading = conversation.conversationType === "paper_reading";
  const isFolderRAG = conversation.conversationType === "folder_rag";

  if (isFolderRAG) {
    if (!conversation.folderId) {
      throw new Error("文件夹知识库对话未关联文件夹");
    }

    return await callFolderRAGLLMStream({
      user_id: userId,
      folder_id: conversation.folderId,
      message: userInput,
      searchResults: params.ragSearchResults || [],
      history: params.history || [],
      is_deep_think,
      onToken,
    });
  } else if (isPaperReading) {
    return await callPaperReadingLLMStream({
      conversation_id: conversationId,
      userInput,
      contextText: params.contextText,
      operationType: params.operationType as any,
      targetLanguage: params.targetLanguage,
      overrideDeepThink: is_deep_think,
      currentMessageAttachmentIds: params.currentMessageAttachmentIds,
      onToken,
    });
  } else {
    await callChatLLMStream(
      conversationId,
      userInput,
      onToken,
      params.relatedPapers,
      params.attachmentContents,
      is_deep_think
    );
    return null;
  }
}

export function sendSSEEvent(
  res: NextApiResponse,
  type: string,
  data: Record<string, unknown> | unknown
): void {
  res.write(
    `data: ${JSON.stringify({
      type,
      ...(data as Record<string, unknown>),
    })}\n\n`
  );
}

export function sendSSEError(res: NextApiResponse, message: string): void {
  if (!res.headersSent) {
    setupSSEHeaders(res);
  }
  res.write(`data: ${JSON.stringify({ type: "error", message })}\n\n`);
  res.end();
}

export async function finalizeStreamResponse(params: {
  res: NextApiResponse;
  conversationId: string;
  messageId: string;
  messageCount: number;
  state: StreamState;
  tokenStats: TokenStats | null;
  isPaperReading: boolean;
}): Promise<void> {
  const {
    res,
    conversationId,
    messageId,
    messageCount,
    state,
    tokenStats,
    isPaperReading,
  } = params;

  await updateMessage(messageId, {
    content: state.partialContent,
    status: "completed",
    reasoningContent: state.reasoningContent || undefined,
    input_tokens: tokenStats?.input_tokens,
    output_tokens: tokenStats?.output_tokens,
    total_tokens: tokenStats?.total_tokens,
    reasoningTokens: tokenStats?.reasoning_tokens,
  });

  await updateConversation(conversationId, {
    message_count: messageCount,
  });

  const doneData: Record<string, unknown> = {
    type: "done",
    message_id: messageId,
  };

  if (isPaperReading && tokenStats) {
    doneData.input_tokens = tokenStats.input_tokens;
    doneData.output_tokens = tokenStats.output_tokens;
    doneData.total_tokens = tokenStats.total_tokens;
  }

  res.write(`data: ${JSON.stringify(doneData)}\n\n`);
}

export async function handleStreamError(params: {
  res: NextApiResponse;
  messageId: string | null;
  state: StreamState;
  error: unknown;
  isClientDisconnected: boolean;
  logPrefix: string;
}): Promise<void> {
  const { res, messageId, state, error, isClientDisconnected, logPrefix } =
    params;
  const errorMessage = error instanceof Error ? error.message : String(error);

  logger.error(`${logPrefix}失败`, { error: errorMessage });

  if (!isClientDisconnected && messageId) {
    if (state.partialContent) {
      await updateMessage(messageId, {
        content: state.partialContent,
        status: "error",
        error_message: errorMessage,
        reasoningContent: state.reasoningContent || undefined,
      });
    }

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        message: `${logPrefix}失败: ${errorMessage}`,
      })}\n\n`
    );
  }
}

export interface FolderRAGContext {
  ragSearchResults: RAGSearchResultItem[];
  history: HistoryMessage[];
}

export async function prepareFolderRAGContext(params: {
  conversation: { folderId: string | null };
  userInput: string;
  conversationId: string;
  res: NextApiResponse;
}): Promise<FolderRAGContext> {
  const { conversation, userInput, conversationId, res } = params;

  if (!conversation.folderId) {
    throw new Error("文件夹知识库对话未关联文件夹");
  }

  const folder = await getFolderById(conversation.folderId);
  if (!folder) {
    throw new Error("关联的文件夹不存在");
  }
  if (!folder.fastgpt_dataset_id) {
    throw new Error("该文件夹未关联知识库，无法进行对话");
  }

  let ragSearchResults: RAGSearchResultItem[] = [];
  try {
    ragSearchResults = await searchDataset({
      datasetId: folder.fastgpt_dataset_id,
      text: userInput,
      limit: 5,
      similarity: 0.5,
      searchMode: "embedding",
    });
  } catch (searchError) {
    logger.error("知识库搜索失败", {
      error:
        searchError instanceof Error
          ? searchError.message
          : String(searchError),
      datasetId: folder.fastgpt_dataset_id,
      folderId: conversation.folderId,
    });
  }

  sendSSEEvent(res, "sources", {
    data: ragSearchResults.map((item) => ({
      id: item.id,
      content: item.q,
      answer: item.a,
      score: item.score?.[0]?.value || 0,
      sourceName: item.sourceName,
    })),
  });

  const recentMessages = await getRecentMessages(conversationId, 10);
  const history = recentMessages.map((msg) => ({
    role: msg.role as "user" | "assistant",
    content: msg.content,
  }));

  return { ragSearchResults, history };
}
