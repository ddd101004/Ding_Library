import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  getConversationById,
  updateConversation,
  deleteConversation,
  verifyConversationOwner,
} from "@/db/chatConversation";
import { getConversationPapers } from "@/db/messageAttachment";
import { getFileUrl } from "@/lib/cos/cosClient";
import { validateId, validateString } from "@/utils/validateString";

/**
 * GET - 获取会话详情
 * 支持普通对话和 AI 伴读对话，伴读对话会返回关联的所有论文列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  conversation_id: string
) => {
  const conversation = await getConversationById(conversation_id);

  if (!conversation) {
    sendWarnningResponse(res, "会话不存在");
    return;
  }

  // 构建响应数据
  const responseData: Record<string, unknown> = {
    conversation_id: conversation.conversation_id,
    title: conversation.title,
    model: conversation.model,
    is_deep_think: conversation.is_deep_think,
    is_pinned: conversation.is_pinned,
    context_window: conversation.context_window,
    max_tokens: conversation.max_tokens,
    message_count: conversation.message_count,
    create_time: conversation.create_time,
    update_time: conversation.update_time,
    // AI 伴读扩展字段
    conversation_type: conversation.conversationType,
    uploaded_paper_id: conversation.uploadedPaperId,
    context_mode: conversation.contextMode,
  };

  // 如果是伴读对话，返回所有关联的论文列表
  if (conversation.conversationType === "paper_reading") {
    // 获取会话中所有关联的论文（通过 MessageAttachment）
    const papers = await getConversationPapers(conversation_id);

    // 为每篇论文添加签名 URL
    responseData.papers = papers.map((paper) => ({
      ...paper,
      file_url: paper.file_path ? getFileUrl(paper.file_path) : null,
    }));
  }

  sendSuccessResponse(res, "获取成功", responseData);
};

/**
 * PATCH - 更新会话
 */
const handlePatch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  conversation_id: string
) => {
  const { title, is_pinned, is_deep_think, context_window, max_tokens } =
    req.body;

  // 参数校验
  if (title !== undefined) {
    const titleResult = validateString(title, "标题", { limitKey: "conversation_title", required: false });
    if (!titleResult.valid) {
      return sendWarnningResponse(res, titleResult.error || "标题校验失败");
    }
  }

  const updateData: Record<string, unknown> = {};

  if (title !== undefined) updateData.title = title;
  if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
  if (is_deep_think !== undefined) updateData.is_deep_think = is_deep_think;
  if (context_window !== undefined) updateData.context_window = context_window;
  if (max_tokens !== undefined) updateData.max_tokens = max_tokens;

  const conversation = await updateConversation(conversation_id, updateData);

  if (!conversation) {
    throw new Error("更新失败");
  }

  sendSuccessResponse(res, "更新成功", {
    conversation_id: conversation.conversation_id,
    title: conversation.title,
    is_pinned: conversation.is_pinned,
    update_time: conversation.update_time,
  });
};

/**
 * DELETE - 删除会话
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  conversation_id: string
) => {
  const conversation = await deleteConversation(conversation_id);

  if (!conversation) {
    throw new Error("删除失败");
  }

  sendSuccessResponse(res, "删除成功");
};

/**
 * 会话详情 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "会话 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "会话 ID 校验失败");
  }

  const conversation_id = id as string;

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(conversation_id, userId);
  if (!isOwner) {
    return sendWarnningResponse(res, "无权访问此会话");
  }

  if (req.method === "GET") {
    return await handleGet(req, res, userId, conversation_id);
  } else if (req.method === "PATCH") {
    return await handlePatch(req, res, userId, conversation_id);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId, conversation_id);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET、PATCH和DELETE请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "会话详情", useLogger: true })
);
