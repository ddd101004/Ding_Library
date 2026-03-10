import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  upsertReadingRecord,
  getUserReadingStats,
} from "@/db/ai-reading/readingRecord";
import { findUploadedPaperById } from "@/db/ai-reading/uploadedPaper";
import logger from "@/helper/logger";
import { validateId } from "@/utils/validateString";

/**
 * PUT - 更新阅读进度
 */
const handlePut = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const {
    uploaded_paper_id,
    current_page,
    total_pages,
    scroll_position,
    progress_percentage,
    reading_duration_seconds,
    annotation_created,
    citation_created,
    translation_used,
    ai_question_asked,
  } = req.body;

  // 参数验证
  const paperIdResult = validateId(uploaded_paper_id, "论文 ID");
  if (!paperIdResult.valid) {
    return sendWarnningResponse(res, paperIdResult.error || "论文 ID 校验失败");
  }

  // 验证论文存在且属于当前用户
  const paper = await findUploadedPaperById(uploaded_paper_id);
  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }
  if (paper.userId !== userId) {
    return sendWarnningResponse(res, "无权操作该论文");
  }

  // 更新阅读记录
  const record = await upsertReadingRecord({
    user_id: userId,
    uploaded_paper_id,
    current_page,
    total_pages,
    scroll_position,
    progress_percentage,
    reading_duration_seconds,
    annotation_created,
    citation_created,
    translation_used,
    ai_question_asked,
  });

  if (!record) {
    throw new Error("更新阅读记录失败");
  }

  logger.info("更新阅读记录成功", {
    paperId: uploaded_paper_id,
    userId,
    currentPage: current_page,
    progress: progress_percentage,
  });

  return sendSuccessResponse(res, "更新成功", {
    id: record.id,
    uploaded_paper_id: record.uploadedPaperId,
    current_page: record.currentPage,
    total_pages: record.totalPages,
    scroll_position: record.scrollPosition,
    progress_percentage: Number(record.progressPercentage),
    reading_duration_seconds: Number(record.readingDurationSeconds),
    annotation_created: record.annotationCreated,
    citation_created: record.citationCreated,
    translation_used: record.translationUsed,
    ai_question_asked: record.aiQuestionAsked,
    update_time: record.updateTime,
  });
};

/**
 * GET - 获取用户阅读统计
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const stats = await getUserReadingStats(userId);

  if (!stats) {
    throw new Error("获取阅读统计失败");
  }

  return sendSuccessResponse(res, "获取成功", stats);
};

/**
 * 阅读记录 API 路由
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "PUT") {
    return await handlePut(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 和 PUT 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "阅读记录", useLogger: true })
);
