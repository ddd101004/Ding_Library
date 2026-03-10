import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";

/**
 * 根据ID获取同步日志详情
 */
export async function getSyncLogById(id: string) {
  try {
    const log = await prisma.ebscoSyncLog.findUnique({
      where: { id },
    });
    return log;
  } catch (error: any) {
    logger.error(`获取同步日志详情失败: ${error?.message}`, { error });
    return null;
  }
}

/**
 * 创建同步日志
 */
export async function createSyncLog(data: {
  sync_type: string;
  sync_batch_no: string;
  search_query?: string;
  target_count?: number;
  total_count?: number;
  success_count?: number;
  fail_count?: number;
  skip_count?: number;
  status: number;
  error_message?: string;
  detail_log?: string;
}) {
  try {
    const log = await prisma.ebscoSyncLog.create({
      data,
    });
    return log;
  } catch (error: any) {
    logger.error(`创建同步日志失败: ${error?.message}`, { error });
    return null;
  }
}

/**
 * 更新同步日志
 */
export async function updateSyncLog(
  id: string,
  data: {
    total_count?: number;
    success_count?: number;
    fail_count?: number;
    skip_count?: number;
    status?: number;
    error_message?: string;
    detail_log?: string;
    end_time?: Date;
    duration_seconds?: number;
  }
) {
  try {
    const log = await prisma.ebscoSyncLog.update({
      where: { id },
      data,
    });
    return log;
  } catch (error: any) {
    logger.error(`更新同步日志失败: ${error?.message}`, { error });
    return null;
  }
}

/**
 * 获取同步日志列表
 */
export async function getSyncLogs(params: {
  page?: number;
  size?: number;
  status?: number;
}) {
  try {
    const { page = 1, size = 20, status } = params;
    const skip = (page - 1) * size;

    const where = status !== undefined ? { status } : {};

    const [logs, total] = await Promise.all([
      prisma.ebscoSyncLog.findMany({
        where,
        skip,
        take: size,
        orderBy: { start_time: "desc" },
      }),
      prisma.ebscoSyncLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    };
  } catch (error: any) {
    logger.error(`获取同步日志列表失败: ${error?.message}`, { error });
    return null;
  }
}

/**
 * 获取同步日志列表（按类型筛选）
 */
export async function getSyncLogsByType(params: {
  syncType?: string;
  page: number;
  size: number;
}) {
  try {
    const { syncType, page, size } = params;
    const skip = (page - 1) * size;

    const where: { sync_type?: string } = {};
    if (syncType) {
      where.sync_type = syncType;
    }

    const [logs, total] = await Promise.all([
      prisma.ebscoSyncLog.findMany({
        where,
        orderBy: { start_time: "desc" },
        skip,
        take: size,
        select: {
          id: true,
          sync_type: true,
          sync_batch_no: true,
          search_query: true,
          target_count: true,
          total_count: true,
          success_count: true,
          fail_count: true,
          skip_count: true,
          status: true,
          error_message: true,
          start_time: true,
          end_time: true,
          duration_seconds: true,
        },
      }),
      prisma.ebscoSyncLog.count({ where }),
    ]);

    return { logs, total };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取同步日志列表失败: ${errorMessage}`, { error });
    return { logs: [], total: 0 };
  }
}
