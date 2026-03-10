import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  getAnnotationById,
  updateAnnotation,
  deleteAnnotation,
} from "@/db/ai-reading/annotation";
import logger from "@/helper/logger";
import { validateString, validateId } from "@/utils/validateString";

/**
 * GET - 获取标注详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "标注 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "标注 ID 校验失败");
  }

  const annotation = await getAnnotationById(id as string);

  if (!annotation) {
    return sendWarnningResponse(res, "标注不存在");
  }

  // 验证所有权
  if (annotation.userId !== userId) {
    return sendWarnningResponse(res, "无权访问该标注");
  }

  return sendSuccessResponse(res, "获取成功", {
    id: annotation.id,
    uploaded_paper_id: annotation.uploadedPaperId,
    annotation_text: annotation.annotationText,
    annotation_type: annotation.annotationType,
    color: annotation.color,
    page_number: annotation.pageNumber,
    start_offset: annotation.startOffset,
    end_offset: annotation.endOffset,
    position_json: annotation.positionJson,
    note: annotation.note,
    tags: annotation.tags,
    create_time: annotation.createTime,
    update_time: annotation.updateTime,
  });
};

/**
 * PUT - 更新标注
 */
const handlePut = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;
  const { color, note, tags, annotation_type } = req.body;

  // 参数校验
  const idResult = validateId(id, "标注 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "标注 ID 校验失败");
  }

  // 校验 note（如果提供）
  if (note !== undefined) {
    const noteResult = validateString(note, "笔记", { max: 2000, required: false });
    if (!noteResult.valid) {
      return sendWarnningResponse(res, noteResult.error || "笔记校验失败");
    }
  }

  // 验证标注存在且属于当前用户
  const annotation = await getAnnotationById(id as string);

  if (!annotation) {
    return sendWarnningResponse(res, "标注不存在");
  }

  if (annotation.userId !== userId) {
    return sendWarnningResponse(res, "无权更新该标注");
  }

  // 执行更新
  const result = await updateAnnotation({
    id: id as string,
    color,
    note,
    tags,
    annotation_type,
  });

  if (!result) {
    throw new Error("更新标注失败");
  }

  logger.info("更新标注成功", { annotationId: id, userId });

  return sendSuccessResponse(res, "更新成功", {
    id: result.id,
    color: result.color,
    note: result.note,
    tags: result.tags,
    annotation_type: result.annotationType,
    update_time: result.updateTime,
  });
};

/**
 * DELETE - 删除标注（软删除）
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "标注 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "标注 ID 校验失败");
  }

  // 验证标注存在且属于当前用户
  const annotation = await getAnnotationById(id as string);

  if (!annotation) {
    return sendWarnningResponse(res, "标注不存在");
  }

  if (annotation.userId !== userId) {
    return sendWarnningResponse(res, "无权删除该标注");
  }

  // 执行软删除
  const result = await deleteAnnotation(id as string);

  if (!result) {
    throw new Error("删除标注失败");
  }

  logger.info("删除标注成功", { annotationId: id, userId });

  return sendSuccessResponse(res, "删除成功");
};

/**
 * 标注详情 API 路由
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else if (req.method === "PUT") {
    return await handlePut(req, res, userId);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(
      res,
      "仅支持 GET、PUT 和 DELETE 请求"
    );
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "标注详情", useLogger: true })
);
