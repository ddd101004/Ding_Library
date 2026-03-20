import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  createConversation,
  getConversationsByUserId,
} from "@/db/chatConversation";
import { createUserMessage } from "@/db/chatMessage/crud";
import { createAttachmentsFromPaperIds } from "@/db/messageAttachment";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString, validateId } from "@/utils/validateString";
import logger from "@/helper/logger";
import { CONVERSATION_MAX_TOKENS } from "@/constants";

/**
 * POST - 创建新会话
 * 支持普通对话和 AI 伴读对话
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const {
    title,
    model,
    is_deep_think,
    context_window,
    max_tokens,
    // AI 伴读扩展参数
    conversation_type = "general",
    uploaded_paper_ids, // 支持多篇论文
    context_mode = "auto",
  } = req.body;
  // 参数校验
  if (title) {
    const titleResult = validateString(title, "对话标题", {
      limitKey: "conversation_title",
    });
    if (!titleResult.valid) {
      return sendWarnningResponse(res, titleResult.error || "对话标题校验失败");
    }
  }

  // 确保 uploaded_paper_ids 是数组
  const paperIds: string[] = Array.isArray(uploaded_paper_ids)
    ? uploaded_paper_ids
    : uploaded_paper_ids
    ? [uploaded_paper_ids]
    : [];

  // 校验所有论文 ID
  for (const paperId of paperIds) {
    const paperIdResult = validateId(paperId, "论文 ID");
    if (!paperIdResult.valid) {
      return sendWarnningResponse(res, paperIdResult.error || "论文 ID 校验失败");
    }
  }

  // 生成对话标题
  let conversationTitle = title;
  if (!conversationTitle) {
    conversationTitle = "新对话";
  }

  const conversation = await createConversation({
    user_id: userId,
    title: conversationTitle,
    model: model || process.env.LLM_MODEL!,
    is_deep_think: is_deep_think || false,
    context_window: context_window || 10,
    max_tokens: max_tokens || CONVERSATION_MAX_TOKENS,
    conversation_type,
    uploaded_paper_id: undefined,
    context_mode,
  });

  if (!conversation) {
    throw new Error("创建会话失败");
  }

  logger.info("创建对话成功", {
    conversationId: conversation.conversation_id,
    conversationType: conversation_type,
    userId,
  });

  // 构建响应数据
  const responseData: Record<string, unknown> = {
    conversation_id: conversation.conversation_id,
    user_id: conversation.user_id,
    title: conversation.title,
    model: conversation.model,
    is_deep_think: conversation.is_deep_think,
    is_pinned: conversation.is_pinned,
    context_window: conversation.context_window,
    max_tokens: conversation.max_tokens,
    message_count: conversation.message_count,
    last_message_at: conversation.last_message_at,
    create_time: conversation.create_time,
    // AI 伴读扩展字段
    conversation_type: conversation.conversationType,
    uploaded_paper_id: conversation.uploadedPaperId,
    context_mode: conversation.contextMode,
  };

  sendSuccessResponse(res, "会话创建成功", responseData);
};

/**
 * GET - 获取会话列表
 * 支持按对话类型筛选
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { page, limit, search, conversation_type } = req.query;

  const result = await getConversationsByUserId({
    user_id: userId,
    page: parsePageNumber(page),
    limit: parseLimitParam(limit),
    search: search as string,
    conversation_type: conversation_type as
      | "general"
      | "paper_reading"
      | undefined,
    uploaded_paper_id: undefined,
  });

  if (!result) {
    throw new Error("获取会话列表失败");
  }

  // 适配前端期望的数据结构
  const currentPage = parsePageNumber(page);
  const pageSize = parseLimitParam(limit);
  const totalItems = result.pagination?.total || 0;

  const responseData = {
    items: result.conversations || [],
    total: totalItems,
    page: currentPage,
    size: pageSize,
    has_more: currentPage * pageSize < totalItems,
  };

  sendSuccessResponse(res, "获取成功", responseData);
};

/**
 * 会话管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "会话管理", useLogger: true })
);
