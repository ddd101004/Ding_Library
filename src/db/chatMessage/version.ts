import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { batchGetUserFeedbackStatus } from "@/db/messageFeedback";

/**
 * 版本信息类型
 */
export interface MessageVersionInfo {
  totalVersions: number;
  currentVersion: number;
  rootMessageId: string;
  allVersions: Array<{
    message_id: string;
    content: string;
    reasoningContent: string | null;
    create_time: Date;
    parent_message_id: string | null;
    status: string;
    is_liked: boolean;
    is_disliked: boolean;
  }>;
}

/**
 * 批量获取多个消息的版本信息（使用 root_message_id 优化）
 *
 * @param message_ids 消息ID列表
 * @param user_id 用户ID（用于查询反馈状态）
 * @returns 消息ID到版本信息的映射
 */
export const batchGetMessageVersionInfo = async (
  message_ids: string[],
  user_id: string
): Promise<Record<string, MessageVersionInfo>> => {
  const result: Record<string, MessageVersionInfo> = {};

  if (!message_ids || message_ids.length === 0) {
    return result;
  }

  try {
    const inputMessages = await prisma.chatMessage.findMany({
      where: { message_id: { in: message_ids } },
      select: {
        message_id: true,
        root_message_id: true,
      },
    });

    const rootMessageIds = new Set<string>();
    const messageToRoot = new Map<string, string>();

    for (const msg of inputMessages) {
      const rootId = msg.root_message_id || msg.message_id;
      messageToRoot.set(msg.message_id, rootId);
      rootMessageIds.add(rootId);
    }

    const allVersions = await prisma.chatMessage.findMany({
      where: { root_message_id: { in: [...rootMessageIds] } },
      select: {
        message_id: true,
        content: true,
        reasoningContent: true,
        create_time: true,
        parent_message_id: true,
        status: true,
        root_message_id: true,
      },
      orderBy: { create_time: "asc" },
    });

    const feedbackStatusMap = await batchGetUserFeedbackStatus(
      user_id,
      allVersions.map((v) => v.message_id)
    );

    const rootToVersions = new Map<string, typeof allVersions>();
    for (const version of allVersions) {
      const rootId = version.root_message_id!;
      if (!rootToVersions.has(rootId)) {
        rootToVersions.set(rootId, []);
      }
      rootToVersions.get(rootId)!.push(version);
    }

    for (const messageId of message_ids) {
      const rootId = messageToRoot.get(messageId);
      if (!rootId) {
        result[messageId] = {
          totalVersions: 1,
          currentVersion: 1,
          rootMessageId: messageId,
          allVersions: [],
        };
        continue;
      }

      const versions = rootToVersions.get(rootId) || [];
      const currentVersionIndex = versions.findIndex((v) => v.message_id === messageId) + 1;

      result[messageId] = {
        totalVersions: versions.length,
        currentVersion: currentVersionIndex > 0 ? currentVersionIndex : 1,
        rootMessageId: rootId,
        allVersions: versions.map((v) => {
          const feedback = feedbackStatusMap[v.message_id] || { is_liked: false, is_disliked: false };
          return {
            message_id: v.message_id,
            content: v.content,
            reasoningContent: v.reasoningContent,
            create_time: v.create_time,
            parent_message_id: v.parent_message_id,
            status: v.status,
            is_liked: feedback.is_liked,
            is_disliked: feedback.is_disliked,
          };
        }),
      };
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量获取消息版本信息失败: ${errorMessage}`, { error });

    for (const messageId of message_ids) {
      result[messageId] = {
        totalVersions: 1,
        currentVersion: 1,
        rootMessageId: messageId,
        allVersions: [],
      };
    }
    return result;
  }
};
