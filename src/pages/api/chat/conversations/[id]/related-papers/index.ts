import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getConversationById } from "@/db/chatConversation";
import { getAutoRelatedPapersGroupedByMessage } from "@/db/messageCitation";
import logger from "@/helper/logger";
import { validateId } from "@/utils/validateString";

/**
 * 获取对话的相关论文列表（按消息分组）
 * GET /api/chat/conversations/:id/related-papers
 *
 * @requires Authentication - 需要用户登录
 * @param id - 对话ID（路径参数）
 * @returns 按消息分组的相关论文列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 验证参数
  const idResult = validateId(id, "对话 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "对话 ID 校验失败");
  }

  // 验证对话所属权
  const conversation = await getConversationById(id as string);

  if (!conversation) {
    return sendWarnningResponse(res, "对话不存在");
  }

  if (conversation.user_id !== userId) {
    return sendWarnningResponse(res, "无权访问该对话");
  }

  // 获取按消息分组的相关论文
  const messages = await getAutoRelatedPapersGroupedByMessage(id as string);

  // 统计总论文数
  const totalPapers = messages.reduce((sum, msg) => sum + msg.papers.length, 0);

  logger.info("获取对话相关论文成功", {
    conversationId: id,
    userId,
    messageCount: messages.length,
    totalPapers,
  });

  return sendSuccessResponse(res, "获取成功", {
    conversation_id: id,
    total_papers: totalPapers,
    messages,
  });
};

/**
 * 对话相关论文 API 路由
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "对话相关论文", useLogger: true })
);
