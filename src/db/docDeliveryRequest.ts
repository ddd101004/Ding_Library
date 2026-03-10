import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import { getStatusText } from "@/service/docDelivery";

// ==================== 类型定义 ====================

/**
 * 创建全文传递请求参数
 */
export interface CreateDocDeliveryRequestParams {
  user_id: string;
  task_id: string;
  paper_id?: string;
  title: string;
  authors?: string[];
  publication_name?: string;
  publication_year?: number;
  abstract?: string;
  doi?: string;
  tags?: string[];
  subject_category?: string;
  article_type?: string;
}

/**
 * 更新全文传递请求参数
 */
export interface UpdateDocDeliveryRequestParams {
  status?: number;
  status_text?: string;
  fulltext_url?: string;
  lib_attach_id?: string;
  completed_time?: Date;
}

// ==================== 创建操作 ====================

/**
 * 创建全文传递请求记录
 */
export const createDocDeliveryRequest = async (
  params: CreateDocDeliveryRequestParams
) => {
  try {
    const request = await prisma.docDeliveryRequest.create({
      data: {
        user_id: params.user_id,
        task_id: params.task_id,
        paper_id: params.paper_id,
        title: params.title,
        authors: params.authors,
        publication_name: params.publication_name,
        publication_year: params.publication_year,
        abstract: params.abstract,
        doi: params.doi,
        tags: params.tags,
        subject_category: params.subject_category,
        article_type: params.article_type,
        status: 1, // 提交中
        status_text: getStatusText(1),
      },
    });

    logger.info("创建全文传递请求成功", {
      requestId: request.id,
      taskId: params.task_id,
      userId: params.user_id,
    });

    return request;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`创建全文传递请求失败: ${errorMessage}`, { error, params });
    return null;
  }
};

// ==================== 查询操作 ====================

/**
 * 根据 ID 获取请求
 */
export const getDocDeliveryRequestById = async (id: string) => {
  try {
    const request = await prisma.docDeliveryRequest.findUnique({
      where: { id },
      include: {
        paper: {
          select: {
            id: true,
            title: true,
            source: true,
            source_id: true,
          },
        },
      },
    });
    return request;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取全文传递请求失败: ${errorMessage}`, { error });
    return null;
  }
};

/**
 * 根据任务ID获取请求
 */
export const getDocDeliveryRequestByTaskId = async (taskId: string) => {
  try {
    const request = await prisma.docDeliveryRequest.findFirst({
      where: { task_id: taskId },
    });
    return request;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取全文传递请求失败: ${errorMessage}`, { error });
    return null;
  }
};

/**
 * 获取用户的全文传递请求列表
 */
export const getDocDeliveryRequestsByUser = async (
  userId: string,
  options: {
    status?: "all" | "pending" | "completed";
    page?: number;
    limit?: number;
  } = {}
) => {
  const { status = "all", page = 1, limit = 20 } = options;

  try {
    // 构建查询条件
    const where: Prisma.DocDeliveryRequestWhereInput = {
      user_id: userId,
    };

    // 状态筛选
    if (status === "pending") {
      // 进行中：状态 1-4
      where.status = { in: [1, 2, 3, 4] };
    } else if (status === "completed") {
      // 已完成：状态 8 或 9
      where.status = { in: [8, 9] };
    }

    // 查询总数
    const total = await prisma.docDeliveryRequest.count({ where });

    // 查询数据
    const items = await prisma.docDeliveryRequest.findMany({
      where,
      orderBy: { create_time: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        paper: {
          select: {
            id: true,
            source: true,
            source_id: true,
          },
        },
      },
    });

    return {
      items,
      total,
      page,
      limit,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取全文传递列表失败: ${errorMessage}`, { error });
    return {
      items: [],
      total: 0,
      page,
      limit,
    };
  }
};

// ==================== 更新操作 ====================

/**
 * 更新全文传递请求状态
 */
export const updateDocDeliveryRequest = async (
  id: string,
  params: UpdateDocDeliveryRequestParams
) => {
  try {
    const request = await prisma.docDeliveryRequest.update({
      where: { id },
      data: {
        ...params,
        status_text: params.status !== undefined ? getStatusText(params.status) : undefined,
      },
    });

    logger.info("更新全文传递请求成功", {
      requestId: id,
      status: params.status,
    });

    return request;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`更新全文传递请求失败: ${errorMessage}`, { error });
    return null;
  }
};

/**
 * 根据任务ID更新状态
 */
export const updateDocDeliveryRequestByTaskId = async (
  taskId: string,
  params: UpdateDocDeliveryRequestParams
) => {
  try {
    const request = await prisma.docDeliveryRequest.updateMany({
      where: { task_id: taskId },
      data: {
        ...params,
        status_text: params.status !== undefined ? getStatusText(params.status) : undefined,
      },
    });

    logger.info("更新全文传递请求成功", {
      taskId,
      count: request.count,
    });

    return request;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`更新全文传递请求失败: ${errorMessage}`, { error });
    return null;
  }
};

// ==================== 批量查询操作 ====================

/**
 * 文献传递状态信息
 */
export interface DocDeliveryStatus {
  request_id: string;
  status: number;
  status_text: string | null;
  fulltext_url: string | null;
  create_time: Date;
}

/**
 * 批量查询论文的文献传递状态
 * 用于在返回相关论文时附带传递状态
 *
 * @param userId 用户 ID
 * @param paperIds 论文 ID 列表
 * @returns paper_id -> DocDeliveryStatus 的映射
 */
export const batchGetDocDeliveryStatusByPaperIds = async (
  userId: string,
  paperIds: string[]
): Promise<Record<string, DocDeliveryStatus>> => {
  if (!paperIds || paperIds.length === 0) {
    return {};
  }

  try {
    // 查询这些论文对应的传递请求（只取最新的一条）
    const requests = await prisma.docDeliveryRequest.findMany({
      where: {
        user_id: userId,
        paper_id: { in: paperIds },
      },
      select: {
        id: true,
        paper_id: true,
        status: true,
        status_text: true,
        fulltext_url: true,
        create_time: true,
      },
      orderBy: { create_time: "desc" },
    });

    // 构建映射（每篇论文只保留最新的请求）
    const statusMap: Record<string, DocDeliveryStatus> = {};

    for (const request of requests) {
      if (request.paper_id && !statusMap[request.paper_id]) {
        statusMap[request.paper_id] = {
          request_id: request.id,
          status: request.status,
          status_text: request.status_text,
          fulltext_url: request.fulltext_url,
          create_time: request.create_time,
        };
      }
    }

    logger.debug("批量查询论文传递状态", {
      userId,
      paperCount: paperIds.length,
      foundCount: Object.keys(statusMap).length,
    });

    return statusMap;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量查询论文传递状态失败: ${errorMessage}`, { error });
    return {};
  }
};
