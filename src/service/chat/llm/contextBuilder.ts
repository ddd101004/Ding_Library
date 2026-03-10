import logger from "@/helper/logger";
import { getConversationById } from "@/db/chatConversation";
import { getRecentMessages } from "@/db/chatMessage";
import { estimateTokens } from "./tokenEstimator";
import { CONVERSATION_MAX_TOKENS } from "@/constants";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

/**
 * 构建上下文
 * 根据会话配置的 context_window 和 max_tokens 限制，获取最近的消息作为上下文
 *
 * @param conversation_id - 会话 ID
 * @returns 上下文消息列表
 */
export async function buildContext(
  conversation_id: string
): Promise<ChatCompletionMessageParam[]> {
  try {
    // 1. 获取会话配置
    const conversation = await getConversationById(conversation_id);
    if (!conversation) {
      throw new Error("会话不存在");
    }

    const contextWindow = conversation.context_window || 10;
    const maxTokens = conversation.max_tokens || CONVERSATION_MAX_TOKENS;
    const model = conversation.model || process.env.LLM_MODEL!;

    // 2. 获取最近N条消息
    const messages = await getRecentMessages(conversation_id, contextWindow);

    // 3. 从最新到最旧倒序处理，确保不超过max_tokens
    let totalTokens = 0;
    const context: ChatCompletionMessageParam[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      // 使用精确的 tiktoken 计算，传递模型参数
      const msgTokens = estimateTokens(msg.content, model);

      if (totalTokens + msgTokens > maxTokens) {
        break; // 超过限制，停止添加
      }

      context.unshift({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      });
      totalTokens += msgTokens;
    }

    return context;
  } catch (error: any) {
    logger.error(`构建上下文失败: ${error?.message}`, { error });
    return [];
  }
}
