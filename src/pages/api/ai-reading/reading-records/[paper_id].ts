import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getReadingRecord } from "@/db/ai-reading/readingRecord";
import { findUploadedPaperById } from "@/db/ai-reading/uploadedPaper";
import { validateId } from "@/utils/validateString";

/**
 * GET - 获取单个论文的阅读记录
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { paper_id } = req.query;

  // 参数校验
  const idResult = validateId(paper_id, "论文 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "论文 ID 校验失败");
  }

  // 验证论文存在且属于当前用户
  const paper = await findUploadedPaperById(paper_id as string);
  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }
  if (paper.userId !== userId) {
    return sendWarnningResponse(res, "无权访问该论文");
  }

  // 获取阅读记录
  const record = await getReadingRecord(userId, paper_id as string);

  if (!record) {
    // 返回空记录（论文未被阅读过）
    return sendSuccessResponse(res, "获取成功", {
      uploaded_paper_id: paper_id,
      current_page: 1,
      total_pages: paper.pageCount,
      scroll_position: 0,
      progress_percentage: 0,
      reading_duration_seconds: 0,
      annotation_created: 0,
      citation_created: 0,
      translation_used: 0,
      ai_question_asked: 0,
      create_time: null,
      update_time: null,
    });
  }

  return sendSuccessResponse(res, "获取成功", {
    id: record.id,
    uploaded_paper_id: record.uploadedPaperId,
    current_page: record.currentPage,
    total_pages: record.totalPages,
    scroll_position: record.scrollPosition,
    progress_percentage: Number(record.progressPercentage),
    reading_duration_seconds: Number(record.readingDurationSeconds),
    session_start_at: record.sessionStartAt,
    session_end_at: record.sessionEndAt,
    annotation_created: record.annotationCreated,
    citation_created: record.citationCreated,
    translation_used: record.translationUsed,
    ai_question_asked: record.aiQuestionAsked,
    create_time: record.createTime,
    update_time: record.updateTime,
  });
};

/**
 * 阅读记录详情 API 路由
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
  withErrorHandler(handler, { logPrefix: "阅读记录详情" })
);
