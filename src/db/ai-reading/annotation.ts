/**
 * 论文标注数据库操作层
 *
 * 提供PaperAnnotation模型的CRUD操作
 * 所有数据库操作通过Prisma Proxy执行
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import { paginate } from "@/utils/paginate";

// ==================== 创建操作 ====================

/**
 * 创建标注
 */
export interface CreateAnnotationParams {
  user_id: string;
  uploaded_paper_id: string;
  annotation_text: string;
  annotation_type?: "highlight" | "underline" | "strikethrough" | "note";
  color?: string;
  page_number?: number;
  start_offset?: number; // 字符偏移（可选，基于坐标定位时不需要）
  end_offset?: number; // 字符偏移（可选，基于坐标定位时不需要）
  position_json?: object; // PDF坐标信息（基于坐标定位时使用）
  note?: string;
  tags?: string[]; // 标签数组
}

export async function createAnnotation(params: CreateAnnotationParams) {
  const {
    user_id,
    uploaded_paper_id,
    annotation_text,
    annotation_type = "highlight",
    color = "yellow",
    page_number,
    start_offset = 0,
    end_offset = 0,
    position_json,
    note,
    tags,
  } = params;

  try {
    const annotation = await prisma.paperAnnotation.create({
      data: {
        userId: user_id,
        uploadedPaperId: uploaded_paper_id,
        annotationText: annotation_text,
        annotationType: annotation_type,
        color,
        pageNumber: page_number,
        startOffset: start_offset,
        endOffset: end_offset,
        positionJson: position_json as Prisma.InputJsonValue,
        note,
        tags: tags as Prisma.InputJsonValue,
      },
    });

    logger.info("创建标注成功", {
      id: annotation.id,
      userId: user_id,
      paperId: uploaded_paper_id,
      type: annotation_type,
    });

    return annotation;
  } catch (error: any) {
    logger.error("创建标注失败", { error: error.message, params });
    return null;
  }
}

// ==================== 查询操作 ====================

/**
 * 获取标注列表参数
 */
export interface GetAnnotationsParams {
  uploaded_paper_id: string; // 论文ID（必填）
  user_id: string; // 用户ID（必填）
  annotation_type?: string; // 标注类型筛选
  color?: string; // 颜色筛选
  tags?: string[]; // 标签筛选
  page?: number; // 页码（默认1）
  size?: number; // 每页数量（默认20）
}

/**
 * 获取标注列表（按论文、颜色、标签筛选）
 */
export async function getAnnotations(params: GetAnnotationsParams) {
  const {
    uploaded_paper_id,
    user_id,
    annotation_type,
    color,
    tags,
    page = 1,
    size = 20,
  } = params;

  try {
    // 构建查询条件
    const where: Prisma.PaperAnnotationWhereInput = {
      uploadedPaperId: uploaded_paper_id,
      userId: user_id,
      deletedAt: null,
    };

    // 筛选标注类型
    if (annotation_type) {
      where.annotationType = annotation_type;
    }

    // 筛选颜色
    if (color) {
      where.color = color;
    }

    // 筛选标签（JSON数组包含查询）
    if (tags && tags.length > 0) {
      where.tags = {
        array_contains: tags as Prisma.JsonValue,
      };
    }

    // 执行分页查询（按创建时间倒序）
    const { skip, take } = paginate(page, size);

    const [annotations, total] = await Promise.all([
      prisma.paperAnnotation.findMany({
        where,
        orderBy: { createTime: "desc" },
        skip,
        take,
      }),
      prisma.paperAnnotation.count({ where }),
    ]);

    logger.info("获取标注列表成功", {
      paperId: uploaded_paper_id,
      userId: user_id,
      total,
    });

    return {
      data: annotations,
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  } catch (error: any) {
    logger.error("获取标注列表失败", { error: error.message, params });
    return null;
  }
}

/**
 * 根据ID获取单个标注
 */
export async function getAnnotationById(id: string) {
  try {
    const annotation = await prisma.paperAnnotation.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
    return annotation;
  } catch (error: any) {
    logger.error("根据ID获取标注失败", { error: error.message, id });
    return null;
  }
}

// ==================== 更新操作 ====================

/**
 * 更新标注
 */
export interface UpdateAnnotationParams {
  id: string;
  color?: string;
  note?: string;
  tags?: string[];
  annotation_type?: string;
}

export async function updateAnnotation(params: UpdateAnnotationParams) {
  const { id, color, note, tags, annotation_type } = params;

  try {
    const data: Prisma.PaperAnnotationUpdateInput = {};

    if (color !== undefined) data.color = color;
    if (note !== undefined) data.note = note;
    if (tags !== undefined) data.tags = tags as Prisma.InputJsonValue;
    if (annotation_type !== undefined) data.annotationType = annotation_type;

    const annotation = await prisma.paperAnnotation.update({
      where: { id },
      data,
    });

    logger.info("更新标注成功", { id, fields: Object.keys(data) });

    return annotation;
  } catch (error: any) {
    logger.error("更新标注失败", { error: error.message, params });
    return null;
  }
}

// ==================== 删除操作 ====================

/**
 * 软删除标注
 */
export async function deleteAnnotation(id: string) {
  try {
    const annotation = await prisma.paperAnnotation.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    logger.info("软删除标注成功", { id });

    return annotation;
  } catch (error: any) {
    logger.error("软删除标注失败", { error: error.message, id });
    return null;
  }
}

/**
 * 批量删除标注（软删除）
 */
export async function batchDeleteAnnotations(ids: string[]) {
  try {
    const result = await prisma.paperAnnotation.updateMany({
      where: {
        id: { in: ids },
      },
      data: {
        deletedAt: new Date(),
      },
    });

    logger.info("批量软删除标注成功", { count: result.count, ids });

    return result;
  } catch (error: any) {
    logger.error("批量软删除标注失败", { error: error.message, ids });
    return null;
  }
}

// ==================== 统计操作 ====================

/**
 * 获取论文的标注统计
 */
export async function getAnnotationStats(uploaded_paper_id: string) {
  try {
    const stats = await prisma.paperAnnotation.groupBy({
      by: ["color", "annotationType"],
      where: {
        uploadedPaperId: uploaded_paper_id,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    logger.info("获取标注统计成功", { paperId: uploaded_paper_id });

    return stats;
  } catch (error: any) {
    logger.error("获取标注统计失败", {
      error: error.message,
      paperId: uploaded_paper_id,
    });
    return null;
  }
}
