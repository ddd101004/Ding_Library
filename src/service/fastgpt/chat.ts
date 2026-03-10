/**
 * FastGPT 对话服务
 * 封装对话相关的 API 调用
 */

import { fastgptClient, FastGPTClient } from "./client";
import type {
  ChatCompletionParams,
  ChatCompletionResponse,
  ChatCompletionChunk,
  GetHistoriesParams,
  GetHistoriesResponse,
  HistoryItem,
  GetChatRecordsParams,
  GetChatRecordsResponse,
  ChatRecordItem,
} from "@/type/fastgpt";
import logger from "@/helper/logger";

/**
 * 发起对话（非流式）
 * @param params 对话参数
 * @returns 对话响应
 */
export async function chatCompletion(
  params: ChatCompletionParams
): Promise<ChatCompletionResponse> {
  const response = await fastgptClient.post<ChatCompletionResponse>(
    "/v1/chat/completions",
    {
      chatId: params.chatId,
      stream: false,
      detail: params.detail ?? false,
      responseChatItemId: params.responseChatItemId,
      variables: params.variables || {},
      messages: params.messages,
    }
  );

  logger.info("[FastGPT] Chat completion:", {
    chatId: params.chatId,
    messageCount: params.messages.length,
    responseLength: response.data?.choices?.[0]?.message?.content?.length || 0,
  });

  return response.data;
}

/**
 * 发起对话（流式）
 * 返回可读流，需要在调用方处理 SSE 数据
 * @param params 对话参数
 * @returns 可读流响应
 */
export async function chatCompletionStream(
  params: ChatCompletionParams
): Promise<NodeJS.ReadableStream> {
  const response = await fastgptClient.postRaw(
    "/v1/chat/completions",
    {
      chatId: params.chatId,
      stream: true,
      detail: params.detail ?? false,
      responseChatItemId: params.responseChatItemId,
      variables: params.variables || {},
      messages: params.messages,
    },
    {
      responseType: "stream",
    }
  );

  logger.info("[FastGPT] Chat completion stream started:", {
    chatId: params.chatId,
    messageCount: params.messages.length,
  });

  return response.data;
}

/**
 * 解析 SSE 流数据块
 * @param chunk 数据块字符串
 * @returns 解析后的对象数组
 */
export function parseSSEChunk(chunk: string): ChatCompletionChunk[] {
  const lines = chunk.split("\n");
  const results: ChatCompletionChunk[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith("data: ")) {
      const data = trimmedLine.slice(6);
      if (data === "[DONE]") {
        continue;
      }
      try {
        const parsed = JSON.parse(data) as ChatCompletionChunk;
        results.push(parsed);
      } catch (e) {
        // 忽略解析错误
        logger.debug("[FastGPT] SSE parse error:", { data, error: e });
      }
    }
  }

  return results;
}

// ==================== 历史记录相关 ====================

/**
 * 获取应用的历史记录列表
 * @param params 查询参数
 * @returns 历史记录列表
 */
export async function getHistories(
  params: GetHistoriesParams
): Promise<GetHistoriesResponse> {
  const response = await fastgptClient.post<GetHistoriesResponse>(
    "/core/chat/history/getHistories",
    {
      appId: params.appId,
      offset: params.offset || 0,
      pageSize: params.pageSize || 20,
      source: params.source || "api",
    }
  );

  return response.data || { list: [], total: 0 };
}

/**
 * 修改对话标题
 * @param params 更新参数
 */
export async function updateHistoryTitle(params: {
  appId: string;
  chatId: string;
  customTitle: string;
}): Promise<void> {
  await fastgptClient.post("/core/chat/history/updateHistory", params);

  logger.info("[FastGPT] History title updated:", {
    chatId: params.chatId,
    title: params.customTitle,
  });
}

/**
 * 置顶/取消置顶对话
 * @param params 更新参数
 */
export async function toggleHistoryTop(params: {
  appId: string;
  chatId: string;
  top: boolean;
}): Promise<void> {
  await fastgptClient.post("/core/chat/history/updateHistory", params);

  logger.info("[FastGPT] History top toggled:", {
    chatId: params.chatId,
    top: params.top,
  });
}

/**
 * 删除历史记录
 * @param appId 应用ID
 * @param chatId 对话ID
 */
export async function deleteHistory(
  appId: string,
  chatId: string
): Promise<void> {
  await fastgptClient.delete("/core/chat/history/delHistory", {
    appId,
    chatId,
  });

  logger.info("[FastGPT] History deleted:", { appId, chatId });
}

/**
 * 清空所有历史记录
 * 仅清空通过 API Key 创建的对话历史记录
 * @param appId 应用ID
 */
export async function clearHistories(appId: string): Promise<void> {
  await fastgptClient.delete("/core/chat/history/clearHistories", {
    appId,
  });

  logger.info("[FastGPT] All histories cleared:", { appId });
}

// ==================== 对话记录相关 ====================

/**
 * 获取单个对话初始化信息
 * @param appId 应用ID
 * @param chatId 对话ID
 * @returns 初始化信息
 */
export async function getChatInit(
  appId: string,
  chatId: string
): Promise<{
  chatId: string;
  app: Record<string, unknown>;
  title: string;
}> {
  const response = await fastgptClient.get("/core/chat/init", {
    appId,
    chatId,
  });

  return response.data as {
    chatId: string;
    app: Record<string, unknown>;
    title: string;
  };
}

/**
 * 获取对话记录列表
 * @param params 查询参数
 * @returns 对话记录列表
 */
export async function getChatRecords(
  params: GetChatRecordsParams
): Promise<GetChatRecordsResponse> {
  const response = await fastgptClient.post<GetChatRecordsResponse>(
    "/core/chat/getPaginationRecords",
    {
      appId: params.appId,
      chatId: params.chatId,
      offset: params.offset || 0,
      pageSize: params.pageSize || 10,
      loadCustomFeedbacks: params.loadCustomFeedbacks ?? true,
    }
  );

  return response.data || { list: [], total: 0 };
}

/**
 * 获取单个对话记录运行详情
 * @param appId 应用ID
 * @param chatId 对话ID
 * @param dataId 记录ID
 * @returns 运行详情
 */
export async function getChatResData(
  appId: string,
  chatId: string,
  dataId: string
): Promise<ChatCompletionResponse["responseData"]> {
  const response = await fastgptClient.get("/core/chat/getResData", {
    appId,
    chatId,
    dataId,
  });

  return response.data as ChatCompletionResponse["responseData"];
}

/**
 * 删除对话记录
 * @param appId 应用ID
 * @param chatId 对话ID
 * @param contentId 内容ID
 */
export async function deleteChatItem(
  appId: string,
  chatId: string,
  contentId: string
): Promise<void> {
  await fastgptClient.delete("/core/chat/item/delete", {
    appId,
    chatId,
    contentId,
  });

  logger.info("[FastGPT] Chat item deleted:", { appId, chatId, contentId });
}

/**
 * 点赞/取消点赞
 * @param params 反馈参数
 */
export async function updateGoodFeedback(params: {
  appId: string;
  chatId: string;
  dataId: string;
  userGoodFeedback?: string;
}): Promise<void> {
  await fastgptClient.post("/core/chat/feedback/updateUserFeedback", params);

  logger.info("[FastGPT] Good feedback updated:", {
    chatId: params.chatId,
    dataId: params.dataId,
  });
}

/**
 * 点踩/取消点踩
 * @param params 反馈参数
 */
export async function updateBadFeedback(params: {
  appId: string;
  chatId: string;
  dataId: string;
  userBadFeedback?: string;
}): Promise<void> {
  await fastgptClient.post("/core/chat/feedback/updateUserFeedback", params);

  logger.info("[FastGPT] Bad feedback updated:", {
    chatId: params.chatId,
    dataId: params.dataId,
  });
}

// ==================== 猜你想问 ====================

/**
 * 生成猜你想问
 * @param params 请求参数
 * @returns 推荐问题列表
 */
export async function createQuestionGuide(params: {
  appId: string;
  chatId: string;
  questionGuide?: {
    open: boolean;
    model?: string;
    customPrompt?: string;
  };
}): Promise<string[]> {
  const response = await fastgptClient.post<string[]>(
    "/core/ai/agent/v2/createQuestionGuide",
    {
      appId: params.appId,
      chatId: params.chatId,
      questionGuide: params.questionGuide || {
        open: true,
      },
    }
  );

  return response.data || [];
}
