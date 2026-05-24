/**
 * AI API客户端 — OpenAI兼容接口的SDK初始化
 *
 * 【后端】仅在LLM服务层使用
 *
 * 导出函数：
 * - getAIChatApi() — 获取OpenAI SDK实例（使用环境变量LLM_BASE_URL/LLM_API_KEY/LLM_MODEL配置）
 *
 * 引用方：
 * - service/chat/llmService.ts — LLM流式调用
 * - service/chat/autoRelatedPapers.ts — 关键词提取LLM调用
 * - service/chat/llm/streamProcessor.ts — 流处理LLM调用
 */
import OpenAI from "openai";

type ChatProps = {
  key?: string;
  baseUrl?: string;
};

export const getAIChatApi = async (
  props?: ChatProps,
  timeout = 30 * 1000,
  defaultHeaders = {}
) => {
  const apiKey = props?.key || process.env.LLM_API_KEY;
  const url = props?.baseUrl || process.env.LLM_API_URL;

  return new OpenAI({
    baseURL: url,
    apiKey,
    timeout,
    maxRetries: 2,
    ...defaultHeaders,
  });
};
