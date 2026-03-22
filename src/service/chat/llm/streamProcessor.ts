import logger from "@/helper/logger";

/**
 * 通用流式处理函数
 * 处理 OpenAI SDK 的流式响应，收集内容和统计信息
 *
 * @param stream - OpenAI stream 对象
 * @param onToken - token 回调函数
 * @returns 完整内容、思考过程和 token 统计
 */
export async function processLLMStream(
  stream: AsyncIterable<any>,
  onToken: (data: { type: "reasoning" | "content"; text: string }) => void
): Promise<{
  fullContent: string;
  fullReasoning: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
}> {
  let fullContent = "";
  let fullReasoning = "";
  let usage:
    | {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      }
    | undefined;

  // 处理流式响应
  for await (const chunk of stream) {
    // 思考过程
    const reasoning = (chunk.choices[0]?.delta as any)?.reasoning_content;
    if (reasoning) {
      fullReasoning += reasoning;
      onToken({ type: "reasoning", text: reasoning });
    }

    // 最终答案
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      fullContent += content;
      onToken({ type: "content", text: content });
    }

    // 最后一个 chunk 包含 usage 信息
    if (chunk.usage) {
      usage = {
        prompt_tokens: chunk.usage.prompt_tokens,
        completion_tokens: chunk.usage.completion_tokens,
        total_tokens: chunk.usage.total_tokens,
      };
    }
  }

  const reasoningTokens = (usage as any)?.reasoning_tokens || 0;

  if (!usage) {
    logger.warn("流式调用未返回 usage 信息");
  }

  return {
    fullContent,
    fullReasoning,
    input_tokens: usage?.prompt_tokens || 0,
    output_tokens: usage?.completion_tokens || 0,
    total_tokens: usage?.total_tokens || 0,
    reasoning_tokens: reasoningTokens,
  };
}
