import { CONVERSATION_MAX_TOKENS } from "@/constants";
import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

/**
 * 创建新的对话会话
 */
export const createConversation = async (data: {
  user_id: string;
  title?: string;
  model?: string;
  is_deep_think?: boolean;
  context_window?: number;
  max_tokens?: number;
}) => {
  try {
    const conversation = await prisma.chatConversation.create({
      data: {
        user_id: data.user_id,
        title: data.title || "新对话",
        model: data.model || process.env.LLM_MODEL!,
        is_deep_think: data.is_deep_think || false,
        context_window: data.context_window || 10,
        max_tokens: data.max_tokens || CONVERSATION_MAX_TOKENS,
        message_count: 0,
        last_message_at: new Date(),
      },
    });
    return conversation;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`创建对话会话失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 根据conversation_id获取会话详情
 */
export const getConversationById = async (conversation_id: string) => {
  try {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        conversation_id,
        deleted_at: null,
      },
    });
    return conversation;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取会话详情失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 获取用户的会话列表（分页）
 */
export const getConversationsByUserId = async (params: {
  user_id: string;
  page?: number;
  limit?: number;
  search?: string;
}) => {
  try {
    const {
      user_id,
      page = 1,
      limit = 20,
      search,
    } = params;

    const where: Prisma.ChatConversationWhereInput = {
      user_id,
      deleted_at: null,
    };

    // 如果有搜索关键词，添加搜索条件
    if (search) {
      where.title = {
        contains: search,
      };
    }

    // 获取总数
    const total = await prisma.chatConversation.count({ where });

    // 获取列表（置顶的在前，然后按最后消息时间倒序）
    const conversations = await prisma.chatConversation.findMany({
      where,
      orderBy: [{ is_pinned: "desc" }, { last_message_at: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        messages: {
          where: { role: "user" },
          orderBy: { message_order: "desc" },
          take: 1,
          select: {
            content: true,
            role: true,
          },
        },
      },
    });

    // 获取所有会话 ID
    const conversationIds = conversations.map((c) => c.conversation_id);

    // 批量查询检索的论文（通过 MessageCitation，citation_type = "auto_related"）
    const searchedPapers = await prisma.messageCitation.findMany({
      where: {
        conversation_id: { in: conversationIds },
        citation_type: "auto_related",
      },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            authors: true,
            abstract: true,
            source: true,
            source_id: true,
            publication_name: true,
            publication_year: true,
            doi: true,
          },
        },
      },
      orderBy: {
        create_time: "desc",
      },
    });

    // 按会话 ID 分组论文汇总
    const papersSummaryMap = new Map<
      string,
      Array<{
        id: string;
        type: "searched";
        title: string;
        authors: Prisma.JsonValue | string | null;
        abstract: string | null;
        source?: string;
        source_id?: string;
        publication_name?: string | null;
        publication_year?: number | null;
        doi?: string | null;
        create_time: Date;
      }>
    >();

    // 处理检索的论文
    for (const citation of searchedPapers) {
      const convId = citation.conversation_id;
      if (!convId) continue;
      if (!papersSummaryMap.has(convId)) {
        papersSummaryMap.set(convId, []);
      }
      const papers = papersSummaryMap.get(convId)!;
      // 去重：检查是否已存在相同 ID 的论文
      if (citation.paper && !papers.some((p) => p.id === citation.paper_id)) {
        papers.push({
          id: citation.paper_id,
          type: "searched",
          title: citation.paper.title,
          authors: citation.paper.authors,
          abstract: citation.paper.abstract,
          source: citation.paper.source,
          source_id: citation.paper.source_id,
          publication_name: citation.paper.publication_name,
          publication_year: citation.paper.publication_year,
          doi: citation.paper.doi,
          create_time: citation.create_time,
        });
      }
    }

    // 对每个会话的论文按时间排序并取最近5篇
    for (const [convId, papers] of papersSummaryMap) {
      papers.sort(
        (a, b) =>
          new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
      );
      papersSummaryMap.set(convId, papers.slice(0, 5));
    }

    // 格式化返回数据，添加最后一条消息预览和论文汇总
    const conversationsWithPreview = conversations.map((conv) => {
      // 构建论文汇总列表
      const papersList = papersSummaryMap.get(conv.conversation_id) || [];

      // 取最近5篇
      const finalPapersList = papersList.slice(0, 5);

      return {
        conversation_id: conv.conversation_id,
        title: conv.title,
        model: conv.model,
        is_deep_think: conv.is_deep_think,
        is_pinned: conv.is_pinned,
        message_count: conv.message_count,
        last_message_at: conv.last_message_at,
        create_time: conv.create_time,
        last_message_preview:
          conv.messages.length > 0
            ? conv.messages[0].content.slice(0, 50) +
              (conv.messages[0].content.length > 50 ? "..." : "")
            : "",
        // 会话论文汇总（最近5篇）
        paper_info: finalPapersList,
      };
    });

    return {
      conversations: conversationsWithPreview,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取会话列表失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 更新会话信息
 */
export const updateConversation = async (
  conversation_id: string,
  data: Prisma.ChatConversationUpdateInput
) => {
  try {
    const conversation = await prisma.chatConversation.update({
      where: { conversation_id },
      data,
    });
    return conversation;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`更新会话失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 软删除会话（设置deleted_at）
 */
export const deleteConversation = async (conversation_id: string) => {
  try {
    const conversation = await prisma.chatConversation.update({
      where: { conversation_id },
      data: { deleted_at: new Date() },
    });
    return conversation;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`删除会话失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 获取会话的消息数量
 */
export const getMessageCount = async (conversation_id: string) => {
  try {
    const conversation = await prisma.chatConversation.findUnique({
      where: { conversation_id },
      select: { message_count: true },
    });
    return conversation?.message_count || 0;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取消息数量失败: ${errorMessage}`, { error });
    return 0;
  }
};

/**
 * 验证会话是否属于指定用户
 */
export const verifyConversationOwner = async (
  conversation_id: string,
  user_id: string
) => {
  try {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        conversation_id,
        user_id,
        deleted_at: null,
      },
    });
    return !!conversation;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`验证会话所有者失败: ${errorMessage}`, { error });
    return false;
  }
};
