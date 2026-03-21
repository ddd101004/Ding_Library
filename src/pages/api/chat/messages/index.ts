import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getMessagesByConversationId } from "@/db/chatMessage";
import { parseLimitParam } from "@/utils/parsePageParams";
import { verifyConversationOwner } from "@/db/chatConversation";
import { validateId } from "@/utils/validateString";

/**
 * GET - 获取消息列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { conversation_id, limit, before_message_order } = req.query;

  // 参数校验
  const idResult = validateId(conversation_id, "会话 ID");
  if (!idResult.valid) {
    throw new Error(idResult.error || "会话 ID 校验失败");
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    conversation_id as string,
    userId
  );
  if (!isOwner) {
    throw new Error("无权访问此会话");
  }

  const result = await getMessagesByConversationId({
    conversation_id: conversation_id as string,
    user_id: userId,
    limit: parseLimitParam(limit, 50, 200),
    before_message_order: before_message_order
      ? parseLimitParam(before_message_order, 0, Number.MAX_SAFE_INTEGER)
      : undefined,
  });

  if (!result) {
    throw new Error("获取消息列表失败");
  }

  sendSuccessResponse(res, "获取成功", result);
};

/**
 * 消息管理 API
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

export default withAuth(withErrorHandler(handler, { logPrefix: "消息管理" }));
