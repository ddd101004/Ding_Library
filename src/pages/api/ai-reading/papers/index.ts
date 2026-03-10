import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { parseFileFromCos } from "@/service/ai-reading/paperParser";
import { extractPaperMetadataWithAI } from "@/service/ai-reading/paperMetadataExtractor";
import {
  createUploadedPaper,
  getUploadedPapers,
  findUploadedPaperByCosKey,
  updateParseStatus,
  updateUploadedPaper,
} from "@/db/ai-reading/uploadedPaper";
import { checkFileExists, getFileUrl } from "@/lib/cos/cosClient";
import { validateFile, getMimeType } from "@/utils/fileUtils";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import logger from "@/helper/logger";
import { validateString, validateId } from "@/utils/validateString";

/**
 * POST - 确认论文上传（前端直传 COS 后调用）
 *
 * 前端将文件上传到 COS 后，调用此接口创建数据库记录并触发内容解析。
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { cos_key, file_name, file_size, file_type, title, authors, keywords } =
    req.body;

  // 校验 cos_key
  const cosKeyResult = validateString(cos_key, "COS 文件 key", { max: 500 });
  if (!cosKeyResult.valid) {
    return sendWarnningResponse(res, cosKeyResult.error || "COS 文件 key 校验失败");
  }

  // 校验 title（如果提供）
  if (title) {
    const titleResult = validateString(title, "论文标题", { max: 500, required: false });
    if (!titleResult.valid) {
      return sendWarnningResponse(res, titleResult.error || "论文标题校验失败");
    }
  }

  // 统一文件校验（不校验大小，因为已经上传完成）
  const validation = validateFile({
    file_name,
    file_size,
    file_type,
  });

  if (!validation.valid) {
    return sendWarnningResponse(res, validation.error!);
  }

  const actualFileType = validation.file_type!;

  try {
    // 检查是否已存在相同 cos_key 的记录（防止重复提交）
    const existingPaper = await findUploadedPaperByCosKey(userId, cos_key);
    if (existingPaper) {
      logger.info("论文记录已存在，返回最新状态", {
        paperId: existingPaper.id,
        userId,
        cosKey: cos_key,
        parseStatus: existingPaper.parseStatus,
        currentTitle: existingPaper.title,
      });

      // 始终返回最新的论文信息（包括AI提取后的元数据）
      return sendSuccessResponse(res, "论文已上传", {
        id: existingPaper.id,
        title: existingPaper.title,
        file_name: existingPaper.fileName,
        file_size: Number(existingPaper.fileSize),
        file_type: existingPaper.fileType,
        file_url: getFileUrl(existingPaper.filePath),
        parse_status: existingPaper.parseStatus,
        create_time: existingPaper.createTime,
      });
    }

    // 验证 COS 文件是否存在
    const fileInfo = await checkFileExists(cos_key);
    if (!fileInfo.exists) {
      return sendWarnningResponse(res, "文件上传未完成或已失效，请重新上传");
    }

    // 提取元数据
    const paperTitle = (
      title ||
      file_name.replace(/\.[^/.]+$/, "") ||
      "未命名论文"
    ).trim();

    // 创建数据库记录
    const paper = await createUploadedPaper({
      user_id: userId,
      title: paperTitle,
      authors: authors || null,
      keywords: keywords || null,
      file_path: cos_key, // 存储 COS key
      file_name: file_name,
      file_size: BigInt(file_size),
      file_type: actualFileType,
      mime_type: fileInfo.content_type || getMimeType(actualFileType),
      parse_status: "pending",
    });

    if (!paper) {
      throw new Error("创建论文记录失败");
    }

    logger.info("论文上传确认成功", {
      paperId: paper.id,
      userId,
      fileName: paper.fileName,
      fileType: actualFileType,
      cosKey: cos_key,
    });

    // 异步触发解析（不阻塞响应）
    triggerPaperParsing(paper.id, cos_key, actualFileType, file_name).catch(
      (error) => {
        logger.error("异步解析论文失败", {
          paperId: paper.id,
          error: error.message,
        });
      }
    );

    return sendSuccessResponse(res, "论文上传成功", {
      id: paper.id,
      title: paper.title,
      file_name: paper.fileName,
      file_size: Number(paper.fileSize),
      file_type: paper.fileType,
      file_url: getFileUrl(cos_key),
      parse_status: paper.parseStatus,
      create_time: paper.createTime,
    });
  } catch (error: unknown) {
    logger.error("论文上传确认失败", {
      userId,
      cosKey: cos_key,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

/**
 * 异步解析论文（从 COS 下载后解析文本内容）
 *
 * @param paperId - 论文 ID
 * @param cosKey - COS 文件 key
 * @param fileType - 文件类型
 * @param fileName - 文件名
 */
const triggerPaperParsing = async (
  paperId: string,
  cosKey: string,
  fileType: string,
  fileName: string
) => {
  try {
    // 更新状态为解析中
    await updateParseStatus({
      id: paperId,
      parse_status: "parsing",
    });

    // 步骤 1：从 COS 下载并解析文本（直接解析原文件）
    const result = await parseFileFromCos(cosKey, fileType);

    if (!result.success) {
      await updateParseStatus({
        id: paperId,
        parse_status: "failed",
        parse_error: result.error,
      });
      return;
    }

    // 更新解析结果（文本内容、页数、字数）
    await updateParseStatus({
      id: paperId,
      parse_status: "parsing",
      parsed_content: result.content,
      page_count: result.page_count,
      word_count: result.word_count,
      parsed_at: new Date(),
    });

    logger.info("论文文本解析成功，开始AI元数据提取", {
      paperId,
      pageCount: result.page_count,
      wordCount: result.word_count,
    });

    // 步骤 2：使用 AI 提取元数据（标题、作者、摘要、关键词）
    if (result.content) {
      const metadata = await extractPaperMetadataWithAI(
        result.content,
        fileName
      );

      // 构建更新数据
      const updateData: Record<string, string | number | undefined> = {};

      if (metadata.title) {
        updateData.title = metadata.title;
      }
      if (metadata.authors && metadata.authors.length > 0) {
        updateData.authors = JSON.stringify(metadata.authors);
      }
      if (metadata.abstract) {
        updateData.abstract = metadata.abstract;
      }
      if (metadata.keywords && metadata.keywords.length > 0) {
        updateData.keywords = JSON.stringify(metadata.keywords);
      }
      if (metadata.publication_year) {
        updateData.publicationYear = metadata.publication_year;
      }
      if (metadata.source) {
        updateData.source = metadata.source;
      }

      // 如果有任何元数据需要更新
      if (Object.keys(updateData).length > 0) {
        await updateUploadedPaper(paperId, updateData);
        logger.info("论文元数据已更新（AI提取）", {
          paperId,
          title: metadata.title,
          authorsCount: metadata.authors?.length || 0,
          hasAbstract: !!metadata.abstract,
          keywordsCount: metadata.keywords?.length || 0,
          year: metadata.publication_year,
          source: metadata.source,
        });
      }

      // AI 元数据提取完成后，最终将状态设为 completed
      await updateParseStatus({
        id: paperId,
        parse_status: "completed",
      });

      logger.info("论文完全解析完成（包括AI元数据）", {
        paperId,
        finalTitle: metadata.title,
      });
    } else {
      // 没有内容，直接设为 completed
      await updateParseStatus({
        id: paperId,
        parse_status: "completed",
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("论文解析异常", { paperId, error: errorMessage });
    await updateParseStatus({
      id: paperId,
      parse_status: "failed",
      parse_error: errorMessage,
    });
  }
};

/**
 * GET - 获取论文列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const {
    page,
    size,
    sort_by = "create_time",
    order = "desc",
    parse_status,
    keyword,
  } = req.query;

  const result = await getUploadedPapers({
    user_id: userId,
    page: parsePageNumber(page),
    size: parseLimitParam(size, 10),
    sort_by: sort_by as "create_time" | "last_read_at" | "title",
    order: order as "asc" | "desc",
    parse_status: parse_status as
      | "pending"
      | "parsing"
      | "completed"
      | "failed"
      | undefined,
    keyword: keyword as string | undefined,
  });

  if (!result) {
    throw new Error("获取论文列表失败");
  }

  // 格式化返回数据
  const items = result.data.map((paper) => ({
    id: paper.id,
    title: paper.title,
    authors: paper.authors ? JSON.parse(paper.authors) : [],
    file_name: paper.fileName,
    file_size: Number(paper.fileSize),
    file_type: paper.fileType,
    parse_status: paper.parseStatus,
    page_count: paper.pageCount,
    word_count: paper.wordCount,
    read_count: paper.readCount,
    conversation_count: paper.conversationCount,
    annotation_count: paper.annotationCount,
    citation_count: paper.citationCount,
    last_read_at: paper.lastReadAt,
    create_time: paper.createTime,
  }));

  return sendSuccessResponse(res, "获取成功", {
    total: result.total,
    page: result.page,
    size: result.pageSize,
    items,
  });
};

/**
 * 论文管理 API 路由
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
  withErrorHandler(handler, { logPrefix: "论文管理", useLogger: true })
);
