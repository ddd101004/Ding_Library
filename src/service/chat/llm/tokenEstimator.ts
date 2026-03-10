import logger from "@/helper/logger";
import { Tiktoken, encoding_for_model, get_encoding } from "tiktoken";

// 编码器缓存，避免重复创建
let cachedEncoder: Tiktoken | null = null;
let cachedEncoderModel: string | null = null;

/**
 * 获取指定模型的编码器
 * @param model - 模型名称，如 "deepseek-v3", "gpt-3.5-turbo" 等
 * @returns Tiktoken 编码器实例
 */
function getEncoder(model?: string): Tiktoken {
  try {
    // 如果提供了模型名称且与缓存的不同，重新创建编码器
    if (model && cachedEncoderModel !== model) {
      // 释放旧的编码器
      if (cachedEncoder) {
        cachedEncoder.free();
      }

      try {
        // 尝试为特定模型获取编码器
        cachedEncoder = encoding_for_model(model as any);
        cachedEncoderModel = model;
      } catch {
        // 如果模型不被识别，使用 cl100k_base（deepseek-v3/GPT-3.5-turbo 的编码器）
        cachedEncoder = get_encoding("cl100k_base");
        cachedEncoderModel = null;
      }
    } else if (!cachedEncoder) {
      // 没有缓存的编码器，创建默认编码器 cl100k_base
      cachedEncoder = get_encoding("cl100k_base");
      cachedEncoderModel = null;
    }

    return cachedEncoder;
  } catch (error) {
    logger.error("获取 tiktoken 编码器失败", { error });
    // 如果已有缓存的编码器，返回它
    if (cachedEncoder) {
      return cachedEncoder;
    }
    // 否则创建默认编码器
    cachedEncoder = get_encoding("cl100k_base");
    return cachedEncoder;
  }
}

/**
 * 精确计算文本的 Token 数量
 * 使用 tiktoken 库进行精确计算，支持所有 OpenAI 模型
 * @param text - 要计算的文本
 * @param model - 可选的模型名称，用于选择合适的编码器
 * @returns 精确的 Token 数量
 */
export function estimateTokens(text: string, model?: string): number {
  if (!text) return 0;

  try {
    const encoder = getEncoder(model);
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    // 如果 tiktoken 失败，使用降级方案（粗略估算）
    logger.warn("tiktoken 计算失败，使用降级估算方案", { error });
    return fallbackEstimateTokens(text);
  }
}

/**
 * 降级方案：基于经验值的粗略估算
 * 仅在 tiktoken 失败时使用
 */
function fallbackEstimateTokens(text: string): number {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  const numbersAndPunctuation = (text.match(/[\d\p{P}]/gu) || []).length;

  const baseTokens =
    chineseChars * 2 + englishWords * 1.3 + numbersAndPunctuation * 0.5;

  return Math.ceil(baseTokens * 1.1);
}

/**
 * 释放编码器资源
 * 在应用关闭时调用，避免内存泄漏
 */
export function cleanupEncoder(): void {
  if (cachedEncoder) {
    cachedEncoder.free();
    cachedEncoder = null;
    cachedEncoderModel = null;
  }
}
