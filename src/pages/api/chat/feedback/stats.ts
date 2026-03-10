import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getFeedbackStatsByConversation } from "@/db/messageFeedback";
import { verifyConversationOwner } from "@/db/chatConversation";

/**
 * GET - 获取反馈统计
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { conversation_id } = req.query;

  if (!conversation_id) {
    return sendWarnningResponse(res, "缺少会话ID");
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    conversation_id as string,
    userId
  );
  if (!isOwner) {
    return sendWarnningResponse(res, "无权访问此会话");
  }

  // 获取反馈统计
  const stats = await getFeedbackStatsByConversation(
    conversation_id as string
  );

  return sendSuccessResponse(res, "获取成功", stats);
};

/**
 * 反馈统计 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "反馈统计" })
);
