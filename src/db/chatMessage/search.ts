import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

/**
 * 搜索历史消息（增强版 - 支持多字段搜索）
 * 搜索范围：对话标题、论文标题、消息内容
 * 排序优先级：对话标题 > 论文标题 > 消息内容
 * 使用MySQL FULLTEXT索引提升消息内容搜索性能
 */
export const searchMessages = async (params: {
  user_id: string;
  keyword: string;
  conversation_id?: string;
  page?: number;
  limit?: number;
  useFulltext?: boolean;
}) => {
  try {
    const {
      user_id,
      keyword,
      conversation_id,
      page = 1,
      limit = 20,
      useFulltext = true,
    } = params;

    const shouldUseFulltext = useFulltext && keyword.length >= 2;
    const offset = (page - 1) * limit;

    if (shouldUseFulltext) {
      const likePattern = `%${keyword}%`;

      const countResult: unknown[] = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT msg.message_id) as total
        FROM chat_messages msg
        INNER JOIN chat_conversations conv ON msg.conversation_id = conv.conversation_id
        LEFT JOIN user_uploaded_papers paper ON conv.uploaded_paper_id = paper.id
        WHERE conv.user_id = ${user_id}
        AND conv.deleted_at IS NULL
        AND (
          conv.title LIKE ${likePattern}
          OR paper.title LIKE ${likePattern}
          OR MATCH(msg.content) AGAINST(${keyword} IN NATURAL LANGUAGE MODE)
        )
        ${
          conversation_id
            ? Prisma.sql`AND msg.conversation_id = ${conversation_id}`
            : Prisma.empty
        }
      `;

      const total = Number((countResult[0] as { total: number })?.total || 0);

      const messages: unknown[] = await prisma.$queryRaw`
        SELECT
          msg.message_id,
          msg.conversation_id,
          msg.role,
          msg.content,
          msg.message_order,
          msg.create_time,
          conv.title as conversation_title,
          paper.title as paper_title,
          CASE
            WHEN conv.title LIKE ${likePattern} THEN 3
            WHEN paper.title LIKE ${likePattern} THEN 2
            ELSE 1
          END as match_priority,
          MATCH(msg.content) AGAINST(${keyword} IN NATURAL LANGUAGE MODE) as relevance_score
        FROM chat_messages msg
        INNER JOIN chat_conversations conv ON msg.conversation_id = conv.conversation_id
        LEFT JOIN user_uploaded_papers paper ON conv.uploaded_paper_id = paper.id
        WHERE conv.user_id = ${user_id}
        AND conv.deleted_at IS NULL
        AND (
          conv.title LIKE ${likePattern}
          OR paper.title LIKE ${likePattern}
          OR MATCH(msg.content) AGAINST(${keyword} IN NATURAL LANGUAGE MODE)
        )
        ${
          conversation_id
            ? Prisma.sql`AND msg.conversation_id = ${conversation_id}`
            : Prisma.empty
        }
        ORDER BY match_priority DESC, relevance_score DESC, msg.create_time DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const results = (messages as Array<{
        message_id: string;
        conversation_id: string;
        conversation_title: string;
        paper_title: string | null;
        role: string;
        content: string;
        message_order: number;
        create_time: Date | string;
        match_priority: number;
        relevance_score: number;
      }>).map((msg) => {
        const content = msg.content;
        const index = content.toLowerCase().indexOf(keyword.toLowerCase());

        let snippet = content;
        if (index !== -1) {
          const start = Math.max(0, index - 30);
          const end = Math.min(content.length, index + keyword.length + 30);
          snippet =
            (start > 0 ? "..." : "") +
            content.slice(start, end) +
            (end < content.length ? "..." : "");
        }

        const matchedFields: string[] = [];
        if (
          msg.conversation_title &&
          msg.conversation_title.toLowerCase().includes(keyword.toLowerCase())
        ) {
          matchedFields.push("conversation_title");
        }
        if (
          msg.paper_title &&
          msg.paper_title.toLowerCase().includes(keyword.toLowerCase())
        ) {
          matchedFields.push("paper_title");
        }
        if (msg.relevance_score > 0) {
          matchedFields.push("content");
        }

        return {
          message_id: msg.message_id,
          conversation_id: msg.conversation_id,
          conversation_title: msg.conversation_title,
          paper_title: msg.paper_title || null,
          role: msg.role,
          content: msg.content,
          matched_snippet: snippet,
          matched_fields: matchedFields,
          match_priority: Number(msg.match_priority),
          relevance_score: Number(msg.relevance_score),
          message_order: Number(msg.message_order),
          create_time:
            msg.create_time instanceof Date
              ? msg.create_time.toISOString()
              : msg.create_time,
        };
      });

      return {
        results,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
        search_mode: "fulltext_enhanced",
      };
    } else {
      const likePattern = `%${keyword}%`;

      const countResult: unknown[] = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT msg.message_id) as total
        FROM chat_messages msg
        INNER JOIN chat_conversations conv ON msg.conversation_id = conv.conversation_id
        LEFT JOIN user_uploaded_papers paper ON conv.uploaded_paper_id = paper.id
        WHERE conv.user_id = ${user_id}
        AND conv.deleted_at IS NULL
        AND (
          conv.title LIKE ${likePattern}
          OR paper.title LIKE ${likePattern}
          OR msg.content LIKE ${likePattern}
        )
        ${
          conversation_id
            ? Prisma.sql`AND msg.conversation_id = ${conversation_id}`
            : Prisma.empty
        }
      `;

      const total = Number((countResult[0] as { total: number })?.total || 0);

      const messages: unknown[] = await prisma.$queryRaw`
        SELECT
          msg.message_id,
          msg.conversation_id,
          msg.role,
          msg.content,
          msg.message_order,
          msg.create_time,
          conv.title as conversation_title,
          paper.title as paper_title,
          CASE
            WHEN conv.title LIKE ${likePattern} THEN 3
            WHEN paper.title LIKE ${likePattern} THEN 2
            ELSE 1
          END as match_priority
        FROM chat_messages msg
        INNER JOIN chat_conversations conv ON msg.conversation_id = conv.conversation_id
        LEFT JOIN user_uploaded_papers paper ON conv.uploaded_paper_id = paper.id
        WHERE conv.user_id = ${user_id}
        AND conv.deleted_at IS NULL
        AND (
          conv.title LIKE ${likePattern}
          OR paper.title LIKE ${likePattern}
          OR msg.content LIKE ${likePattern}
        )
        ${
          conversation_id
            ? Prisma.sql`AND msg.conversation_id = ${conversation_id}`
            : Prisma.empty
        }
        ORDER BY match_priority DESC, msg.create_time DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const results = (messages as Array<{
        message_id: string;
        conversation_id: string;
        conversation_title: string;
        paper_title: string | null;
        role: string;
        content: string;
        message_order: number;
        create_time: Date | string;
        match_priority: number;
      }>).map((msg) => {
        const content = msg.content;
        const index = content.toLowerCase().indexOf(keyword.toLowerCase());

        let snippet = content;
        if (index !== -1) {
          const start = Math.max(0, index - 30);
          const end = Math.min(content.length, index + keyword.length + 30);
          snippet =
            (start > 0 ? "..." : "") +
            content.slice(start, end) +
            (end < content.length ? "..." : "");
        }

        const matchedFields: string[] = [];
        if (
          msg.conversation_title &&
          msg.conversation_title.toLowerCase().includes(keyword.toLowerCase())
        ) {
          matchedFields.push("conversation_title");
        }
        if (
          msg.paper_title &&
          msg.paper_title.toLowerCase().includes(keyword.toLowerCase())
        ) {
          matchedFields.push("paper_title");
        }
        if (content.toLowerCase().includes(keyword.toLowerCase())) {
          matchedFields.push("content");
        }

        return {
          message_id: msg.message_id,
          conversation_id: msg.conversation_id,
          conversation_title: msg.conversation_title,
          paper_title: msg.paper_title || null,
          role: msg.role,
          content: msg.content,
          matched_snippet: snippet,
          matched_fields: matchedFields,
          match_priority: Number(msg.match_priority),
          message_order: Number(msg.message_order),
          create_time:
            msg.create_time instanceof Date
              ? msg.create_time.toISOString()
              : msg.create_time,
        };
      });

      return {
        results,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit),
        },
        search_mode: "like_enhanced",
      };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`搜索消息失败: ${errorMessage}`, { error });
    return;
  }
};
