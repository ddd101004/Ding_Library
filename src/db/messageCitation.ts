import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

// ==================== 类型定义 ====================

/**
 * 引用类型
 * - user_cited: 用户主动引用的论文
 * - auto_related: AI对话中自动检索的相关论文
 */
export type CitationType = "user_cited" | "auto_related";

/**
 * 创建引用的参数
 */
export interface CreateCitationParams {
  message_id: string;
  paper_id: string;
  conversation_id?: string;
  citation_type?: CitationType;
  citation_order: number;
  citation_format?: string;
  formatted_text?: string;
  search_keywords?: string;
  relevance_score?: number;
}

/**
 * 批量创建自动检索引用的参数
 */
export interface CreateAutoRelatedCitationsParams {
  message_id: string;
  conversation_id: string;
  paper_ids: string[];
  search_keywords: string;
  relevance_scores?: Record<string, number>; // paper_id -> score
}

// ==================== 创建操作 ====================

/**
 * 添加论文引用到消息
 */
export const createCitation = async (data: CreateCitationParams) => {
  try {
    const citation = await prisma.messageCitation.create({
      data: {
        message_id: data.message_id,
        paper_id: data.paper_id,
        conversation_id: data.conversation_id,
        citation_type: data.citation_type || "user_cited",
        citation_order: data.citation_order,
        citation_format: data.citation_format || "APA",
        formatted_text: data.formatted_text,
        search_keywords: data.search_keywords,
        relevance_score: data.relevance_score
          ? new Prisma.Decimal(data.relevance_score)
          : null,
      },
    });
    logger.info("创建引用成功", {
      citationId: citation.citation_id,
      messageId: data.message_id,
      paperId: data.paper_id,
      citationType: data.citation_type,
    });
    return citation;
  } catch (error: any) {
    logger.error(`创建引用失败: ${error?.message}`, { error, data });
    return null;
  }
};

/**
 * 批量创建用户引用
 * 使用 createMany 优化批量插入性能
 */
export const createBatchCitations = async (
  message_id: string,
  paper_ids: string[],
  conversation_id?: string
) => {
  try {
    if (!paper_ids || paper_ids.length === 0) return [];

    // 使用 createMany 批量插入
    await prisma.messageCitation.createMany({
      data: paper_ids.map((paper_id, index) => ({
        message_id,
        paper_id,
        conversation_id,
        citation_type: "user_cited",
        citation_order: index + 1,
        citation_format: "APA",
      })),
      skipDuplicates: true,
    });

    // 返回创建的记录
    const citations = await prisma.messageCitation.findMany({
      where: { message_id },
      orderBy: { citation_order: "asc" },
    });

    logger.info("批量创建用户引用成功", {
      messageId: message_id,
      count: citations.length,
    });

    return citations;
  } catch (error: any) {
    logger.error(`批量创建引用失败: ${error?.message}`, { error });
    return [];
  }
};

/**
 * 批量创建自动检索的相关论文引用
 * 用于AI对话中自动检索的论文
 */
export const createAutoRelatedCitations = async (
  params: CreateAutoRelatedCitationsParams
) => {
  const { message_id, conversation_id, paper_ids, search_keywords, relevance_scores } =
    params;

  try {
    if (!paper_ids || paper_ids.length === 0) return [];

    // 使用 createMany 批量插入
    await prisma.messageCitation.createMany({
      data: paper_ids.map((paper_id, index) => ({
        message_id,
        paper_id,
        conversation_id,
        citation_type: "auto_related",
        citation_order: index + 1,
        search_keywords,
        relevance_score: relevance_scores?.[paper_id]
          ? new Prisma.Decimal(relevance_scores[paper_id])
          : null,
      })),
      skipDuplicates: true,
    });

    // 返回创建的记录（包含论文信息）
    const citations = await prisma.messageCitation.findMany({
      where: {
        message_id,
        citation_type: "auto_related",
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            publication_name: true,
            publication_year: true,
            doi: true,
            abstract: true,
          },
        },
      },
      orderBy: { citation_order: "asc" },
    });

    logger.info("批量创建自动检索引用成功", {
      messageId: message_id,
      conversationId: conversation_id,
      count: citations.length,
      keywords: search_keywords,
    });

    return citations;
  } catch (error: any) {
    logger.error(`批量创建自动检索引用失败: ${error?.message}`, { error, params });
    return [];
  }
};

// ==================== 查询操作 ====================

/**
 * 获取消息的所有引用
 */
export const getCitationsByMessageId = async (message_id: string) => {
  try {
    const citations = await prisma.messageCitation.findMany({
      where: { message_id },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            publication_name: true,
            publication_year: true,
            doi: true,
          },
        },
      },
      orderBy: { citation_order: "asc" },
    });
    return citations;
  } catch (error: any) {
    logger.error(`获取消息引用失败: ${error?.message}`, { error });
    return [];
  }
};

/**
 * 根据引用ID获取引用详情（包含消息的会话ID）
 */
export const getCitationById = async (citation_id: string) => {
  try {
    const citation = await prisma.messageCitation.findUnique({
      where: { citation_id },
      include: {
        message: {
          select: {
            conversation_id: true,
          },
        },
        paper: true,
      },
    });
    return citation;
  } catch (error: any) {
    logger.error(`获取引用详情失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 获取对话的所有引用（按类型筛选）
 * 用于获取对话中所有自动检索的相关论文
 */
export const getCitationsByConversationId = async (
  conversation_id: string,
  citation_type?: CitationType
) => {
  try {
    const where: Prisma.MessageCitationWhereInput = {
      conversation_id,
    };

    if (citation_type) {
      where.citation_type = citation_type;
    }

    const citations = await prisma.messageCitation.findMany({
      where,
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            publication_name: true,
            publication_year: true,
            doi: true,
            abstract: true,
            source: true,
            source_id: true,
          },
        },
        message: {
          select: {
            message_id: true,
            role: true,
            create_time: true,
          },
        },
      },
      orderBy: [{ create_time: "desc" }, { citation_order: "asc" }],
    });

    return citations;
  } catch (error: any) {
    logger.error(`获取对话引用失败: ${error?.message}`, { error });
    return [];
  }
};

/**
 * 获取对话的所有自动检索相关论文（去重）
 * 返回不重复的论文列表，按最新检索时间排序
 */
export const getUniqueAutoRelatedPapersByConversation = async (
  conversation_id: string
) => {
  try {
    // 获取所有自动检索的引用
    const citations = await prisma.messageCitation.findMany({
      where: {
        conversation_id,
        citation_type: "auto_related",
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            publication_name: true,
            publication_year: true,
            doi: true,
            abstract: true,
            source: true,
            source_id: true,
          },
        },
      },
      orderBy: { create_time: "desc" },
    });

    // 按 paper_id 去重，保留最新的
    const uniquePapersMap = new Map<string, typeof citations[0]["paper"]>();
    const keywordsMap = new Map<string, string[]>();

    for (const citation of citations) {
      if (!uniquePapersMap.has(citation.paper_id)) {
        uniquePapersMap.set(citation.paper_id, citation.paper);
      }
      // 收集所有搜索关键词
      if (citation.search_keywords) {
        const keywords = keywordsMap.get(citation.paper_id) || [];
        if (!keywords.includes(citation.search_keywords)) {
          keywords.push(citation.search_keywords);
        }
        keywordsMap.set(citation.paper_id, keywords);
      }
    }

    // 返回论文列表，附带搜索关键词
    return Array.from(uniquePapersMap.entries()).map(([paperId, paper]) => ({
      ...paper,
      search_keywords: keywordsMap.get(paperId) || [],
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取对话唯一论文列表失败: ${errorMessage}`, { error });
    return [];
  }
};

/**
 * 论文信息（简化版，用于 API 返回）
 */
export interface RelatedPaperInfo {
  index: number;
  id: string;
  title: string;
  authors: Prisma.JsonValue;
  publication_name: string | null;
  source: string;
  source_id: string;
}

/**
 * 按消息分组的论文数据
 */
export interface MessagePapersGroup {
  message_id: string;
  papers: RelatedPaperInfo[];
}

/**
 * 获取对话的自动检索论文（按消息分组）
 * 使用数据库中存储的 citation_order 作为 index，与 AI 消息中的引用标注 [1], [2], [3] 对应
 */
export const getAutoRelatedPapersGroupedByMessage = async (
  conversation_id: string
): Promise<MessagePapersGroup[]> => {
  try {
    // 获取所有自动检索的引用，按消息时间和引用顺序排序
    const citations = await prisma.messageCitation.findMany({
      where: {
        conversation_id,
        citation_type: "auto_related",
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            publication_name: true,
            source: true,
            source_id: true,
          },
        },
        message: {
          select: {
            message_id: true,
            message_order: true,
          },
        },
      },
      orderBy: [
        { message: { message_order: "asc" } },
        { citation_order: "asc" },
      ],
    });

    // 按 message_id 分组
    const messageGroups = new Map<string, typeof citations>();

    for (const citation of citations) {
      const messageId = citation.message_id;
      if (!messageGroups.has(messageId)) {
        messageGroups.set(messageId, []);
      }
      messageGroups.get(messageId)!.push(citation);
    }

    // 转换为返回格式，使用数据库中存储的 citation_order 作为 index
    const result: MessagePapersGroup[] = [];

    for (const [messageId, messageCitations] of messageGroups) {
      const papers: RelatedPaperInfo[] = messageCitations.map((citation) => ({
        index: citation.citation_order, // 使用数据库存储的顺序，与消息中的引用标注对应
        id: citation.paper.id,
        title: citation.paper.title,
        authors: citation.paper.authors,
        publication_name: citation.paper.publication_name,
        source: citation.paper.source,
        source_id: citation.paper.source_id,
      }));

      result.push({
        message_id: messageId,
        papers,
      });
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取对话分组论文列表失败: ${errorMessage}`, { error });
    return [];
  }
};

// ==================== 删除操作 ====================

/**
 * 删除引用
 */
export const deleteCitation = async (citation_id: string) => {
  try {
    const citation = await prisma.messageCitation.delete({
      where: { citation_id },
    });
    logger.info("删除引用成功", { citationId: citation_id });
    return citation;
  } catch (error: any) {
    logger.error(`删除引用失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 删除消息的所有引用
 */
export const deleteCitationsByMessageId = async (message_id: string) => {
  try {
    const result = await prisma.messageCitation.deleteMany({
      where: { message_id },
    });
    logger.info("删除消息引用成功", { messageId: message_id, count: result.count });
    return result.count;
  } catch (error: any) {
    logger.error(`删除消息引用失败: ${error?.message}`, { error });
    return 0;
  }
};

// ==================== 格式化工具 ====================

/**
 * 获取论文的格式化引用文本（APA、MLA等格式）
 */
export const formatCitation = (
  paper: {
    title: string;
    title_zh?: string | null;
    authors?: string | null;
    publication_name?: string | null;
    publication_year?: number | null;
    doi?: string | null;
    volume?: string | null;
    issue?: string | null;
    start_page?: string | null;
    page_count?: number | null;
  },
  format: string = "APA"
): string => {
  try {
    const authorsRaw = paper.authors ? JSON.parse(paper.authors) : [];

    // 处理不同格式的作者数据：字符串数组或对象数组
    const authorsArray: string[] = authorsRaw.map((author: string | { name?: string; name_zh?: string }) => {
      if (typeof author === "string") {
        return author;
      } else if (typeof author === "object" && author !== null) {
        // 优先使用中文名，其次英文名
        return author.name_zh || author.name || "";
      }
      return String(author);
    }).filter((name: string) => name.length > 0);

    const authorList =
      authorsArray.length > 0
        ? authorsArray.slice(0, 3).join(", ") +
          (authorsArray.length > 3 ? ", et al." : "")
        : "Unknown Author";

    switch (format.toUpperCase()) {
      case "APA":
        return `${authorList} (${paper.publication_year || "n.d."}). ${paper.title}. ${paper.publication_name || ""}${paper.volume ? `, ${paper.volume}` : ""}${paper.issue ? `(${paper.issue})` : ""}${paper.start_page ? `, ${paper.start_page}` : ""}. ${paper.doi ? `https://doi.org/${paper.doi}` : ""}`;

      case "MLA":
        return `${authorList}. "${paper.title}." ${paper.publication_name || ""}, ${paper.volume ? `vol. ${paper.volume}, ` : ""}${paper.issue ? `no. ${paper.issue}, ` : ""}${paper.publication_year || "n.d."}${paper.start_page ? `, pp. ${paper.start_page}` : ""}.`;

      case "CHICAGO":
        return `${authorList}. "${paper.title}." ${paper.publication_name || ""} ${paper.volume || ""}${paper.issue ? ` (${paper.issue})` : ""} (${paper.publication_year || "n.d."}): ${paper.start_page || ""}.`;

      case "GBT7714":
      case "GB/T7714":
      case "GB/T 7714-2015":
        // GB/T 7714-2015 中国国家标准格式
        // 格式：作者. 题名[J]. 期刊名, 年, 卷(期): 起-止页码.
        // 示例：[1] 王贤萍, 解明利. "一水"理念下南方多雨地区分流制污水管网提质改造思路[J]. 净水技术, 2026, X(X): XX-XX.

        // 1. 处理作者列表：使用中文顿号分隔
        const isChineseAuthors = authorsArray.some(author => /[\u4e00-\u9fa5]/.test(author));
        const authorListGBT = isChineseAuthors
          ? authorsArray.slice(0, 3).join("、") + (authorsArray.length > 3 ? "、等" : "")
          : authorsArray.slice(0, 3).join(", ") + (authorsArray.length > 3 ? ", et al." : "");

        // 2. 优先使用中文标题
        const displayTitle = paper.title_zh || paper.title;

        // 3. 计算结束页码（如果有起始页和页数）
        let pageRange = "";
        if (paper.start_page) {
          if (paper.page_count) {
            // 计算结束页码：起始页 + 页数 - 1
            const startPageNum = parseInt(paper.start_page);
            const endPageNum = startPageNum + paper.page_count - 1;
            pageRange = `: ${paper.start_page}-${endPageNum}`;
          } else {
            // 只有起始页，没有结束页
            pageRange = `: ${paper.start_page}`;
          }
        }

        // 4. 组装引用字符串
        // 格式：作者. 题名[J]. 期刊名, 年, 卷(期): 起-止页码.
        const parts = [
          authorListGBT,
          `${displayTitle}[J]`,
          paper.publication_name || "",
        ];

        // 添加年份、卷、期、页码部分
        if (paper.publication_year || paper.volume || paper.issue || pageRange) {
          const yearVolIssue = [];
          if (paper.publication_year) yearVolIssue.push(paper.publication_year);
          if (paper.volume) yearVolIssue.push(paper.volume);
          if (paper.issue) yearVolIssue.push(`(${paper.issue})`);

          if (yearVolIssue.length > 0 || pageRange) {
            parts.push(yearVolIssue.join(", ") + pageRange);
          }
        }

        return parts.join(". ") + ".";

      case "BIBTEX":
        const firstAuthor =
          authorsArray.length > 0
            ? authorsArray[0].replace(/\s+/g, "")
            : "Unknown";
        return `@article{${firstAuthor}${paper.publication_year || ""},
  author = {${authorsArray.join(" and ")}},
  title = {${paper.title}},
  journal = {${paper.publication_name || ""}},
  year = {${paper.publication_year || ""}},
  volume = {${paper.volume || ""}},
  number = {${paper.issue || ""}},
  pages = {${paper.start_page || ""}},
  doi = {${paper.doi || ""}}
}`;

      case "RIS":
        return `TY  - JOUR
AU  - ${authorsArray.join("\nAU  - ")}
TI  - ${paper.title}
JO  - ${paper.publication_name || ""}
PY  - ${paper.publication_year || ""}
VL  - ${paper.volume || ""}
IS  - ${paper.issue || ""}
SP  - ${paper.start_page || ""}
DO  - ${paper.doi || ""}
ER  -`;

      default:
        return formatCitation(paper, "APA");
    }
  } catch (error: any) {
    logger.error(`格式化引用失败: ${error?.message}`, { error });
    return `${paper.title}`;
  }
};
