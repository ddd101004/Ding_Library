/**
 * 用户上传论文数据库操作
 */

import  prisma  from "@/utils/prismaProxy";
import logger from "@/helper/logger";

/**
 * 上传论文参数类型
 */
export interface UpsertUploadedPaperParams {
  user_id: string;
  title: string;
  authors?: string;
  abstract?: string;
  keywords?: string;
  file_path: string;
  file_name: string;
  file_size: bigint;
  file_type: string;
  mime_type: string;
  publication_year?: number;
  source?: string;
  doi?: string;
}

/**
 * 创建或更新上传论文记录
 *
 * @param params - 论文参数
 * @returns UserUploadedPaper
 */
export async function upsertUploadedPaper(
  params: UpsertUploadedPaperParams
) {
  try {
    const {
      user_id,
      title,
      authors,
      abstract,
      keywords,
      file_path,
      file_name,
      file_size,
      file_type,
      mime_type,
      publication_year,
      source,
      doi,
    } = params;

    // 检查是否已存在（根据 file_path 和 user_id）
    const existing = await prisma.userUploadedPaper.findFirst({
      where: {
        userId: user_id,
        filePath: file_path,
        deletedAt: null,
      },
    });

    if (existing) {
      // 更新现有记录
      const updated = await prisma.userUploadedPaper.update({
        where: { id: existing.id },
        data: {
          title,
          authors,
          abstract,
          keywords,
          fileName: file_name,
          fileSize: file_size,
          fileType: file_type,
          mimeType: mime_type,
          publicationYear: publication_year,
          source,
          doi,
          updateTime: new Date(),
        },
      });

      logger.info("更新上传论文记录", { paperId: updated.id, userId: user_id });
      return updated;
    } else {
      // 创建新记录
      const created = await prisma.userUploadedPaper.create({
        data: {
          userId: user_id,
          title,
          authors,
          abstract,
          keywords,
          filePath: file_path,
          fileName: file_name,
          fileSize: file_size,
          fileType: file_type,
          mimeType: mime_type,
          publicationYear: publication_year,
          source,
          doi,
          parseStatus: "pending",
        },
      });

      logger.info("创建上传论文记录", { paperId: created.id, userId: user_id });
      return created;
    }
  } catch (error) {
    logger.error("创建/更新上传论文记录失败", { error, params });
    throw error;
  }
}

/**
 * 根据 ID 获取上传论文
 *
 * @param id - 论文 ID
 * @returns UserUploadedPaper | null
 */
export async function findUploadedPaperById(id: string) {
  try {
    const paper = await prisma.userUploadedPaper.findUnique({
      where: { id },
    });

    return paper;
  } catch (error) {
    logger.error("获取上传论文失败", { error, id });
    throw error;
  }
}

/**
 * 获取用户的上传论文列表
 *
 * @param user_id - 用户 ID
 * @param options - 查询选项
 * @returns 论文列表
 */
export interface GetUserUploadedPapersOptions {
  page?: number;
  size?: number;
  parse_status?: string;
}

export async function getUserUploadedPapers(
  user_id: string,
  options: GetUserUploadedPapersOptions = {}
) {
  try {
    const { page = 1, size = 20, parse_status } = options;

    const where: any = {
      userId: user_id,
      deletedAt: null,
    };

    if (parse_status) {
      where.parseStatus = parse_status;
    }

    const [total, items] = await Promise.all([
      prisma.userUploadedPaper.count({ where }),
      prisma.userUploadedPaper.findMany({
        where,
        orderBy: { createTime: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
    ]);

    return {
      total,
      page,
      size,
      items,
    };
  } catch (error) {
    logger.error("获取用户上传论文列表失败", { error, user_id, options });
    throw error;
  }
}

/**
 * 删除上传论文（软删除）
 *
 * @param id - 论文 ID
 * @param user_id - 用户 ID（用于权限验证）
 * @returns boolean
 */
export async function deleteUploadedPaper(id: string, user_id: string) {
  try {
    const paper = await prisma.userUploadedPaper.findFirst({
      where: {
        id,
        userId: user_id,
        deletedAt: null,
      },
    });

    if (!paper) {
      return false;
    }

    await prisma.userUploadedPaper.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    logger.info("删除上传论文", { paperId: id, userId: user_id });
    return true;
  } catch (error) {
    logger.error("删除上传论文失败", { error, id, user_id });
    throw error;
  }
}

/**
 * 更新论文解析状态
 *
 * @param id - 论文 ID
 * @param parse_status - 解析状态
 * @param parsed_content - 解析内容
 * @param parse_error - 解析错误
 * @returns UserUploadedPaper
 */
export async function updatePaperParseStatus(
  id: string,
  parse_status: string,
  parsed_content?: string,
  parse_error?: string
) {
  try {
    const updated = await prisma.userUploadedPaper.update({
      where: { id },
      data: {
        parseStatus: parse_status,
        parsedContent: parsed_content,
        parseError: parse_error,
        parsedAt: parse_status === "completed" ? new Date() : null,
      },
    });

    logger.info("更新论文解析状态", { paperId: id, parseStatus: parse_status });
    return updated;
  } catch (error) {
    logger.error("更新论文解析状态失败", { error, id, parse_status });
    throw error;
  }
}
