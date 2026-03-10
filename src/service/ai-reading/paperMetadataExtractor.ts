/**
 * 论文元数据 AI 提取服务
 *
 * 使用 AI 大模型从论文内容中提取标题、作者、摘要、关键词等元数据
 */

import { getAIChatApi } from "@/lib/ai/client";
import logger from "@/helper/logger";

/**
 * 论文元数据
 */
export interface PaperMetadataAI {
  title: string | null;
  authors: string[] | null;
  abstract: string | null;
  keywords: string[] | null;
  publication_year: number | null;
  source: string | null; // 期刊/出版物名称
}

/**
 * AI 提取响应结构
 */
interface AIMetadataResponse {
  title: string | null;
  authors: string[] | null;
  abstract: string | null;
  keywords: string[] | null;
  publication_year: number | null;
  source: string | null;
}

/**
 * 使用 AI 大模型从论文内容中提取元数据
 *
 * @param content 论文文本内容
 * @param fileName 文件名（作为辅助信息）
 * @returns 提取的元数据
 */
export async function extractPaperMetadataWithAI(
  content: string,
  fileName: string
): Promise<PaperMetadataAI> {
  // 默认结果
  const defaultResult: PaperMetadataAI = {
    title: null,
    authors: null,
    abstract: null,
    keywords: null,
    publication_year: null,
    source: null,
  };

  if (!content || content.trim().length === 0) {
    logger.warn("论文内容为空，无法提取元数据");
    return defaultResult;
  }

  // 截取论文前部分内容（元数据通常在开头）
  // 限制在 3000 字符以内，避免 token 消耗过多
  const contentForExtraction = content.substring(0, 3000);

  // 构建 prompt
  const systemPrompt = `你是一个专业的学术论文元数据提取助手。请从给定的论文内容中准确提取以下信息：

1. **title** (标题): 论文的完整标题，通常在文档开头，字体较大或位置突出
2. **authors** (作者): 作者姓名列表，可能出现在标题下方或文末，格式可能是"作者：xxx"、"文_xxx"、"Author: xxx"等
3. **abstract** (摘要): 论文摘要内容，通常在"摘要"、"Abstract"等关键词后面
4. **keywords** (关键词): 关键词列表，通常在"关键词"、"Keywords"等关键词后面
5. **publication_year** (发表年份): 论文发表的年份，可能出现在日期、版权信息等位置
6. **source** (来源): 期刊名、出版物名称或来源

**注意事项**:
- 如果某项信息无法从内容中提取，返回 null
- 标题不要与栏目名、页码等混淆
- 作者姓名应该是人名，不是机构名
- 摘要应该是完整的摘要内容，不是正文
- 关键词应该是独立的词或短语

请以 JSON 格式返回结果，格式如下：
{
  "title": "论文标题或null",
  "authors": ["作者1", "作者2"] 或 null,
  "abstract": "摘要内容或null",
  "keywords": ["关键词1", "关键词2"] 或 null,
  "publication_year": 2025 或 null,
  "source": "期刊名或null"
}

只返回 JSON，不要有其他文字。`;

  const userPrompt = `文件名: ${fileName}

论文内容:
${contentForExtraction}`;

  try {
    const openai = await getAIChatApi();

    const response = await openai.chat.completions.create({
      model: process.env.LLM_MODEL!,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1, // 低温度确保稳定输出
      max_tokens: 1000,
    });

    const responseContent = response.choices[0]?.message?.content?.trim();

    if (!responseContent) {
      logger.warn("AI 返回内容为空", { fileName });
      return defaultResult;
    }

    // 解析 JSON 响应
    // 处理可能的 markdown 代码块包裹
    let jsonStr = responseContent;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const aiResult: AIMetadataResponse = JSON.parse(jsonStr);

    // 验证和清理结果
    const result: PaperMetadataAI = {
      title: validateString(aiResult.title),
      authors: validateStringArray(aiResult.authors),
      abstract: validateString(aiResult.abstract),
      keywords: validateStringArray(aiResult.keywords),
      publication_year: validateYear(aiResult.publication_year),
      source: validateString(aiResult.source),
    };

    logger.info("AI 元数据提取成功", {
      fileName,
      hasTitle: !!result.title,
      hasAuthors: !!(result.authors && result.authors.length > 0),
      hasAbstract: !!result.abstract,
      hasKeywords: !!(result.keywords && result.keywords.length > 0),
      hasYear: !!result.publication_year,
      hasSource: !!result.source,
      tokens: {
        input: response.usage?.prompt_tokens,
        output: response.usage?.completion_tokens,
      },
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("AI 元数据提取失败", {
      fileName,
      error: errorMessage,
    });
    return defaultResult;
  }
}

/**
 * 验证字符串
 */
function validateString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

/**
 * 验证字符串数组
 */
function validateStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const filtered = value
      .filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
      .map((item) => item.trim());
    return filtered.length > 0 ? filtered : null;
  }
  return null;
}

/**
 * 验证年份
 */
function validateYear(value: unknown): number | null {
  if (
    typeof value === "number" &&
    value >= 1900 &&
    value <= new Date().getFullYear() + 1
  ) {
    return value;
  }
  if (typeof value === "string") {
    const year = parseInt(value, 10);
    if (!isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1) {
      return year;
    }
  }
  return null;
}
