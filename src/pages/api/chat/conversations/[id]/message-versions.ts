import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { batchGetMessageVersionInfo } from "@/db/chatMessage";
import { getConversationById } from "@/db/chatConversation";
import { validateId } from "@/utils/validateString";

/**
 * POST - 批量获取消息版本信息
 *
 * @param message_ids - 消息ID列表
 * @returns 消息ID到版本信息的映射，数据结构与单条接口一致
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;
  const { message_ids } = req.body;

  // 参数校验
  const idResult = validateId(id, "会话 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "会话 ID 校验失败");
  }

  const conversationId = id as string;

  if (!message_ids || !Array.isArray(message_ids)) {
    return sendWarnningResponse(res, "message_ids 必须是数组");
  }

  if (message_ids.length === 0) {
    return sendSuccessResponse(res, "获取成功", {});
  }

  // 限制单次请求的消息数量，防止滥用
  if (message_ids.length > 100) {
    return sendWarnningResponse(res, "单次最多查询 100 条消息的版本信息");
  }

  // 验证会话归属
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return sendWarnningResponse(res, "会话不存在");
  }
  if (conversation.user_id !== userId) {
    return sendWarnningResponse(res, "无权访问此会话");
  }

  // 批量获取版本信息
  const versionInfoMap = await batchGetMessageVersionInfo(message_ids, userId);

  return sendSuccessResponse(res, "获取成功", versionInfoMap);
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 POST 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "批量获取消息版本" })
);
