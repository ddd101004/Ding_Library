/**
 * 自动相关论文检索服务
 *
 * 用于在AI对话中自动检索相关论文：
 * 1. 使用 LLM 从用户问题中提取中文关键词
 * 2. 调用万方 API 检索相关论文
 * 3. 将论文存入 Paper 表（upsert）
 * 4. 创建 MessageCitation 关联
 */

import logger from "@/helper/logger";
import { getAIChatApi } from "@/lib/ai/client";
import { searchWanfangPapers } from "@/service/wanfang/paper";
import { upsertWanfangPaper } from "@/db/wanfang/paper";
import {
  createAutoRelatedCitations,
  getUniqueAutoRelatedPapersByConversation,
} from "@/db/messageCitation";
import type { WanfangPaperResult } from "@/service/wanfang/paper";

// ==================== 类型定义 ====================

/**
 * 关键词提取结果
 */
export interface KeywordExtractionResult {
  keywords: string[]; // 提取的关键词列表
  searchQuery: string; // 组合后的搜索查询
  confidence: number; // 置信度 (0-1)
  shouldSearch: boolean; // 是否需要检索论文
  reason?: string; // 不需要检索的原因
}

/**
 * 自动检索结果
 */
export interface AutoRelatedPapersResult {
  success: boolean;
  keywords: string[];
  searchQuery: string;
  papers: RelatedPaper[];
  totalFound: number;
  message?: string;
}

/**
 * 相关论文信息
 */
export interface RelatedPaper {
  id: string; // Paper 表的 ID
  source: string;
  source_id: string;
  title: string;
  authors?: { name: string }[];
  publication_name?: string;
  publication_year?: number;
  abstract?: string;
  doi?: string;
  relevance_score?: number;
}

// ==================== 关键词提取 ====================

/**
 * 使用 LLM 从用户问题中提取学术关键词
 *
 * @param userQuestion 用户的问题
 * @returns 关键词提取结果
 */
export async function extractKeywordsFromQuestion(
  userQuestion: string
): Promise<KeywordExtractionResult> {
  try {
    const openai = await getAIChatApi();

    const systemPrompt = `你是一个学术关键词提取专家。你的任务是从用户的问题中提取适合用于学术论文检索的关键词。

规则：
1. 提取2-5个最相关的学术关键词或短语
2. 关键词应该是专业术语、研究领域、方法论或具体概念
3. 使用中文关键词
4. 如果用户问题是英文，请翻译成对应的中文学术术语
5. 如果问题是闲聊、问候或与学术研究无关的内容，返回空关键词列表
6. 如果问题本身就是一个关键词，那就用这个关键词作为搜索查询

判断是否需要检索论文：
- 需要检索：涉及学术概念、研究问题、技术方法、理论探讨
- 不需要检索：日常问候、闲聊、个人问题、与学术无关的请求

直接返回JSON对象，不要使用markdown代码块：
{"keywords": ["keyword1", "keyword2"], "searchQuery": "combined search query", "confidence": 0.8, "shouldSearch": true, "reason": "可选，不需要检索时说明原因"}`;

    const response = await openai.chat.completions.create({
      model: process.env.LLM_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuestion },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    let content = response.choices[0]?.message?.content || "{}";

    // 清理可能的 markdown 代码块格式
    content = content.trim();
    if (content.startsWith("```json")) {
      content = content.slice(7);
    } else if (content.startsWith("```")) {
      content = content.slice(3);
    }
    if (content.endsWith("```")) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    const result = JSON.parse(content);

    logger.info("关键词提取完成", {
      userQuestion: userQuestion.substring(0, 100),
      keywords: result.keywords,
      shouldSearch: result.shouldSearch,
      confidence: result.confidence,
    });

    return {
      keywords: result.keywords || [],
      searchQuery: result.searchQuery || result.keywords?.join(" ") || "",
      confidence: result.confidence || 0.5,
      shouldSearch: result.shouldSearch !== false,
      reason: result.reason,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("关键词提取失败", { error: errorMessage, userQuestion });

    // 降级处理：简单分词
    const words = userQuestion
      .replace(/[^\w\s\u4e00-\u9fa5]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

    return {
      keywords: words.slice(0, 3),
      searchQuery: words.slice(0, 3).join(" "),
      confidence: 0.3,
      shouldSearch: words.length > 0,
      reason: "LLM 提取失败，使用简单分词",
    };
  }
}

// ==================== 万方论文检索 ====================

/**
 * 带重试的万方搜索
 * 网络不稳定时自动重试
 */
async function searchWithRetry(
  query: string,
  maxResults: number,
  maxRetries: number = 2
): Promise<WanfangPaperResult[] | null> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const results = await searchWanfangPapers({
        keyword: query,
        page: 1,
        size: maxResults,
        search_type: "all",
      });
      return results;
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message;
      const isNetworkError =
        errorMessage.includes("fetch failed") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("ENOTFOUND") ||
        (error instanceof Error && error.name === "AbortError");

      if (isNetworkError && attempt < maxRetries) {
        // 网络错误时等待后重试
        const delay = attempt * 1000; // 1秒, 2秒...
        logger.warn(`万方 API 网络错误，${delay}ms 后重试`, {
          attempt,
          maxRetries,
          error: errorMessage,
        });
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // 非网络错误或已达最大重试次数
        break;
      }
    }
  }

  logger.error("万方搜索最终失败", {
    error: lastError?.message,
    maxRetries,
  });
  return null;
}

// ==================== 主要服务函数 ====================

/**
 * 自动检索相关论文
 *
 * 完整流程：
 * 1. 从用户问题提取关键词
 * 2. 调用万方 API 检索（带重试机制）
 * 3. 存入 Paper 表
 * 4. 创建 MessageCitation 关联
 *
 * @param params 参数
 * @returns 检索结果
 */
export async function autoSearchRelatedPapers(params: {
  userQuestion: string;
  messageId: string;
  conversationId: string;
  maxResults?: number;
}): Promise<AutoRelatedPapersResult> {
  const { userQuestion, messageId, conversationId, maxResults = 5 } = params;

  try {
    // 1. 提取关键词
    const keywordResult = await extractKeywordsFromQuestion(userQuestion);

    if (!keywordResult.shouldSearch || keywordResult.keywords.length === 0) {
      logger.info("无需检索论文", {
        reason: keywordResult.reason,
        conversationId,
      });
      return {
        success: true,
        keywords: [],
        searchQuery: "",
        papers: [],
        totalFound: 0,
        message: keywordResult.reason || "问题不涉及学术内容",
      };
    }

    // 2. 调用万方检索（带重试机制）
    logger.info("开始万方检索", {
      searchQuery: keywordResult.searchQuery,
      conversationId,
    });

    const searchResults = await searchWithRetry(
      keywordResult.searchQuery,
      maxResults,
      2 // 最多重试2次
    );

    // 网络错误时静默失败，不影响主流程
    if (!searchResults) {
      logger.warn("万方检索失败（网络问题），跳过论文检索", {
        searchQuery: keywordResult.searchQuery,
        conversationId,
      });
      return {
        success: false,
        keywords: keywordResult.keywords,
        searchQuery: keywordResult.searchQuery,
        papers: [],
        totalFound: 0,
        message: "论文检索服务暂时不可用",
      };
    }

    if (searchResults.length === 0) {
      logger.info("万方检索无结果", {
        searchQuery: keywordResult.searchQuery,
        conversationId,
      });
      return {
        success: true,
        keywords: keywordResult.keywords,
        searchQuery: keywordResult.searchQuery,
        papers: [],
        totalFound: 0,
        message: "未找到相关论文",
      };
    }

    // 从第一条结果中获取总数
    const totalHits = searchResults[0]?.total || 0;

    // 3. 入库并构建结果
    const papers: RelatedPaper[] = [];
    const paperIds: string[] = [];
    const relevanceScores: Record<string, number> = {};

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];

      if (!result.id) continue;

      // Upsert 到 Paper 表
      const paper = await upsertWanfangPaper(result);

      // 计算相关度分数（基于排序位置）
      const score = 1 - i * 0.1; // 第1个0.9，第2个0.8...

      papers.push({
        id: paper.id,
        source: "wanfang",
        source_id: result.id,
        title: result.title || paper.title,
        authors: paper.authors as { name: string }[] | undefined,
        publication_name: paper.publication_name || undefined,
        publication_year: paper.publication_year || undefined,
        abstract: paper.abstract || undefined,
        doi: paper.doi || undefined,
        relevance_score: score,
      });

      paperIds.push(paper.id);
      relevanceScores[paper.id] = score;
    }

    // 4. 创建 MessageCitation 关联
    if (paperIds.length > 0) {
      await createAutoRelatedCitations({
        message_id: messageId,
        conversation_id: conversationId,
        paper_ids: paperIds,
        search_keywords: keywordResult.searchQuery,
        relevance_scores: relevanceScores,
      });
    }

    logger.info("自动论文检索完成", {
      conversationId,
      messageId,
      keywords: keywordResult.keywords,
      foundCount: papers.length,
      totalHits,
    });

    return {
      success: true,
      keywords: keywordResult.keywords,
      searchQuery: keywordResult.searchQuery,
      papers,
      totalFound: totalHits,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("自动论文检索失败", {
      error: errorMessage,
      conversationId,
      messageId,
      userQuestion: userQuestion.substring(0, 100),
    });

    return {
      success: false,
      keywords: [],
      searchQuery: "",
      papers: [],
      totalFound: 0,
      message: `检索失败: ${errorMessage}`,
    };
  }
}

/**
 * 获取对话的所有相关论文（去重）
 *
 * @param conversationId 对话ID
 * @returns 论文列表
 */
export async function getConversationRelatedPapers(conversationId: string) {
  try {
    const papers = await getUniqueAutoRelatedPapersByConversation(
      conversationId
    );

    logger.info("获取对话相关论文", {
      conversationId,
      count: papers.length,
    });

    return papers;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("获取对话相关论文失败", {
      error: errorMessage,
      conversationId,
    });
    return [];
  }
}
