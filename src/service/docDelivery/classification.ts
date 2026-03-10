/**
 * 文献分类服务
 *
 * 使用 AI 大模型根据论文标题、关键词、摘要等信息自动判断学科类别、文章类型和语言
 */

import {
  SubjectCategory,
  ArticleType,
  SUBJECT_CATEGORIES,
  ARTICLE_TYPES,
  DEFAULT_SUBJECT_CATEGORY,
  DEFAULT_ARTICLE_TYPE,
} from "@/constants/docDelivery";
import { getAIChatApi } from "@/lib/ai/client";
import logger from "@/helper/logger";

/**
 * 论文信息用于分类的输入参数
 */
export interface PaperClassificationInput {
  title: string; // 论文标题（必填）
  abstract?: string | null; // 摘要
  keywords?: string[] | null; // 关键词
  publication_name?: string | null; // 期刊/出版物名称
  publication_type?: string | null; // 出版物类型
  issn?: string | null; // ISSN
  isbn?: string | null; // ISBN
  subjects?: string | null; // 主题词
  language?: string | null; // 已知语言（如果有）
}

/**
 * 分类结果
 */
export interface ClassificationResult {
  subject_category: SubjectCategory; // 学科类别
  article_type: ArticleType; // 文章类型
  language: string; // 语言
  confidence: {
    subject: number; // 学科分类置信度 (0-1)
    article: number; // 文章类型置信度 (0-1)
  };
  reason?: string; // AI 分类理由
}

/**
 * AI 分类响应结构
 */
interface AIClassificationResponse {
  subject_category: string;
  article_type: string;
  language: string;
  subject_confidence: number;
  article_confidence: number;
  reason: string;
}

/**
 * 使用 AI 大模型对论文进行分类
 *
 * @param input 论文信息
 * @returns 分类结果
 */
export async function classifyPaper(
  input: PaperClassificationInput
): Promise<ClassificationResult> {
  const {
    title,
    abstract,
    keywords,
    publication_name,
    publication_type,
    issn,
    isbn,
    subjects,
    language,
  } = input;

  // 构建论文信息描述
  const paperInfo = [
    `标题: ${title}`,
    abstract
      ? `摘要: ${abstract.substring(0, 500)}${
          abstract.length > 500 ? "..." : ""
        }`
      : null,
    keywords?.length ? `关键词: ${keywords.join(", ")}` : null,
    publication_name ? `期刊/出版物: ${publication_name}` : null,
    publication_type ? `出版物类型: ${publication_type}` : null,
    subjects ? `主题词: ${subjects}` : null,
    issn ? `ISSN: ${issn}` : null,
    isbn ? `ISBN: ${isbn}` : null,
    language ? `已知语言: ${language}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  // 构建学科类别选项列表
  const subjectOptions = SUBJECT_CATEGORIES.map((c) => c.value).join("、");
  // 构建文章类型选项列表
  const articleOptions = ARTICLE_TYPES.map((t) => t.value).join("、");

  try {
    const openai = await getAIChatApi();

    const systemPrompt = `你是一个专业的学术文献分类专家。你的任务是根据论文信息判断其学科类别、文章类型和语言。

可选的学科类别（必须从以下选项中选择一个）：
${subjectOptions}

可选的文章类型（必须从以下选项中选择一个）：
${articleOptions}

分类规则：
1. 学科类别：根据论文的标题、摘要、关键词判断所属学科领域
2. 文章类型：
   - 如果有 ISBN，通常是"图书"
   - 如果有 ISSN 或出版物是期刊，通常是"期刊"
   - 如果涉及发明、专利申请，是"专利"
   - 默认为"期刊"（学术论文最常见的类型）
3. 语言：根据标题和摘要的文字判断语言，返回 "zh"（中文）或 "en"（英文）

直接返回 JSON 对象，不要使用 markdown 代码块：
{
  "subject_category": "选择的学科类别",
  "article_type": "选择的文章类型",
  "language": "zh或en",
  "subject_confidence": 0.85,
  "article_confidence": 0.95,
  "reason": "简要说明分类理由"
}`;

    const response = await openai.chat.completions.create({
      model: process.env.LLM_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `请对以下论文进行分类：\n\n${paperInfo}` },
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

    const result: AIClassificationResponse = JSON.parse(content);

    // 验证学科类别是否在有效范围内
    const validSubject = SUBJECT_CATEGORIES.find(
      (c) => c.value === result.subject_category
    );
    const subjectCategory: SubjectCategory = validSubject
      ? (result.subject_category as SubjectCategory)
      : DEFAULT_SUBJECT_CATEGORY;

    // 验证文章类型是否在有效范围内
    const validArticle = ARTICLE_TYPES.find(
      (t) => t.value === result.article_type
    );
    const articleType: ArticleType = validArticle
      ? (result.article_type as ArticleType)
      : DEFAULT_ARTICLE_TYPE;

    // 验证语言
    const detectedLanguage =
      result.language === "zh" || result.language === "en"
        ? result.language
        : detectLanguage(title);

    logger.info("AI 论文分类完成", {
      title: title.substring(0, 50),
      subjectCategory,
      articleType,
      language: detectedLanguage,
      subjectConfidence: result.subject_confidence,
      articleConfidence: result.article_confidence,
      reason: result.reason,
    });

    return {
      subject_category: subjectCategory,
      article_type: articleType,
      language: detectedLanguage,
      confidence: {
        subject: result.subject_confidence || 0.8,
        article: result.article_confidence || 0.9,
      },
      reason: result.reason,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("AI 论文分类失败，使用降级策略", {
      error: errorMessage,
      title: title.substring(0, 50),
    });

    // 降级处理：使用简单规则判断
    return fallbackClassification(input);
  }
}

/**
 * 简单语言检测（根据是否包含中文字符）
 */
function detectLanguage(text: string): string {
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? "zh" : "en";
}

/**
 * 降级分类策略（当 AI 服务不可用时使用）
 *
 * @param input 论文信息
 * @returns 分类结果
 */
function fallbackClassification(
  input: PaperClassificationInput
): ClassificationResult {
  const { title, isbn, issn, publication_type, language } = input;

  // 文章类型判断
  let articleType: ArticleType = DEFAULT_ARTICLE_TYPE;
  let articleConfidence = 0.5;

  if (isbn) {
    articleType = "图书";
    articleConfidence = 0.9;
  } else if (issn) {
    articleType = "期刊";
    articleConfidence = 0.9;
  } else if (publication_type) {
    const typeStr = publication_type.toLowerCase();
    if (typeStr.includes("book") || typeStr.includes("monograph")) {
      articleType = "图书";
      articleConfidence = 0.8;
    } else if (typeStr.includes("patent")) {
      articleType = "专利";
      articleConfidence = 0.9;
    }
  }

  // 学科类别：降级时默认返回"其他"
  const subjectCategory: SubjectCategory = DEFAULT_SUBJECT_CATEGORY;
  const subjectConfidence = 0.3;

  // 语言检测
  const detectedLanguage = language || detectLanguage(title);

  logger.warn("使用降级分类策略", {
    title: title.substring(0, 50),
    subjectCategory,
    articleType,
    language: detectedLanguage,
  });

  return {
    subject_category: subjectCategory,
    article_type: articleType,
    language: detectedLanguage,
    confidence: {
      subject: subjectConfidence,
      article: articleConfidence,
    },
    reason: "AI 服务不可用，使用规则匹配",
  };
}
