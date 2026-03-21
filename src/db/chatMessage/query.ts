import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import { batchGetUserFeedbackStatus, getUserFeedbackStatus } from "@/db/messageFeedback";

/**
 * 获取会话的消息列表（分页，基于message_order）
 */
export const getMessagesByConversationId = async (params: {
  conversation_id: string;
  user_id: string;
  limit?: number;
  before_message_order?: number;
}) => {
  try {
    const { conversation_id, user_id, limit = 50, before_message_order } = params;

    const where: Prisma.ChatMessageWhereInput = {
      conversation_id,
    };

    if (before_message_order) {
      where.message_order = {
        lt: before_message_order,
      };
    }

    const allMessages = await prisma.chatMessage.findMany({
      where,
      orderBy: { message_order: "asc" },
      include: {
        citations: {
          include: {
            paper: {
              select: {
                id: true,
                title: true,
                authors: true,
              },
            },
          },
          orderBy: { citation_order: "asc" },
        },
      },
    });

    const versionGroups = new Map<string, string[]>();

    const assistantMessages = allMessages.filter(m => m.role === 'assistant');

    assistantMessages.forEach(message => {
      let rootId = message.message_id;
      let currentId = message.message_id;

      while (currentId) {
        const current = assistantMessages.find(m => m.message_id === currentId);
        if (!current || !current.parent_message_id) {
          rootId = currentId;
          break;
        }
        currentId = current.parent_message_id;
      }

      if (!versionGroups.has(rootId)) {
        versionGroups.set(rootId, []);
      }
      versionGroups.get(rootId)!.push(message.message_id);
    });

    const messages = allMessages.filter(message => {
      // 过滤掉 paper_upload 类型的初始消息（仅用于关联论文，不展示给前端）
      if (message.content_type === 'paper_upload') {
        return false;
      }

      if (message.role === 'user') {
        return true;
      }

      if (message.role === 'assistant') {
        let messageGroup: string[] = [];
        for (const [, messageIds] of versionGroups.entries()) {
          if (messageIds.includes(message.message_id)) {
            messageGroup = messageIds;
            break;
          }
        }

        const latestInGroup = messageGroup
          .map(id => assistantMessages.find(m => m.message_id === id))
          .filter((m): m is NonNullable<typeof m> => m !== undefined)
          .sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())[0];

        return message.message_id === latestInGroup?.message_id;
      }

      return false;
    });

    messages.sort((a, b) => a.message_order - b.message_order);

    const limitedMessages = messages.slice(-limit);

    const messageIds = limitedMessages.map((msg) => msg.message_id);
    const feedbackStatusMap = await batchGetUserFeedbackStatus(user_id, messageIds);

    // 获取所有 assistant 消息的 root ID（如果有 root_message_id 则用它，否则用 message_id）
    const rootIds = limitedMessages
      .filter(msg => msg.role === 'assistant')
      .map(msg => msg.root_message_id || msg.message_id);

    const uniqueRootIds = [...new Set(rootIds)];

    // 统计每个 root ID 下有多少个子版本
    const versionCounts = await prisma.chatMessage.groupBy({
      by: ['root_message_id'],
      where: {
        root_message_id: { in: uniqueRootIds },
      },
      _count: { message_id: true },
    });

    const versionCountMap = new Map(
      versionCounts.map(v => [v.root_message_id!, v._count.message_id])
    );

    const formattedMessages = limitedMessages.map((msg) => {
      const feedbackStatus = feedbackStatusMap[msg.message_id] || { is_liked: false, is_disliked: false };

      let has_multiple_versions = false;
      if (msg.role === 'assistant') {
        const rootId = msg.root_message_id || msg.message_id;
        has_multiple_versions = (versionCountMap.get(rootId) || 1) > 1;
      }

      return {
        message_id: msg.message_id,
        conversation_id: msg.conversation_id,
        role: msg.role,
        content: msg.content,
        content_type: msg.content_type,
        message_order: msg.message_order,
        status: msg.status,
        error_message: msg.error_message,
        parent_message_id: msg.parent_message_id,
        input_tokens: msg.input_tokens,
        output_tokens: msg.output_tokens,
        total_tokens: msg.total_tokens,
        create_time: msg.create_time,
        update_time: msg.update_time,
        reasoning_content: msg.reasoning_content,
        reasoning_tokens: msg.reasoning_tokens,
        is_liked: feedbackStatus.is_liked,
        is_disliked: feedbackStatus.is_disliked,
        has_multiple_versions,
        citations: msg.citations.map((citation) => ({
          ...citation,
        })),
        attachments: [],
      };
    });

    const hasMore = limitedMessages.length === limit;

    return {
      messages: formattedMessages,
      has_more: hasMore,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取消息列表失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 根据message_id获取消息详情
 */
export const getMessageById = async (message_id: string, user_id?: string) => {
  try {
    const message = await prisma.chatMessage.findUnique({
      where: { message_id },
      include: {
        citations: {
          include: {
            paper: true,
          },
        },
      },
    });

    if (!message) return null;

    let feedbackStatus = { is_liked: false, is_disliked: false };
    if (user_id) {
      feedbackStatus = await getUserFeedbackStatus(user_id, message_id);
    }

    return {
      message_id: message.message_id,
      conversation_id: message.conversation_id,
      role: message.role,
      content: message.content,
      content_type: message.content_type,
      message_order: message.message_order,
      status: message.status,
      error_message: message.error_message,
      parent_message_id: message.parent_message_id,
      input_tokens: message.input_tokens,
      output_tokens: message.output_tokens,
      total_tokens: message.total_tokens,
      create_time: message.create_time,
      update_time: message.update_time,
      reasoning_content: message.reasoning_content,
      reasoning_tokens: message.reasoning_tokens,
      is_liked: feedbackStatus.is_liked,
      is_disliked: feedbackStatus.is_disliked,
      citations: message.citations,
      attachments: [],
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取消息详情失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 获取最近N条消息用于上下文构建
 */
export const getRecentMessages = async (
  conversation_id: string,
  limit: number
) => {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        conversation_id,
        status: "completed",
      },
      orderBy: { message_order: "desc" },
      take: limit,
      select: {
        role: true,
        content: true,
        message_order: true,
      },
    });

    return messages.reverse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取最近消息失败: ${errorMessage}`, { error });
    return [];
  }
};

/**
 * 获取父消息及其上下文（用于重新生成）
 */
export const getParentMessageContext = async (message_id: string) => {
  try {
    const message = await prisma.chatMessage.findUnique({
      where: { message_id },
      include: {
        conversation: true,
      },
    });

    if (!message) return null;

    const contextMessages = await prisma.chatMessage.findMany({
      where: {
        conversation_id: message.conversation_id,
        message_order: { lt: message.message_order },
      },
      orderBy: { message_order: "asc" },
      select: {
        role: true,
        content: true,
      },
    });

    return {
      message,
      contextMessages,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取父消息上下文失败: ${errorMessage}`, { error });
    return null;
  }
};
