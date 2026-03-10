/**
 * 用户上传论文数据库操作层
 *
 * 提供UserUploadedPaper模型的CRUD操作
 * 所有数据库操作通过Prisma Proxy执行
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import { paginate } from "@/utils/paginate";

// ==================== 创建操作 ====================

/**
 * 创建上传论文记录参数
 */
export interface CreateUploadedPaperParams {
  user_id: string;
  title: string;
  authors?: string | null;
  abstract?: string | null;
  keywords?: string | null;
  publication_year?: number | null;
  source?: string | null;
  doi?: string | null;
  file_path: string;
  file_name: string;
  file_size: bigint;
  file_type: string;
  mime_type: string;
  parse_status?: string;
}

/**
 * 创建上传论文记录
 */
export async function createUploadedPaper(params: CreateUploadedPaperParams) {
  try {
    const paper = await prisma.userUploadedPaper.create({
      data: {
        userId: params.user_id,
        title: params.title,
        authors: params.authors,
        abstract: params.abstract,
        keywords: params.keywords,
        publicationYear: params.publication_year,
        source: params.source,
        doi: params.doi,
        filePath: params.file_path,
        fileName: params.file_name,
        fileSize: params.file_size,
        fileType: params.file_type,
        mimeType: params.mime_type,
        parseStatus: params.parse_status || "pending",
      },
    });
    logger.info("创建上传论文记录成功", {
      id: paper.id,
      userId: paper.userId,
      title: paper.title,
      fileName: paper.fileName,
    });
    return paper;
  } catch (error: any) {
    logger.error("创建上传论文记录失败", { error: error.message, params });
    return null;
  }
}

// ==================== 查询操作 ====================

/**
 * 根据ID查询论文详情
 */
export async function findUploadedPaperById(id: string) {
  try {
    const paper = await prisma.userUploadedPaper.findFirst({
      where: {
        id,
        deletedAt: null, // 仅查询未删除的论文
      },
    });
    return paper;
  } catch (error: any) {
    logger.error("根据ID查询上传论文失败", { error: error.message, id });
    return null;
  }
}

/**
 * 根据 COS Key 查询论文（用于防止重复上传）
 */
export async function findUploadedPaperByCosKey(
  userId: string,
  cosKey: string
) {
  try {
    const paper = await prisma.userUploadedPaper.findFirst({
      where: {
        userId,
        filePath: cosKey,
        deletedAt: null,
      },
    });
    return paper;
  } catch (error: any) {
    logger.error("根据 COS Key 查询论文失败", {
      error: error.message,
      userId,
      cosKey,
    });
    return null;
  }
}

/**
 * 获取论文列表参数
 */
export interface GetUploadedPapersParams {
  user_id: string; // 用户ID（必填）
  page?: number; // 页码（默认1）
  size?: number; // 每页数量（默认10）
  sort_by?: "create_time" | "last_read_at" | "title"; // 排序字段
  order?: "asc" | "desc"; // 排序方式
  parse_status?: "pending" | "parsing" | "completed" | "failed"; // 解析状态筛选
  keyword?: string; // 搜索关键词（标题或作者）
}

/**
 * 获取用户上传的论文列表（分页、筛选、排序）
 */
export async function getUploadedPapers(params: GetUploadedPapersParams) {
  const {
    user_id,
    page = 1,
    size = 10,
    sort_by = "create_time",
    order = "desc",
    parse_status,
    keyword,
  } = params;

  try {
    // 构建查询条件
    const where: Prisma.UserUploadedPaperWhereInput = {
      userId: user_id,
      deletedAt: null,
    };

    // 筛选解析状态
    if (parse_status) {
      where.parseStatus = parse_status;
    }

    // 关键词搜索（标题或作者）
    if (keyword && keyword.trim() !== "") {
      where.OR = [
        { title: { contains: keyword.trim() } },
        { authors: { contains: keyword.trim() } },
      ];
    }

    // 构建排序
    const orderBy: Prisma.UserUploadedPaperOrderByWithRelationInput = {};
    if (sort_by === "create_time") {
      orderBy.createTime = order;
    } else if (sort_by === "last_read_at") {
      orderBy.lastReadAt = order;
    } else if (sort_by === "title") {
      orderBy.title = order;
    }

    // 执行分页查询
    const { skip, take } = paginate(page, size);

    const [papers, total] = await Promise.all([
      prisma.userUploadedPaper.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.userUploadedPaper.count({ where }),
    ]);

    logger.info("获取上传论文列表成功", {
      userId: user_id,
      total,
      page,
      size,
    });

    return {
      data: papers,
      total,
      page,
      pageSize: size,
      totalPages: Math.ceil(total / size),
    };
  } catch (error: any) {
    logger.error("获取上传论文列表失败", { error: error.message, params });
    return null;
  }
}

// ==================== 更新操作 ====================

/**
 * 更新论文信息（标题、作者、摘要等）
 */
export async function updateUploadedPaper(
  id: string,
  data: Prisma.UserUploadedPaperUpdateInput
) {
  try {
    const paper = await prisma.userUploadedPaper.update({
      where: { id },
      data,
    });
    logger.info("更新论文信息成功", { id, fields: Object.keys(data) });
    return paper;
  } catch (error: any) {
    logger.error("更新论文信息失败", { error: error.message, id, data });
    return null;
  }
}

/**
 * 更新论文解析状态
 */
export interface UpdateParseStatusParams {
  id: string;
  parse_status: "pending" | "parsing" | "completed" | "failed";
  parsed_content?: string; // 解析后的内容
  page_count?: number; // 页数
  word_count?: number; // 字数
  parse_error?: string; // 解析错误信息
  parsed_at?: Date; // 解析完成时间
}

export async function updateParseStatus(params: UpdateParseStatusParams) {
  const {
    id,
    parse_status,
    parsed_content,
    page_count,
    word_count,
    parse_error,
    parsed_at,
  } = params;

  try {
    const data: Prisma.UserUploadedPaperUpdateInput = {
      parseStatus: parse_status,
    };

    if (parsed_content !== undefined) data.parsedContent = parsed_content;
    if (page_count !== undefined) data.pageCount = page_count;
    if (word_count !== undefined) data.wordCount = word_count;
    if (parse_error !== undefined) data.parseError = parse_error;
    if (parsed_at !== undefined) data.parsedAt = parsed_at;

    const paper = await prisma.userUploadedPaper.update({
      where: { id },
      data,
    });

    logger.info("更新解析状态成功", {
      id,
      parseStatus: parse_status,
      pageCount: page_count,
      wordCount: word_count,
    });

    return paper;
  } catch (error: any) {
    logger.error("更新解析状态失败", { error: error.message, params });
    return null;
  }
}

/**
 * 增加论文统计数据
 */
export interface IncrementPaperStatsParams {
  id: string;
  read_count?: number; // 增加阅读次数
  conversation_count?: number; // 增加对话次数
  annotation_count?: number; // 增加标注数量
  citation_count?: number; // 增加引用数量
  update_last_read?: boolean; // 是否更新最后阅读时间
}

export async function incrementPaperStats(params: IncrementPaperStatsParams) {
  const {
    id,
    read_count = 0,
    conversation_count = 0,
    annotation_count = 0,
    citation_count = 0,
    update_last_read = false,
  } = params;

  try {
    const data: Prisma.UserUploadedPaperUpdateInput = {};

    if (read_count > 0) {
      data.readCount = { increment: read_count };
    }
    if (conversation_count > 0) {
      data.conversationCount = { increment: conversation_count };
    }
    if (annotation_count > 0) {
      data.annotationCount = { increment: annotation_count };
    }
    if (citation_count > 0) {
      data.citationCount = { increment: citation_count };
    }
    if (update_last_read) {
      data.lastReadAt = new Date();
    }

    const paper = await prisma.userUploadedPaper.update({
      where: { id },
      data,
    });

    logger.info("增加论文统计数据成功", {
      id,
      read_count,
      conversation_count,
      annotation_count,
      citation_count,
    });

    return paper;
  } catch (error: any) {
    logger.error("增加论文统计数据失败", { error: error.message, params });
    return null;
  }
}

// ==================== 删除操作 ====================

/**
 * 软删除论文（设置deleted_at时间戳）
 */
export async function deleteUploadedPaper(id: string) {
  try {
    const paper = await prisma.userUploadedPaper.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    logger.info("软删除论文成功", { id });
    return paper;
  } catch (error: any) {
    logger.error("软删除论文失败", { error: error.message, id });
    return null;
  }
}

/**
 * 永久删除论文（仅用于管理操作，慎用）
 */
export async function permanentlyDeleteUploadedPaper(id: string) {
  try {
    const paper = await prisma.userUploadedPaper.delete({
      where: { id },
    });
    logger.warn("永久删除论文", { id });
    return paper;
  } catch (error: any) {
    logger.error("永久删除论文失败", { error: error.message, id });
    return null;
  }
}

// ==================== 统计操作 ====================

/**
 * 获取用户的论文统计信息
 */
export async function getUserPaperStats(user_id: string) {
  try {
    const stats = await prisma.userUploadedPaper.aggregate({
      where: {
        userId: user_id,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
      _sum: {
        readCount: true,
        conversationCount: true,
        annotationCount: true,
        citationCount: true,
      },
    });

    logger.info("获取用户论文统计信息成功", { userId: user_id });

    return {
      total_papers: stats._count.id,
      total_reads: stats._sum.readCount || 0,
      total_conversations: stats._sum.conversationCount || 0,
      total_annotations: stats._sum.annotationCount || 0,
      total_citations: stats._sum.citationCount || 0,
    };
  } catch (error: any) {
    logger.error("获取用户论文统计信息失败", {
      error: error.message,
      userId: user_id,
    });
    return null;
  }
}

/**
 * 根据 ID 列表批量查询论文
 * 用于普通聊天场景，根据附件 ID 获取论文内容
 *
 * @param ids 论文 ID 列表
 * @returns 论文列表（包含解析内容）
 */
export async function findUploadedPapersByIds(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return [];
    }

    const papers = await prisma.userUploadedPaper.findMany({
      where: {
        id: { in: ids },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileType: true,
        parseStatus: true,
        parsedContent: true,
      },
    });

    logger.info("批量查询论文成功", {
      requestedIds: ids.length,
      foundCount: papers.length,
    });

    return papers;
  } catch (error: any) {
    logger.error("批量查询论文失败", { error: error.message, ids });
    return [];
  }
}
