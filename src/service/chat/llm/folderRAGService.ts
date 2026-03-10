/**
 * 文件夹知识库 RAG 对话服务
 * 提供基于 FastGPT 知识库的 RAG 对话能力
 */

import logger from "@/helper/logger";
import { getAIChatApi } from "@/lib/ai/client";
import { processLLMStream } from "./streamProcessor";
import { callAI } from "../llmService";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * RAG 搜索结果项类型（匹配 FastGPT API 实际返回格式）
 */
export interface RAGSearchResultItem {
  id: string;
  q: string;
  a?: string;
  score: Array<{ index: number; type: string; value: number }>;
  sourceName?: string;
  sourceId?: string;
  collectionId?: string;
  datasetId?: string;
}

/**
 * 历史消息类型
 */
export interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * 文件夹 RAG 对话参数
 */
export interface FolderRAGParams {
  user_id: string;
  folder_id: string;
  message: string;
  searchResults: RAGSearchResultItem[];
  history?: HistoryMessage[];
  is_deep_think?: boolean;
}

/**
 * 文件夹 RAG 流式对话参数
 */
export interface FolderRAGStreamParams extends FolderRAGParams {
  onToken: (data: { type: "reasoning" | "content"; text: string }) => void;
}

/**
 * RAG 系统提示词
 */
const RAG_SYSTEM_PROMPT = `你是一个专业的知识库问答助手，专门基于用户上传的文档内容回答问题。

## 核心规则

1. **优先使用知识库内容**：回答必须主要基于提供的参考资料
2. **承认知识边界**：如果参考资料中没有相关信息，请明确告知用户
3. **保持对话连贯**：结合历史对话上下文理解用户意图

## 回答格式

- 先给出直接答案，再补充细节
- 如需补充知识库外的信息，请明确标注"根据我的知识..."

## 注意事项

- 不要编造参考资料中不存在的内容
- 保持专业、准确、简洁的回答风格
- 适当使用列表、分点等格式提升可读性`;

/**
 * 构建 RAG 上下文提示词
 * @param context RAG 搜索结果列表
 * @returns 格式化的上下文文本
 */
function buildContextPrompt(context: RAGSearchResultItem[]): string {
  if (context.length === 0) {
    return "";
  }

  const contextText = context
    .map((item, index) => {
      const content = item.a ? `${item.q}\n${item.a}` : item.q;
      const source = item.sourceName
        ? `（知识库来源：${item.sourceName}）`
        : "";
      return `[${index + 1}] ${content}${source}`;
    })
    .join("\n\n");

  return `## 知识库参考资料

${contextText}`;
}

/**
 * 构建用户消息（包含上下文）
 * @param context RAG 搜索结果列表
 * @param question 用户问题
 * @returns 完整的用户消息
 */
function buildUserMessage(
  context: RAGSearchResultItem[],
  question: string
): string {
  const contextPrompt = buildContextPrompt(context);

  if (!contextPrompt) {
    return question;
  }

  return `${contextPrompt}

## 用户问题

${question}`;
}

/**
 * 获取模型名称
 * 根据是否开启深度思考选择模型
 */
function getModel(isDeepThink?: boolean): string {
  if (isDeepThink) {
    return process.env.LLM_THINKING_MODEL!;
  }
  return process.env.LLM_MODEL!;
}

/**
 * 构建消息列表（包含历史记录）
 * @param history 历史消息
 * @param searchResults RAG 搜索结果
 * @param currentMessage 当前用户消息
 * @param maxHistoryLength 最大历史消息数量
 */
function buildMessages(
  history: HistoryMessage[],
  searchResults: RAGSearchResultItem[],
  currentMessage: string,
  maxHistoryLength: number = 10
): ChatCompletionMessageParam[] {
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: RAG_SYSTEM_PROMPT,
    },
  ];

  // 添加历史消息（限制数量，保留最近的）
  const recentHistory = history.slice(-maxHistoryLength);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // 添加当前用户消息（包含搜索结果上下文）
  messages.push({
    role: "user",
    content: buildUserMessage(searchResults, currentMessage),
  });

  return messages;
}

/**
 * 文件夹知识库 RAG 对话（非流式）
 * @param params.user_id - 用户ID
 * @param params.folder_id - 文件夹ID
 * @param params.message - 用户消息
 * @param params.searchResults - RAG 搜索结果
 * @param params.history - 历史消息
 * @param params.is_deep_think - 是否开启深度思考
 * @returns AI 回答和 token 统计
 */
export async function callFolderRAGLLM(params: FolderRAGParams): Promise<{
  content: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}> {
  const {
    user_id,
    folder_id,
    message,
    searchResults,
    history = [],
    is_deep_think,
  } = params;

  try {
    // 1. 获取模型
    const model = getModel(is_deep_think);

    // 2. 构建消息列表（包含历史记录）
    const messages = buildMessages(history, searchResults, message);

    // 3. 调用 AI
    const result = await callAI({
      user_id,
      messages,
      type: "folder_rag_chat",
      input_content: message,
      model,
      temperature: 0.7,
    });

    logger.info("文件夹 RAG 对话完成", {
      folder_id,
      user_id,
      searchResultCount: searchResults.length,
      historyLength: history.length,
      total_tokens: result.total_tokens,
      is_deep_think,
      model,
    });

    return {
      content: result.content,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.total_tokens,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("文件夹 RAG 对话失败", {
      error: errorMessage,
      folder_id,
      user_id,
    });
    throw error;
  }
}

/**
 * 文件夹知识库 RAG 对话（流式）
 * @param params.user_id - 用户ID
 * @param params.folder_id - 文件夹ID
 * @param params.message - 用户消息
 * @param params.searchResults - RAG 搜索结果
 * @param params.history - 历史消息
 * @param params.is_deep_think - 是否开启深度思考
 * @param params.onToken - token 回调函数
 * @returns token 统计信息
 */
export async function callFolderRAGLLMStream(
  params: FolderRAGStreamParams
): Promise<{
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
}> {
  const {
    user_id,
    folder_id,
    message,
    searchResults,
    history = [],
    is_deep_think,
    onToken,
  } = params;

  try {
    // 1. 获取模型
    const model = getModel(is_deep_think);

    if (is_deep_think) {
      logger.info("文件夹 RAG 对话使用深度思考模式", {
        folder_id,
        user_id,
        model,
      });
    }

    // 2. 构建消息列表（包含历史记录）
    const messages = buildMessages(history, searchResults, message);

    // 3. 调用 LLM API（流式）
    const openai = await getAIChatApi();
    const stream = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      stream: true,
      stream_options: { include_usage: true },
    });

    // 4. 使用通用流式处理函数处理响应
    const result = await processLLMStream(stream, onToken, {
      user_id,
      model,
      bill_type: "folder_rag_chat",
      input_content: message,
    });

    logger.info("文件夹 RAG 流式对话完成", {
      folder_id,
      user_id,
      searchResultCount: searchResults.length,
      historyLength: history.length,
      total_tokens: result.total_tokens,
      is_deep_think,
      model,
    });

    return {
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.total_tokens,
      reasoning_tokens: result.reasoning_tokens,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("文件夹 RAG 流式对话失败", {
      error: errorMessage,
      folder_id,
      user_id,
    });
    throw error;
  }
}
