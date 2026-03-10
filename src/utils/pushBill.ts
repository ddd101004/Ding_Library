import { addBill } from "@/db/bill";
import logger from "@/helper/logger";
import type { ChatCompletion } from "openai/resources/chat/completions";

/**
 * 记录 AI 调用用量到 bill 表
 * @param response - AI 模型的响应对象
 * @param user_id - 用户 ID
 * @param type - 用量类型（如：ai_keywords, ai_questions, ai_questions_quick）
 * @param input_content - 输入内容
 */
export async function pushBill(
  response: ChatCompletion,
  user_id: string,
  type: string,
  input_content: string
): Promise<void> {
  try {
    // 提取 AI 响应内容和 token 统计
    const output_content = response.choices[0]?.message?.content || "";

    // 提取思考过程内容
    const reasoning_content =
      (response.choices[0]?.message as any)?.reasoning_content || null;

    // 提取 token 统计
    const input_tokens = response.usage?.prompt_tokens || 0;
    const output_tokens = response.usage?.completion_tokens || 0;
    const total_tokens = response.usage?.total_tokens || 0;

    // 提取思考过程的 token 消耗
    const reasoning_tokens =
      (response.usage as any)?.completion_tokens_details?.reasoning_tokens || 0;

    const model = response.model;

    // 记录到 bill 表
    await addBill({
      user_id,
      input_content,
      output_content,
      reasoning_content,
      input_tokens,
      output_tokens,
      reasoning_tokens,
      total_tokens,
      model,
      type,
    });

    logger.info("AI 用量记录成功", {
      user_id,
      type,
      total_tokens,
      reasoning_tokens,
      model,
      has_reasoning: !!reasoning_content,
    });
  } catch (error: any) {
    logger.error(`记录 AI 用量失败: ${error?.message}`, {
      error,
      user_id,
      type,
    });
    // 不抛出错误，避免影响主流程
  }
}
