/**
 * 阅读记录数据库操作层
 *
 * 提供PaperReadingRecord模型的CRUD操作
 * 所有数据库操作通过Prisma Proxy执行
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

// ==================== 创建/更新操作 ====================

/**
 * 更新阅读记录参数
 */
export interface UpsertReadingRecordParams {
  user_id: string;
  uploaded_paper_id: string;
  current_page?: number; // 当前页码
  total_pages?: number; // 总页数
  scroll_position?: number; // 滚动位置
  progress_percentage?: number; // 阅读进度百分比
  reading_duration_seconds?: number; // 累计阅读时长(秒)
  session_start_at?: Date; // 本次会话开始时间
  session_end_at?: Date; // 本次会话结束时间
  annotation_created?: number; // 创建标注次数（增量）
  citation_created?: number; // 创建引用次数（增量）
  translation_used?: number; // 使用翻译次数（增量）
  ai_question_asked?: number; // 提问AI次数（增量）
}

/**
 * 创建或更新阅读记录（upsert）
 *
 * 如果记录不存在则创建，存在则更新
 * 统计字段（annotation_created等）为增量更新
 */
export async function upsertReadingRecord(params: UpsertReadingRecordParams) {
  const {
    user_id,
    uploaded_paper_id,
    current_page,
    total_pages,
    scroll_position,
    progress_percentage,
    reading_duration_seconds,
    session_start_at,
    session_end_at,
    annotation_created = 0,
    citation_created = 0,
    translation_used = 0,
    ai_question_asked = 0,
  } = params;

  try {
    // 构建更新数据
    const updateData: Prisma.PaperReadingRecordUpdateInput = {};

    if (current_page !== undefined) updateData.currentPage = current_page;
    if (total_pages !== undefined) updateData.totalPages = total_pages;
    if (scroll_position !== undefined)
      updateData.scrollPosition = scroll_position;
    if (progress_percentage !== undefined)
      updateData.progressPercentage = progress_percentage;
    if (reading_duration_seconds !== undefined)
      updateData.readingDurationSeconds = reading_duration_seconds;
    if (session_start_at !== undefined)
      updateData.sessionStartAt = session_start_at;
    if (session_end_at !== undefined) updateData.sessionEndAt = session_end_at;

    // 统计字段使用增量更新
    if (annotation_created > 0) {
      updateData.annotationCreated = { increment: annotation_created };
    }
    if (citation_created > 0) {
      updateData.citationCreated = { increment: citation_created };
    }
    if (translation_used > 0) {
      updateData.translationUsed = { increment: translation_used };
    }
    if (ai_question_asked > 0) {
      updateData.aiQuestionAsked = { increment: ai_question_asked };
    }

    // 构建创建数据
    const createData: Prisma.PaperReadingRecordCreateInput = {
      user: { connect: { user_id } },
      uploadedPaper: { connect: { id: uploaded_paper_id } },
      currentPage: current_page || 1,
      totalPages: total_pages,
      scrollPosition: scroll_position || 0,
      progressPercentage: progress_percentage || 0,
      readingDurationSeconds: reading_duration_seconds || 0,
      sessionStartAt: session_start_at,
      sessionEndAt: session_end_at,
      annotationCreated: annotation_created,
      citationCreated: citation_created,
      translationUsed: translation_used,
      aiQuestionAsked: ai_question_asked,
    };

    // 执行 upsert
    const record = await prisma.paperReadingRecord.upsert({
      where: {
        userId_uploadedPaperId: {
          userId: user_id,
          uploadedPaperId: uploaded_paper_id,
        },
      },
      update: updateData,
      create: createData,
    });

    logger.info("更新阅读记录成功", {
      userId: user_id,
      paperId: uploaded_paper_id,
      currentPage: current_page,
      progress: progress_percentage,
    });

    return record;
  } catch (error: any) {
    logger.error("更新阅读记录失败", { error: error.message, params });
    return null;
  }
}

// ==================== 查询操作 ====================

/**
 * 获取阅读记录
 */
export async function getReadingRecord(
  user_id: string,
  uploaded_paper_id: string
) {
  try {
    const record = await prisma.paperReadingRecord.findUnique({
      where: {
        userId_uploadedPaperId: {
          userId: user_id,
          uploadedPaperId: uploaded_paper_id,
        },
      },
    });

    return record;
  } catch (error: any) {
    logger.error("获取阅读记录失败", {
      error: error.message,
      userId: user_id,
      paperId: uploaded_paper_id,
    });
    return null;
  }
}

/**
 * 获取用户的所有阅读记录
 */
export async function getUserReadingRecords(user_id: string) {
  try {
    const records = await prisma.paperReadingRecord.findMany({
      where: {
        userId: user_id,
      },
      include: {
        uploadedPaper: {
          select: {
            id: true,
            title: true,
            authors: true,
            fileName: true,
            parseStatus: true,
          },
        },
      },
      orderBy: {
        updateTime: "desc", // 按最后更新时间倒序
      },
    });

    logger.info("获取用户阅读记录成功", {
      userId: user_id,
      count: records.length,
    });

    return records;
  } catch (error: any) {
    logger.error("获取用户阅读记录失败", {
      error: error.message,
      userId: user_id,
    });
    return null;
  }
}

// ==================== 统计操作 ====================

/**
 * 获取用户的阅读统计数据
 */
export async function getUserReadingStats(user_id: string) {
  try {
    const stats = await prisma.paperReadingRecord.aggregate({
      where: {
        userId: user_id,
      },
      _count: {
        id: true,
      },
      _sum: {
        readingDurationSeconds: true,
        annotationCreated: true,
        citationCreated: true,
        translationUsed: true,
        aiQuestionAsked: true,
      },
      _avg: {
        progressPercentage: true,
      },
    });

    logger.info("获取用户阅读统计成功", { userId: user_id });

    return {
      total_papers: stats._count.id,
      total_reading_seconds: stats._sum.readingDurationSeconds || 0,
      total_annotations: stats._sum.annotationCreated || 0,
      total_citations: stats._sum.citationCreated || 0,
      total_translations: stats._sum.translationUsed || 0,
      total_questions: stats._sum.aiQuestionAsked || 0,
      average_progress: stats._avg.progressPercentage || 0,
    };
  } catch (error: any) {
    logger.error("获取用户阅读统计失败", {
      error: error.message,
      userId: user_id,
    });
    return null;
  }
}

/**
 * 更新会话时间（开始或结束）
 */
export async function updateSessionTime(
  user_id: string,
  uploaded_paper_id: string,
  type: "start" | "end"
) {
  try {
    const data: Prisma.PaperReadingRecordUpdateInput = {};

    if (type === "start") {
      data.sessionStartAt = new Date();
    } else if (type === "end") {
      data.sessionEndAt = new Date();
    }

    const record = await prisma.paperReadingRecord.update({
      where: {
        userId_uploadedPaperId: {
          userId: user_id,
          uploadedPaperId: uploaded_paper_id,
        },
      },
      data,
    });

    logger.info("更新会话时间成功", {
      userId: user_id,
      paperId: uploaded_paper_id,
      type,
    });

    return record;
  } catch (error: any) {
    logger.error("更新会话时间失败", {
      error: error.message,
      userId: user_id,
      paperId: uploaded_paper_id,
      type,
    });
    return null;
  }
}

/**
 * 增加阅读时长
 */
export async function incrementReadingDuration(
  user_id: string,
  uploaded_paper_id: string,
  seconds: number
) {
  try {
    const record = await prisma.paperReadingRecord.update({
      where: {
        userId_uploadedPaperId: {
          userId: user_id,
          uploadedPaperId: uploaded_paper_id,
        },
      },
      data: {
        readingDurationSeconds: { increment: seconds },
      },
    });

    logger.info("增加阅读时长成功", {
      userId: user_id,
      paperId: uploaded_paper_id,
      seconds,
    });

    return record;
  } catch (error: any) {
    logger.error("增加阅读时长失败", {
      error: error.message,
      userId: user_id,
      paperId: uploaded_paper_id,
      seconds,
    });
    return null;
  }
}
