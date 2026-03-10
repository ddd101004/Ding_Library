import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { createAnnotation, getAnnotations } from "@/db/ai-reading/annotation";
import {
  findUploadedPaperById,
  incrementPaperStats,
} from "@/db/ai-reading/uploadedPaper";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import logger from "@/helper/logger";
import { validateString, validateId } from "@/utils/validateString";

/**
 * POST - 创建标注
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const {
    uploaded_paper_id,
    annotation_text,
    annotation_type = "highlight",
    color = "blue",
    page_number,
    position_json,
    note,
    tags,
  } = req.body;

  // 参数验证
  const paperIdResult = validateId(uploaded_paper_id, "论文 ID");
  if (!paperIdResult.valid) {
    return sendWarnningResponse(res, paperIdResult.error || "论文 ID 校验失败");
  }

  const textResult = validateString(annotation_text, "标注文本", { max: 5000 });
  if (!textResult.valid) {
    return sendWarnningResponse(res, textResult.error || "标注文本校验失败");
  }

  // 校验 note（如果提供）
  if (note) {
    const noteResult = validateString(note, "笔记", { max: 2000, required: false });
    if (!noteResult.valid) {
      return sendWarnningResponse(res, noteResult.error || "笔记校验失败");
    }
  }

  // 坐标信息验证
  if (!position_json || !Array.isArray(position_json) || position_json.length === 0) {
    return sendWarnningResponse(res, "标注坐标信息不能为空");
  }

  // 验证论文存在且属于当前用户
  const paper = await findUploadedPaperById(uploaded_paper_id);
  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }
  if (paper.userId !== userId) {
    return sendWarnningResponse(res, "无权操作该论文");
  }

  // 创建标注
  const annotation = await createAnnotation({
    user_id: userId,
    uploaded_paper_id,
    annotation_text,
    annotation_type,
    color,
    page_number,
    position_json,
    note,
    tags,
  });

  if (!annotation) {
    throw new Error("创建标注失败");
  }

  // 更新论文标注计数
  await incrementPaperStats({
    id: uploaded_paper_id,
    annotation_count: 1,
  });

  logger.info("创建标注成功", {
    annotationId: annotation.id,
    paperId: uploaded_paper_id,
    userId,
  });

  return sendSuccessResponse(res, "创建成功", {
    id: annotation.id,
    uploaded_paper_id: annotation.uploadedPaperId,
    annotation_text: annotation.annotationText,
    annotation_type: annotation.annotationType,
    color: annotation.color,
    page_number: annotation.pageNumber,
    position_json: annotation.positionJson,
    note: annotation.note,
    tags: annotation.tags,
    create_time: annotation.createTime,
  });
};

/**
 * GET - 获取标注列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { uploaded_paper_id, annotation_type, color, tags, page, size } =
    req.query;

  // 参数验证
  const paperIdResult = validateId(uploaded_paper_id, "论文 ID");
  if (!paperIdResult.valid) {
    return sendWarnningResponse(res, paperIdResult.error || "论文 ID 校验失败");
  }

  // 验证论文存在且属于当前用户
  const paper = await findUploadedPaperById(uploaded_paper_id as string);
  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }
  if (paper.userId !== userId) {
    return sendWarnningResponse(res, "无权访问该论文");
  }

  // 解析标签参数
  let tagsArray: string[] | undefined;
  if (tags && typeof tags === "string") {
    tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);
  }

  // 获取标注列表
  const result = await getAnnotations({
    uploaded_paper_id: uploaded_paper_id as string,
    user_id: userId,
    annotation_type: annotation_type as string | undefined,
    color: color as string | undefined,
    tags: tagsArray,
    page: parsePageNumber(page),
    size: parseLimitParam(size),
  });

  if (!result) {
    throw new Error("获取标注列表失败");
  }

  // 格式化返回数据
  const items = result.data.map((annotation) => ({
    id: annotation.id,
    uploaded_paper_id: annotation.uploadedPaperId,
    annotation_text: annotation.annotationText,
    annotation_type: annotation.annotationType,
    color: annotation.color,
    page_number: annotation.pageNumber,
    position_json: annotation.positionJson,
    note: annotation.note,
    tags: annotation.tags,
    create_time: annotation.createTime,
    update_time: annotation.updateTime,
  }));

  return sendSuccessResponse(res, "获取成功", {
    total: result.total,
    page: result.page,
    size: result.pageSize,
    items,
  });
};

/**
 * 标注管理 API 路由
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
    return sendMethodNotAllowedResponse(res, "仅支持 GET 和 POST 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "标注管理", useLogger: true })
);
