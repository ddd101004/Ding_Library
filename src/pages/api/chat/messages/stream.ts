import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { sendMethodNotAllowedResponse } from "@/helper/responseHelper";
import { createAssistantMessage, updateMessage } from "@/db/chatMessage";
import { upsertReadingRecord } from "@/db/ai-reading/readingRecord";
import {
  validateConversation,
  prepareUserMessage,
  updateConversationSettings,
  executeAutoSearch,
  formatRelatedPapers,
  finalizeConversationMessageCount,
  getConversationAttachmentContents,
  MessageRequestParams,
  ConversationValidationResult,
  AttachmentContent,
} from "@/service/chat/messageService";
import {
  setupSSEHeaders,
  createTokenCallback,
  callLLMByConversationType,
  sendSSEEvent,
  sendSSEError,
  handleStreamError,
  prepareFolderRAGContext,
  StreamState,
} from "@/service/chat/streamHelper";
import type {
  RAGSearchResultItem,
  HistoryMessage,
} from "@/service/chat/llm/folderRAGService";
import logger from "@/helper/logger";

/**
 * POST - 流式发送消息
 * 统一支持普通对话和 AI 伴读对话
 *
 * 新流程（开启论文检索时）：
 * 1. 先执行论文检索（同步等待）
 * 2. 将检索到的论文作为上下文传给 AI
 * 3. AI 基于论文进行回复，并在回复中标注引用来源
 * 4. SSE 返回：start → token → related_papers → done
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  setupSSEHeaders(res);

  const params: MessageRequestParams = {
    conversation_id: req.body.conversation_id,
    content: req.body.content,
    cited_paper_ids: req.body.cited_paper_ids,
    attachment_ids: req.body.attachment_ids,
    is_deep_think: req.body.is_deep_think,
    auto_search_papers: req.body.auto_search_papers,
    context_text: req.body.context_text,
    context_range: req.body.context_range,
    operation_type: req.body.operation_type || "analyze",
    target_language: req.body.target_language || "英文",
  };

  let messageId: string | null = null;
  let isClientDisconnected = false;
  let conversation: ConversationValidationResult["conversation"] | null = null;
  let isPaperReading = false;
  let isFolderRAG = false;
  const state: StreamState = {
    partialContent: "",
    reasoningContent: "",
  };

  req.on("close", async () => {
    isClientDisconnected = true;
    if (messageId && !res.writableEnded) {
      try {
        await updateMessage(messageId, {
          status: "stopped",
          content: state.partialContent,
          reasoningContent: state.reasoningContent || undefined,
        });
        logger.info("客户端断开连接，消息已保存", {
          messageId,
          conversationType: conversation?.conversationType,
        });
      } catch (error) {
        logger.error("客户端断开时保存消息失败", {
          messageId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  try {
    const validationResult = await validateConversation(params, userId);
    if (!validationResult.success) {
      return sendSSEError(res, validationResult.errorMessage);
    }

    conversation = validationResult.conversation;
    isPaperReading = validationResult.isPaperReading;
    isFolderRAG = conversation.conversationType === "folder_rag";

    const userMessageResult = await prepareUserMessage(params);
    if (!userMessageResult.success) {
      return sendSSEError(res, userMessageResult.errorMessage);
    }

    const { userMessage, messageCount } = userMessageResult;

    await updateConversationSettings(
      params.conversation_id,
      params,
      messageCount
    );

    const { searchResult, relatedPapers } = await executeAutoSearch({
      conversationId: params.conversation_id,
      content: params.content,
      messageId: userMessage.message_id,
      isPaperReading,
      autoSearchPapers: params.auto_search_papers,
      conversationAutoSearch: conversation.autoSearchPapers,
      logPrefix: "",
    });

    const assistantMessage = await createAssistantMessage({
      conversation_id: params.conversation_id,
      content: "",
      message_order: messageCount + 2,
      status: "streaming",
    });

    if (!assistantMessage) {
      return sendSSEError(res, "创建AI消息失败");
    }

    messageId = assistantMessage.message_id;

    sendSSEEvent(res, "start", {
      message_id: messageId,
      message_order: messageCount + 2,
    });

    try {
      const onTokenCallback = createTokenCallback(
        res,
        state,
        () => isClientDisconnected
      );

      let ragSearchResults: RAGSearchResultItem[] = [];
      let history: HistoryMessage[] = [];
      let attachmentContents: AttachmentContent[] = [];

      if (isFolderRAG) {
        const folderContext = await prepareFolderRAGContext({
          conversation,
          userInput: params.content,
          conversationId: params.conversation_id,
          res,
        });
        ragSearchResults = folderContext.ragSearchResults;
        history = folderContext.history;
      } else if (!isPaperReading) {
        attachmentContents = await getConversationAttachmentContents(
          params.conversation_id
        );
        if (attachmentContents.length > 0) {
          logger.info("普通对话加载附件内容", {
            conversationId: params.conversation_id,
            attachmentCount: attachmentContents.length,
          });
        }
      }

      const tokenStats = await callLLMByConversationType({
        conversation,
        conversationId: params.conversation_id,
        userInput: params.content,
        userId,
        onToken: onTokenCallback,
        relatedPapers,
        attachmentContents,
        ragSearchResults,
        history,
        contextText: params.context_text,
        operationType: params.operation_type,
        targetLanguage: params.target_language,
        currentMessageAttachmentIds: params.attachment_ids,
        is_deep_think: params.is_deep_think,
      });

      if (!isClientDisconnected) {
        const messageUpdateData: Record<string, unknown> = {
          content: state.partialContent,
          status: "completed",
        };

        if (state.reasoningContent) {
          messageUpdateData.reasoningContent = state.reasoningContent;
        }

        if (isPaperReading) {
          if (tokenStats) {
            messageUpdateData.input_tokens = tokenStats.input_tokens;
            messageUpdateData.output_tokens = tokenStats.output_tokens;
            messageUpdateData.total_tokens = tokenStats.total_tokens;
            messageUpdateData.reasoningTokens = tokenStats.reasoning_tokens;
          }
          messageUpdateData.messageType = params.operation_type;
          if (params.context_text) {
            messageUpdateData.contextText = params.context_text;
          }
          if (params.context_range) {
            messageUpdateData.contextRange = params.context_range;
          }
        }

        await updateMessage(messageId, messageUpdateData);

        await finalizeConversationMessageCount(
          params.conversation_id,
          messageCount + 2
        );

        if (isPaperReading && conversation.uploadedPaperId) {
          await upsertReadingRecord({
            user_id: userId,
            uploaded_paper_id: conversation.uploadedPaperId,
            ai_question_asked: 1,
          });
        }

        const formattedPapers = await formatRelatedPapers(searchResult, userId);
        if (formattedPapers) {
          sendSSEEvent(res, "related_papers", formattedPapers);
        }

        const doneData: Record<string, unknown> = {
          message_id: messageId,
        };

        if (isPaperReading && tokenStats) {
          doneData.input_tokens = tokenStats.input_tokens;
          doneData.output_tokens = tokenStats.output_tokens;
          doneData.total_tokens = tokenStats.total_tokens;
        }

        sendSSEEvent(res, "done", doneData);
      }
    } catch (error: unknown) {
      await handleStreamError({
        res,
        messageId,
        state,
        error,
        isClientDisconnected,
        logPrefix: "LLM流式调用",
      });
    } finally {
      if (!isClientDisconnected) {
        res.end();
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("处理流式消息失败", {
      error: errorMessage,
      conversationType: conversation?.conversationType,
    });
    if (!res.writableEnded) {
      sendSSEError(res, "操作失败: " + errorMessage);
    }
  }
};

/**
 * 流式消息 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(handler);
