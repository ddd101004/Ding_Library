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
import {
  findUploadedPaperById,
  incrementPaperStats,
} from "@/db/ai-reading/uploadedPaper";
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

  // 如果是伴读对话，验证所有论文存在且属于当前用户
  type PaperInfo = NonNullable<Awaited<ReturnType<typeof findUploadedPaperById>>>;
  let papers: PaperInfo[] = [];
  let primaryPaper: PaperInfo | null = null;

  if (conversation_type === "paper_reading") {
    if (paperIds.length === 0) {
      return sendWarnningResponse(res, "伴读对话必须指定论文 ID");
    }

    // 验证所有论文
    for (const paperId of paperIds) {
      const paper = await findUploadedPaperById(paperId);
      if (!paper) {
        return sendWarnningResponse(res, `论文不存在: ${paperId}`);
      }
      if (paper.userId !== userId) {
        return sendWarnningResponse(res, "无权访问该论文");
      }
      papers.push(paper);
    }

    // 第一篇论文作为主论文（用于会话标题等）
    primaryPaper = papers[0];

    // 增加所有论文的阅读次数
    for (const paper of papers) {
      await incrementPaperStats({
        id: paper.id,
        read_count: 1,
        update_last_read: true,
      });
    }
  }

  // 生成对话标题
  let conversationTitle = title;
  if (!conversationTitle) {
    if (conversation_type === "paper_reading" && primaryPaper) {
      conversationTitle = `${primaryPaper.title.substring(0, 30)} 伴读`;
    } else {
      conversationTitle = "新对话";
    }
  }

  const conversation = await createConversation({
    user_id: userId,
    title: conversationTitle,
    model: model || process.env.LLM_MODEL!,
    is_deep_think: is_deep_think || false,
    context_window: context_window || 10,
    max_tokens: max_tokens || CONVERSATION_MAX_TOKENS,
    conversation_type,
    uploaded_paper_id:
      conversation_type === "paper_reading" && paperIds.length > 0 ? paperIds[0] : undefined,
    context_mode,
  });

  if (!conversation) {
    throw new Error("创建会话失败");
  }

  // 为伴读对话创建初始消息和附件，将所有论文存入 MessageAttachment
  // 注意：此消息仅用于关联论文，前端消息列表会过滤掉 content_type 为 paper_upload 的消息
  if (conversation_type === "paper_reading" && papers.length > 0) {
    const paperTitles = papers.map((p) => p.title).join("、");
    const initialMessage = await createUserMessage({
      conversation_id: conversation.conversation_id,
      content: `开始阅读论文：${paperTitles}`,
      message_order: 0,
      content_type: "paper_upload",
    });

    if (initialMessage) {
      await createAttachmentsFromPaperIds(initialMessage.message_id, paperIds);
    }
  }

  logger.info("创建对话成功", {
    conversationId: conversation.conversation_id,
    conversationType: conversation_type,
    paperIds: paperIds,
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

  // 如果是伴读对话，返回论文信息
  if (conversation_type === "paper_reading" && papers.length > 0) {
    // 返回所有论文信息
    const papersInfo = papers.map((paper) => {
      // 解析 JSON 字段
      let authors: string[] = [];
      let keywords: string[] = [];
      try {
        if (paper.authors) authors = JSON.parse(paper.authors);
        if (paper.keywords) keywords = JSON.parse(paper.keywords);
      } catch {
        // JSON 解析失败，保持默认空数组
      }

      return {
        id: paper.id,
        title: paper.title,
        authors,
        abstract: paper.abstract || "",
        keywords,
        file_name: paper.fileName,
        file_size: Number(paper.fileSize),
        file_type: paper.fileType,
        parse_status: paper.parseStatus,
        page_count: paper.pageCount,
        word_count: paper.wordCount,
      };
    });

    responseData.papers = papersInfo;
    // 保持向后兼容：paper_info 返回第一篇论文
    responseData.paper_info = papersInfo[0];
  }

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
  const { page, limit, search, conversation_type, uploaded_paper_id } = req.query;

  // 如果指定了论文 ID，验证论文归属
  if (uploaded_paper_id && typeof uploaded_paper_id === "string") {
    const paper = await findUploadedPaperById(uploaded_paper_id);
    if (!paper) {
      return sendWarnningResponse(res, "论文不存在");
    }
    if (paper.userId !== userId) {
      return sendWarnningResponse(res, "无权访问该论文");
    }
  }

  const result = await getConversationsByUserId({
    user_id: userId,
    page: parsePageNumber(page),
    limit: parseLimitParam(limit),
    search: search as string,
    conversation_type: conversation_type as
      | "general"
      | "paper_reading"
      | undefined,
    uploaded_paper_id: uploaded_paper_id as string | undefined,
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
