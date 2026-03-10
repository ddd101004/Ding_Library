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
 * AI生成问题列表 API
 * POST /api/ai/questions
 *
 * @requires Authentication - 需要用户登录
 * @param keyword - 主题关键词（可选）
 *                  - 快问快答模式：可以为空，系统会随机选择关键词生成5个问题
 *                  - 其他模式：必须传入关键词，支持多个关键词用、隔开
 * @param count - 生成问题数量（默认5，最大10）
 * @returns 问题列表
 */

// 内置的随机关键词列表（用于快问快答模式）
const RANDOM_KEYWORDS = [
  "人工智能",
  "机器学习",
  "深度学习",
  "自然语言处理",
  "计算机视觉",
  "大数据",
  "云计算",
  "区块链",
  "量子计算",
  "物联网",
  "5G技术",
  "边缘计算",
  "数据科学",
  "网络安全",
  "分布式系统",
  "微服务架构",
  "容器技术",
  "DevOps",
  "敏捷开发",
  "软件工程",
];

const handlePostQuestions = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  let { keyword, count = 5 } = req.body;

  // 如果关键词为空，随机选择一个内置关键词（快问快答模式）
  const isQuickMode = !keyword || keyword.trim() === "";
  if (isQuickMode) {
    const randomIndex = Math.floor(Math.random() * RANDOM_KEYWORDS.length);
    keyword = RANDOM_KEYWORDS[randomIndex];
  } else {
    // 校验关键词
    const keywordResult = validateString(keyword, "关键词", { limitKey: "keyword" });
    if (!keywordResult.valid) {
      return sendWarnningResponse(res, keywordResult.error || "关键词校验失败");
    }
    keyword = keyword.trim();
  }

  const questionCount = Math.min(10, Math.max(1, Number(count)));

  try {
    // 处理多个关键词的情况（用、分隔）
    const keywords = keyword.split("、").map((k: string) => k.trim());
    const isMultipleKeywords = keywords.length > 1;

    // 构建提示词
    const prompt = `你是一个专业的知识导师。请根据主题关键词"${
      isMultipleKeywords ? keywords.join("、") : keyword
    }"，生成${questionCount}个有启发性的问题，帮助不了解这个关键词的用户简单理解这个主题。

要求：
1. 问题应该涵盖不同角度：基础概念、应用场景、对比分析、前沿趋势等
2. 问题应该具体明确，避免过于宽泛
3. 问题长度适中，10-30个字为佳
4. 问题应该可以带领该领域的新人快速了解这个行业
5. 问题应该可以吸引行业新人，找到新人最可能对该领域感兴趣的问题
6. 直接返回问题列表，每行一个问题，不要编号，不要额外解释

示例（如果主题是"深度学习"）：
什么是深度学习？它有什么用？
深度学习是怎么发挥效果的？
深度学习一般在哪些场景下应用？
深度学习是被谁提出的？
深度学习的发展历史是什么样的？
深度学习有什么样的问题？是怎么解决的？`;

    // 调用 AI API
    const result = await callAI({
      user_id: userId,
      messages: [
        {
          role: "system",
          content: "你是一个专业的知识导师，擅长提出有启发性的问题。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      type: isQuickMode ? "ai_questions_quick" : "ai_questions",
      input_content: keyword,
      temperature: 0.8,
    });

    // 解析返回的问题列表
    const questions = result.content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.length <= 200) // 只过滤空行和过长的行
      .slice(0, questionCount);

    if (questions.length === 0) {
      return sendWarnningResponse(res, "未能生成有效的问题");
    }

    return sendSuccessResponse(res, "生成成功", {
      keyword,
      is_quick_mode: isQuickMode,
      count: questions.length,
      questions,
    });
  } catch (error: unknown) {
    console.error("生成问题失败:", error);
    throw new Error("AI服务暂时不可用，请稍后再试");
  }
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePostQuestions(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "AI问题生成" }),
    {
      monitorType: "external_api",
      apiProvider: "openai",
      operationName: "generateQuestions",
      extractMetadata: (req) => ({
        keyword: req.body.keyword || "random",
        isQuickMode: !req.body.keyword || req.body.keyword.trim() === "",
        count: req.body.count || 5,
      }),
      extractResultCount: (data) => data?.questions?.length || 0,
      successMetric: "ai_questions_success",
      failureMetric: "ai_questions_failed",
    }
  )
);
