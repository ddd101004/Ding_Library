/**
 * 用户通知数据库操作
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

// ==================== 类型定义 ====================

/**
 * 通知类型
 */
export type NotificationType = "doc_delivery" | "system" | "account";

/**
 * 关联类型
 */
export type RelatedType = "paper" | "doc_delivery_request";

/**
 * 创建通知参数
 */
export interface CreateNotificationParams {
  user_id: string;
  notification_type: NotificationType;
  title: string;
  content?: string;
  related_type?: RelatedType;
  related_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 查询通知参数
 */
export interface GetNotificationsParams {
  user_id: string;
  notification_type?: NotificationType;
  is_read?: boolean;
  page?: number;
  size?: number;
}

/**
 * 未读数量按类型统计
 */
export interface UnreadCountByType {
  doc_delivery: number;
  system: number;
  account: number;
}

// ==================== 创建操作 ====================

/**
 * 创建通知
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = await prisma.userNotification.create({
      data: {
        user_id: params.user_id,
        notification_type: params.notification_type,
        title: params.title,
        content: params.content,
        related_type: params.related_type,
        related_id: params.related_id,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });

    logger.info("创建通知成功", {
      notificationId: notification.id,
      userId: params.user_id,
      type: params.notification_type,
    });

    return notification;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`创建通知失败: ${errorMessage}`, { error, params });
    return null;
  }
};

/**
 * 批量创建通知（用于群发系统通知）
 */
export const createNotificationsBatch = async (
  notifications: CreateNotificationParams[]
) => {
  try {
    const result = await prisma.userNotification.createMany({
      data: notifications.map((n) => ({
        user_id: n.user_id,
        notification_type: n.notification_type,
        title: n.title,
        content: n.content,
        related_type: n.related_type,
        related_id: n.related_id,
        metadata: n.metadata ? JSON.stringify(n.metadata) : null,
      })),
    });

    logger.info("批量创建通知成功", { count: result.count });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量创建通知失败: ${errorMessage}`, { error });
    return null;
  }
};

// ==================== 查询操作 ====================

/**
 * 获取用户通知列表
 */
export const getUserNotifications = async (params: GetNotificationsParams) => {
  const { user_id, notification_type, is_read, page = 1, size = 20 } = params;

  try {
    const where: Prisma.UserNotificationWhereInput = {
      user_id,
    };

    if (notification_type) {
      where.notification_type = notification_type;
    }

    if (typeof is_read === "boolean") {
      where.is_read = is_read;
    }

    const [total, items] = await Promise.all([
      prisma.userNotification.count({ where }),
      prisma.userNotification.findMany({
        where,
        orderBy: { create_time: "desc" },
        skip: (page - 1) * size,
        take: size,
        select: {
          id: true,
          notification_type: true,
          title: true,
          content: true,
          is_read: true,
          related_type: true,
          related_id: true,
          metadata: true,
          create_time: true,
          read_time: true,
        },
      }),
    ]);

    // 解析 metadata JSON
    const formattedItems = items.map((item) => ({
      ...item,
      metadata: item.metadata ? JSON.parse(item.metadata) : null,
    }));

    return { total, items: formattedItems };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取通知列表失败: ${errorMessage}`, { error });
    return { total: 0, items: [] };
  }
};

/**
 * 获取未读通知数量
 */
export const getUnreadNotificationCount = async (userId: string) => {
  try {
    const count = await prisma.userNotification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });

    return count;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取未读数量失败: ${errorMessage}`, { error });
    return 0;
  }
};

/**
 * 按类型获取未读通知数量
 */
export const getUnreadCountByType = async (
  userId: string
): Promise<UnreadCountByType> => {
  try {
    const results = await prisma.userNotification.groupBy({
      by: ["notification_type"],
      where: {
        user_id: userId,
        is_read: false,
      },
      _count: {
        id: true,
      },
    });

    const countByType: UnreadCountByType = {
      doc_delivery: 0,
      system: 0,
      account: 0,
    };

    for (const result of results) {
      const type = result.notification_type as keyof UnreadCountByType;
      if (type in countByType) {
        countByType[type] = result._count.id;
      }
    }

    return countByType;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取分类未读数量失败: ${errorMessage}`, { error });
    return { doc_delivery: 0, system: 0, account: 0 };
  }
};

/**
 * 根据 ID 获取通知
 */
export const getNotificationById = async (id: string, userId: string) => {
  try {
    const notification = await prisma.userNotification.findFirst({
      where: {
        id,
        user_id: userId,
      },
    });

    return notification;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取通知详情失败: ${errorMessage}`, { error });
    return null;
  }
};

// ==================== 更新操作 ====================

/**
 * 标记单条通知为已读
 */
export const markNotificationAsRead = async (id: string, userId: string) => {
  try {
    const notification = await prisma.userNotification.updateMany({
      where: {
        id,
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_time: new Date(),
      },
    });

    if (notification.count > 0) {
      logger.info("标记通知已读成功", { notificationId: id, userId });
    }

    return notification.count > 0;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`标记通知已读失败: ${errorMessage}`, { error });
    return false;
  }
};

/**
 * 标记全部通知为已读
 */
export const markAllNotificationsAsRead = async (
  userId: string,
  notificationType?: NotificationType
) => {
  try {
    const where: Prisma.UserNotificationWhereInput = {
      user_id: userId,
      is_read: false,
    };

    if (notificationType) {
      where.notification_type = notificationType;
    }

    const result = await prisma.userNotification.updateMany({
      where,
      data: {
        is_read: true,
        read_time: new Date(),
      },
    });

    logger.info("批量标记通知已读成功", {
      userId,
      type: notificationType || "all",
      count: result.count,
    });

    return result.count;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量标记通知已读失败: ${errorMessage}`, { error });
    return 0;
  }
};
