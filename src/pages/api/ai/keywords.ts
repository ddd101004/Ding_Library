import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { callAI } from "@/service/chat/llmService";
import { validateString } from "@/utils/validateString";

/**
 * AI生成关键词列表 API
 * POST /api/ai/keywords
 *
 * @requires Authentication - 需要用户登录
 * @param keyword - 主题关键词
 * @param count - 生成关键词数量（默认10，最大20）
 * @returns 关键词列表
 */

const handlePostKeywords = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { keyword, count = 10 } = req.body;

  // 参数验证
  const keywordResult = validateString(keyword, "关键词", { limitKey: "keyword" });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "关键词校验失败");
  }

  const keywordCount = Math.min(20, Math.max(1, Number(count)));

  try {
    // 构建提示词
    const prompt = `你是一个专业的知识图谱专家。请根据主题关键词"${keyword}"，生成${keywordCount}个相关的子关键词或相关主题。

要求：
1. 关键词应该与主题密切相关，涵盖不同维度，并且具有代表性，可以是该主题的特殊工作方法，也可以是独属于该主题的名词
2. 关键词应该简洁明了，3-8个字为佳
3. 避免重复或过于相似的关键词
4. 按相关性从高到低排序
5. 直接返回关键词列表，每行一个，不要编号，不要额外解释

示例（如果主题是"深度学习"）：
多模态学习
Transformer架构
神经网络优化
迁移学习
强化学习
生成对抗网络
注意力机制
模型压缩`;

    // 调用 AI API
    const result = await callAI({
      user_id: userId,
      messages: [
        {
          role: "system",
          content: "你是一个专业的知识图谱专家，擅长提炼和组织相关概念。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      type: "ai_keywords",
      input_content: keyword,
      temperature: 0.7,
    });

    // 解析返回的关键词列表
    const keywords = result.content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.length <= 50)
      .slice(0, keywordCount);

    if (keywords.length === 0) {
      return sendWarnningResponse(res, "未能生成有效的关键词");
    }

    return sendSuccessResponse(res, "生成成功", {
      keyword,
      count: keywords.length,
      keywords,
    });
  } catch (error: unknown) {
    console.error("生成关键词失败:", error);
    throw new Error("AI服务暂时不可用，请稍后再试");
  }
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePostKeywords(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "AI关键词生成" }),
    {
      monitorType: "external_api",
      apiProvider: "openai",
      operationName: "generateKeywords",
      extractMetadata: (req) => ({
        keyword: req.body.keyword,
        count: req.body.count || 10,
      }),
      extractResultCount: (data) => data?.keywords?.length || 0,
      successMetric: "ai_keywords_success",
      failureMetric: "ai_keywords_failed",
    }
  )
);
