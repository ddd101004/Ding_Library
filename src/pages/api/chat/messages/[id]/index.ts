import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getMessageById, updateMessage, deleteMessage } from "@/db/chatMessage";
import { verifyConversationOwner } from "@/db/chatConversation";
import { validateId, validateString } from "@/utils/validateString";

/**
 * GET - 获取单个消息详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  id: string
) => {
  const message = await getMessageById(id, userId);

  if (!message) {
    sendWarnningResponse(res, "消息不存在");
    return;
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    message.conversation_id,
    userId
  );
  if (!isOwner) {
    sendWarnningResponse(res, "无权访问此消息");
    return;
  }

  sendSuccessResponse(res, "获取成功", message);
};

/**
 * PATCH - 更新消息
 */
const handlePatch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  id: string
) => {
  const { content } = req.body;

  // 参数校验
  const contentResult = validateString(content, "消息内容", { limitKey: "message_content" });
  if (!contentResult.valid) {
    sendWarnningResponse(res, contentResult.error || "消息内容校验失败");
    return;
  }

  // 先获取消息以验证权限
  const existingMessage = await getMessageById(id);
  if (!existingMessage) {
    sendWarnningResponse(res, "消息不存在");
    return;
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    existingMessage.conversation_id,
    userId
  );
  if (!isOwner) {
    sendWarnningResponse(res, "无权修改此消息");
    return;
  }

  // 更新消息
  const updatedMessage = await updateMessage(id, { content });

  if (!updatedMessage) {
    throw new Error("更新消息失败");
  }

  sendSuccessResponse(res, "更新成功", updatedMessage);
};

/**
 * DELETE - 删除消息
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  id: string
) => {
  // 先获取消息以验证权限
  const existingMessage = await getMessageById(id);
  if (!existingMessage) {
    sendWarnningResponse(res, "消息不存在");
    return;
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    existingMessage.conversation_id,
    userId
  );
  if (!isOwner) {
    sendWarnningResponse(res, "无权删除此消息");
    return;
  }

  // 删除消息
  const deletedMessage = await deleteMessage(id);

  if (!deletedMessage) {
    throw new Error("删除消息失败");
  }

  sendSuccessResponse(res, "删除成功");
};

/**
 * 消息详情 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "消息 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "消息 ID 校验失败");
  }

  if (req.method === "GET") {
    return await handleGet(req, res, userId, id as string);
  } else if (req.method === "PATCH") {
    return await handlePatch(req, res, userId, id as string);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId, id as string);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET、PATCH和DELETE请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "消息详情" })
);
