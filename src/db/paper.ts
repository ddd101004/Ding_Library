/**
 * 论文数据库操作层
 *
 * 提供Paper模型的CRUD操作
 * 所有数据库操作通过Prisma Proxy执行
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma, Paper } from "@prisma/client";
import { paginate } from "@/utils/paginate";

// ==================== 创建操作 ====================

/**
 * 创建论文记录
 */
export async function createPaper(data: Prisma.PaperCreateInput) {
  try {
    const paper = await prisma.paper.create({
      data,
    });
    logger.info("创建论文记录成功", {
      id: paper.id,
      dbId: paper.db_id,
      an: paper.an,
      title: paper.title,
    });
    return paper;
  } catch (error: any) {
    logger.error("创建论文记录失败", { error: error.message, data });
    return null;
  }
}

/**
 * 批量创建论文记录
 */
export async function createManyPapers(papers: Prisma.PaperCreateManyInput[]) {
  try {
    const result = await prisma.paper.createMany({
      data: papers,
      skipDuplicates: true, // 跳过重复记录
    });
    logger.info("批量创建论文记录成功", { count: result.count });
    return result;
  } catch (error: any) {
    logger.error("批量创建论文记录失败", {
      error: error.message,
      count: papers.length,
    });
    return null;
  }
}

// ==================== 查询操作 ====================

/**
 * 根据ID查询论文
 */
export async function findPaperById(id: string) {
  try {
    const paper = await prisma.paper.findFirst({
      where: { id, deleted_status: 0 },
    });
    return paper;
  } catch (error: any) {
    logger.error("根据ID查询论文失败", { error: error.message, id });
    return null;
  }
}

/**
 * 根据EBSCO标识查询论文
 */
export async function findPaperByEbscoId(dbId: string, an: string) {
  try {
    const paper = await prisma.paper.findFirst({
      where: {
        db_id: dbId,
        an,
        deleted_status: 0,
      },
    });
    return paper;
  } catch (error: any) {
    logger.error("根据EBSCO标识查询论文失败", {
      error: error.message,
      dbId,
      an,
    });
    return null;
  }
}

/**
 * 搜索论文
 * 支持关键词搜索、分页、排序、过滤
 */
export interface SearchPapersParams {
  keyword?: string; // 搜索关键词（标题、作者、摘要）
  authors?: string; // 作者名
  publicationName?: string; // 出版物名称
  hasFulltext?: boolean; // 是否有全文
  pdfDownloaded?: boolean; // PDF是否已下载
  startDate?: Date; // 开始日期
  endDate?: Date; // 结束日期
  page?: number; // 页码
  pageSize?: number; // 每页数量
  sortBy?: string; // 排序字段
  sortOrder?: "asc" | "desc"; // 排序方向
}

export async function searchPapers(params: SearchPapersParams) {
  try {
    const {
      keyword,
      authors,
      publicationName,
      hasFulltext,
      pdfDownloaded,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
      sortBy = "publication_date",
      sortOrder = "desc",
    } = params;

    // 构建查询条件
    const where: Prisma.PaperWhereInput = {
      deleted_status: 0,
      AND: [],
    };

    // 关键词搜索（标题、作者、摘要）
    if (keyword) {
      (where.AND as any[]).push({
        OR: [
          { title: { contains: keyword } },
          { authors: { contains: keyword } },
          { abstract: { contains: keyword } },
        ],
      });
    }

    // 作者搜索
    if (authors) {
      (where.AND as any[]).push({
        authors: { contains: authors },
      });
    }

    // 出版物搜索
    if (publicationName) {
      (where.AND as any[]).push({
        publication_name: { contains: publicationName },
      });
    }

    // 全文过滤
    if (hasFulltext !== undefined) {
      (where.AND as any[]).push({ has_fulltext: hasFulltext });
    }

    // PDF下载状态过滤
    if (pdfDownloaded !== undefined) {
      (where.AND as any[]).push({ pdf_downloaded: pdfDownloaded });
    }

    // 日期范围过滤
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = startDate;
      if (endDate) dateFilter.lte = endDate;
      (where.AND as any[]).push({ publication_date: dateFilter });
    }

    // 如果没有AND条件，删除AND字段
    if ((where.AND as any[]).length === 0) {
      delete where.AND;
    }

    // 排序
    const orderBy: Prisma.PaperOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    // 分页
    const { skip, take } = paginate(page, pageSize);

    // 查询数据
    const [papers, total] = await Promise.all([
      prisma.paper.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      prisma.paper.count({ where }),
    ]);

    logger.info("搜索论文成功", {
      keyword,
      total,
      page,
      pageSize,
    });

    return {
      data: papers,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  } catch (error: any) {
    logger.error("搜索论文失败", { error: error.message, params });
    return null;
  }
}

/**
 * 获取未下载PDF的论文列表
 */
export async function findPapersWithoutPdf(limit: number = 100) {
  try {
    const papers = await prisma.paper.findMany({
      where: {
        has_fulltext: true,
        pdf_downloaded: false,
        deleted_status: 0,
      },
      take: limit,
      orderBy: {
        sync_time: "desc",
      },
    });

    logger.info("查询未下载PDF的论文", { count: papers.length, limit });
    return papers;
  } catch (error: any) {
    logger.error("查询未下载PDF的论文失败", { error: error.message, limit });
    return [];
  }
}

/**
 * 获取最近同步的论文
 */
export async function findRecentPapers(days: number = 7, limit: number = 100) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const papers = await prisma.paper.findMany({
      where: {
        sync_time: {
          gte: startDate,
        },
        deleted_status: 0,
      },
      take: limit,
      orderBy: {
        sync_time: "desc",
      },
    });

    logger.info("查询最近同步的论文", {
      days,
      count: papers.length,
      limit,
    });
    return papers;
  } catch (error: any) {
    logger.error("查询最近同步的论文失败", {
      error: error.message,
      days,
      limit,
    });
    return [];
  }
}

// ==================== 更新操作 ====================

/**
 * 更新论文信息
 */
export async function updatePaper(id: string, data: Prisma.PaperUpdateInput) {
  try {
    const paper = await prisma.paper.update({
      where: { id },
      data,
    });
    logger.info("更新论文信息成功", { id, title: paper.title });
    return paper;
  } catch (error: any) {
    logger.error("更新论文信息失败", { error: error.message, id });
    return null;
  }
}

/**
 * 更新或创建论文（Upsert）
 */
export async function upsertPaper(
  dbId: string,
  an: string,
  data: Prisma.PaperCreateInput
) {
  try {
    const paper = await prisma.paper.upsert({
      where: {
        db_id_an: {
          db_id: dbId,
          an,
        },
      },
      create: data,
      update: {
        ...data,
        update_time: new Date(),
      },
    });

    logger.info("Upsert论文成功", {
      id: paper.id,
      dbId,
      an,
      title: paper.title,
    });
    return paper;
  } catch (error: any) {
    logger.error("Upsert论文失败", { error: error.message, dbId, an });
    return null;
  }
}

/**
 * 根据 source + source_id 更新或创建论文（通用 Upsert）
 * 支持 ebsco, aminer, wanfang 等多种数据源
 */
export async function upsertPaperBySource(
  source: string,
  sourceId: string,
  data: Prisma.PaperCreateInput
) {
  try {
    const paper = await prisma.paper.upsert({
      where: {
        source_source_id: {
          source,
          source_id: sourceId,
        },
      },
      create: data,
      update: {
        ...data,
        update_time: new Date(),
      },
    });

    logger.info("Upsert论文成功(by source)", {
      id: paper.id,
      source,
      sourceId,
      title: paper.title,
    });
    return paper;
  } catch (error: any) {
    logger.error("Upsert论文失败(by source)", {
      error: error.message,
      source,
      sourceId,
    });
    return null;
  }
}

/**
 * 根据 source + source_id 查询论文
 */
export async function findPaperBySourceId(source: string, sourceId: string) {
  try {
    const paper = await prisma.paper.findFirst({
      where: {
        source,
        source_id: sourceId,
        deleted_status: 0,
      },
    });
    return paper;
  } catch (error: any) {
    logger.error("根据source_id查询论文失败", {
      error: error.message,
      source,
      sourceId,
    });
    return null;
  }
}

/**
 * 批量查询论文ID（根据数据源和源ID列表）
 * @param source 数据源
 * @param sourceIds 源ID列表
 * @returns 论文ID和源ID的映射
 */
export async function findPaperIdsBySource(
  source: string,
  sourceIds: string[]
): Promise<Array<{ id: string; source_id: string }>> {
  try {
    const papers = await prisma.paper.findMany({
      where: {
        source,
        source_id: { in: sourceIds },
        deleted_status: 0,
      },
      select: {
        id: true,
        source_id: true,
      },
    });
    return papers;
  } catch (error: any) {
    logger.error("批量查询论文ID失败", {
      error: error.message,
      source,
      count: sourceIds.length,
    });
    return [];
  }
}

/**
 * 根据ID列表批量查询论文
 * @param ids 论文ID列表
 * @returns 论文列表
 */
export async function findPapersByIds(ids: string[]): Promise<Paper[]> {
  try {
    const papers = await prisma.paper.findMany({
      where: {
        id: { in: ids },
        deleted_status: 0,
      },
    });
    return papers;
  } catch (error: any) {
    logger.error("批量查询论文失败", {
      error: error.message,
      count: ids.length,
    });
    return [];
  }
}

/**
 * 标记PDF已下载
 */
export async function markPdfDownloaded(
  id: string,
  pdfFilePath: string,
  pdfFileSize: bigint
) {
  try {
    const paper = await prisma.paper.update({
      where: { id },
      data: {
        pdf_downloaded: true,
        pdf_file_path: pdfFilePath,
        pdf_file_size: pdfFileSize,
        pdf_download_time: new Date(),
      },
    });
    logger.info("标记PDF已下载", { id, pdfFilePath });
    return paper;
  } catch (error: any) {
    logger.error("标记PDF已下载失败", { error: error.message, id });
    return null;
  }
}

/**
 * 增加查看次数
 */
export async function incrementViewCount(id: string) {
  try {
    const paper = await prisma.paper.update({
      where: { id },
      data: {
        view_count: {
          increment: 1,
        },
      },
    });
    return paper;
  } catch (error: any) {
    logger.error("增加查看次数失败", { error: error.message, id });
    return null;
  }
}

/**
 * 增加下载次数
 */
export async function incrementDownloadCount(id: string) {
  try {
    const paper = await prisma.paper.update({
      where: { id },
      data: {
        download_count: {
          increment: 1,
        },
      },
    });
    return paper;
  } catch (error: any) {
    logger.error("增加下载次数失败", { error: error.message, id });
    return null;
  }
}

// ==================== 删除操作 ====================

/**
 * 软删除论文
 */
export async function softDeletePaper(id: string) {
  try {
    const paper = await prisma.paper.update({
      where: { id },
      data: {
        deleted_status: 1,
        deleted_time: new Date(),
      },
    });
    logger.info("软删除论文成功", { id, title: paper.title });
    return paper;
  } catch (error: any) {
    logger.error("软删除论文失败", { error: error.message, id });
    return null;
  }
}

/**
 * 硬删除论文
 */
export async function hardDeletePaper(id: string) {
  try {
    const paper = await prisma.paper.delete({
      where: { id },
    });
    logger.info("硬删除论文成功", { id });
    return paper;
  } catch (error: any) {
    logger.error("硬删除论文失败", { error: error.message, id });
    return null;
  }
}

// ==================== 统计操作 ====================

/**
 * 获取论文统计信息
 */
export async function getPapersStatistics() {
  try {
    const total = await prisma.paper.count({
      where: { deleted_status: 0 },
    });

    const hasFulltext = await prisma.paper.count({
      where: { has_fulltext: true, deleted_status: 0 },
    });

    const pdfDownloaded = await prisma.paper.count({
      where: { pdf_downloaded: true, deleted_status: 0 },
    });

    // 今日同步数量
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySynced = await prisma.paper.count({
      where: {
        sync_time: { gte: todayStart },
        deleted_status: 0,
      },
    });

    // 今日下载数量
    const todayDownloaded = await prisma.paper.count({
      where: {
        pdf_download_time: { gte: todayStart },
        deleted_status: 0,
      },
    });

    return {
      total,
      hasFulltext,
      pdfDownloaded,
      todaySynced,
      todayDownloaded,
    };
  } catch (error: any) {
    logger.error("获取论文统计信息失败", { error: error.message });
    return null;
  }
}

