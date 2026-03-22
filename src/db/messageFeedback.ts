import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";

/**
 * 创建消息反馈
 */
export const createFeedback = async (data: {
  message_id: string;
  user_id: string;
  feedback_type: string;
}) => {
  try {
    const feedback = await prisma.messageFeedback.create({
      data: {
        message_id: data.message_id,
        user_id: data.user_id,
        feedback_type: data.feedback_type,
      },
    });
    return feedback;
  } catch (error: any) {
    logger.error(`创建反馈失败: ${error?.message}`, { error });
    return;
  }
};

/**
 * 获取用户对某条消息的反馈
 */
export const getFeedbackByUserAndMessage = async (userId: string, messageId: string) => {
  try {
    const feedback = await prisma.messageFeedback.findFirst({
      where: {
        user_id: userId,
        message_id: messageId,
      },
    });
    return feedback;
  } catch (error: any) {
    logger.error(`获取用户消息反馈失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 更新反馈记录
 */
export const updateFeedback = async (feedbackId: string, updates: {
  feedback_type?: string;
  update_time?: Date;
}) => {
  try {
    const feedback = await prisma.messageFeedback.update({
      where: { feedback_id: feedbackId },
      data: updates,
    });
    return feedback;
  } catch (error: any) {
    logger.error(`更新反馈失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 删除反馈记录
 */
export const deleteFeedback = async (feedbackId: string) => {
  try {
    await prisma.messageFeedback.delete({
      where: { feedback_id: feedbackId },
    });
    return true;
  } catch (error: any) {
    logger.error(`删除反馈失败: ${error?.message}`, { error });
    return false;
  }
};

/**
 * 获取消息的所有反馈
 */
export const getFeedbacksByMessageId = async (message_id: string) => {
  try {
    const feedbacks = await prisma.messageFeedback.findMany({
      where: { message_id },
      orderBy: { create_time: "desc" },
    });
    return feedbacks;
  } catch (error: any) {
    logger.error(`获取消息反馈失败: ${error?.message}`, { error });
    return [];
  }
};

/**
 * 批量获取用户对多条消息的反馈状态
 * 返回格式: { [message_id]: { is_liked: boolean, is_disliked: boolean } }
 * 注意：同一条消息的 is_liked 和 is_disliked 互斥，不会同时为 true
 */
export const batchGetUserFeedbackStatus = async (
  userId: string,
  messageIds: string[]
): Promise<Record<string, { is_liked: boolean; is_disliked: boolean }>> => {
  try {
    if (!messageIds.length) {
      return {};
    }

    // 每个用户对每条消息只有一条反馈记录，查询 like 或 dislike 类型的反馈
    const feedbacks = await prisma.messageFeedback.findMany({
      where: {
        user_id: userId,
        message_id: { in: messageIds },
        feedback_type: { in: ["like", "dislike"] },
      },
      select: {
        message_id: true,
        feedback_type: true,
      },
    });

    // 初始化所有消息的反馈状态
    const result: Record<string, { is_liked: boolean; is_disliked: boolean }> = {};
    messageIds.forEach((id) => {
      result[id] = { is_liked: false, is_disliked: false };
    });

    // 填充实际的反馈状态（互斥逻辑：一条消息只能 liked 或 disliked）
    feedbacks.forEach((feedback) => {
      if (result[feedback.message_id]) {
        // 根据反馈类型设置状态，确保互斥
        result[feedback.message_id] = {
          is_liked: feedback.feedback_type === "like",
          is_disliked: feedback.feedback_type === "dislike",
        };
      }
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量获取用户反馈状态失败: ${errorMessage}`, { error });
    // 返回默认值，不影响消息列表正常返回
    const result: Record<string, { is_liked: boolean; is_disliked: boolean }> = {};
    messageIds.forEach((id) => {
      result[id] = { is_liked: false, is_disliked: false };
    });
    return result;
  }
};

/**
 * 获取用户对单条消息的反馈状态
 * 注意：is_liked 和 is_disliked 互斥，不会同时为 true
 */
export const getUserFeedbackStatus = async (
  userId: string,
  messageId: string
): Promise<{ is_liked: boolean; is_disliked: boolean }> => {
  try {
    // 每个用户对每条消息只有一条反馈记录
    const feedback = await prisma.messageFeedback.findFirst({
      where: {
        user_id: userId,
        message_id: messageId,
        feedback_type: { in: ["like", "dislike"] },
      },
      select: {
        feedback_type: true,
      },
    });

    // 互斥返回：只能是 liked 或 disliked 或都不是
    return {
      is_liked: feedback?.feedback_type === "like",
      is_disliked: feedback?.feedback_type === "dislike",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取用户反馈状态失败: ${errorMessage}`, { error });
    return { is_liked: false, is_disliked: false };
  }
};

/**
 * 获取会话的反馈统计
 */
export const getFeedbackStatsByConversation = async (
  conversation_id: string
) => {
  try {
    const feedbacks = await prisma.messageFeedback.findMany({
      where: {
        message: {
          conversation_id,
        },
        feedback_type: { in: ["like", "dislike"] },
      },
      select: {
        feedback_type: true,
      },
    });

    // 统计点赞/点踩数量
    const stats = {
      like_count: 0,
      dislike_count: 0,
    };

    feedbacks.forEach((feedback) => {
      if (feedback.feedback_type === "like") {
        stats.like_count++;
      } else if (feedback.feedback_type === "dislike") {
        stats.dislike_count++;
      }
    });

    return stats;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取反馈统计失败: ${errorMessage}`, { error });
    return {
      like_count: 0,
      dislike_count: 0,
    };
  }
};