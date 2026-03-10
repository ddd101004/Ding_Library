import { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  findUploadedPaperById,
  deleteUploadedPaper,
  incrementPaperStats,
  updateUploadedPaper,
} from "@/db/ai-reading/uploadedPaper";
import { getSignedUrl, uploadBuffer } from "@/lib/cos/cosClient";
import { needsConversion, convertFromCos } from "@/service/ai-reading/fileConverter";
import logger from "@/helper/logger";
import { validateId } from "@/utils/validateString";

/**
 * GET - 获取论文详情
 *
 * 此接口用于获取论文详情并返回 COS 文件 URL，专为 PDF 阅读器展示设计。
 * 按需转换逻辑：
 * - PDF 文件：直接返回 COS 签名 URL
 * - DOCX/DOC/TXT 文件：
 *   - 如果已转换（数据库中 file_type 为 pdf）：返回转换后的 PDF URL
 *   - 如果未转换：执行转换，上传到 COS，更新数据库，返回 PDF URL
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "论文 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "论文 ID 校验失败");
  }

  const paper = await findUploadedPaperById(id as string);

  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }

  // 验证论文所有权
  if (paper.userId !== userId) {
    return sendWarnningResponse(res, "无权访问该论文");
  }

  // 增加阅读次数并更新最后阅读时间
  await incrementPaperStats({
    id: paper.id,
    read_count: 1,
    update_last_read: true,
  });

  // 解析 JSON 字段
  let authors: string[] = [];
  let keywords: string[] = [];

  try {
    if (paper.authors) {
      authors = JSON.parse(paper.authors);
    }
    if (paper.keywords) {
      keywords = JSON.parse(paper.keywords);
    }
  } catch {
    // JSON 解析失败，保持默认空数组
  }

  // 确定当前文件路径和类型
  let currentFilePath = paper.filePath;
  let currentFileType = paper.fileType;
  let currentMimeType = paper.mimeType;
  let currentFileSize = paper.fileSize;

  // 按需 PDF 转换逻辑
  // 如果原始文件类型是需要转换的类型（DOCX/DOC/TXT），且当前存储的还不是 PDF，则执行转换
  if (needsConversion(paper.fileType) && paper.fileType !== "pdf") {
    logger.info("开始按需转换文件为 PDF", {
      paperId: paper.id,
      originalFileType: paper.fileType,
      cosKey: paper.filePath,
    });

    try {
      // 从 COS 下载并转换
      const conversionResult = await convertFromCos(paper.filePath, paper.fileType);

      if (!conversionResult.success || !conversionResult.pdfBuffer) {
        logger.error("PDF 转换失败", {
          paperId: paper.id,
          error: conversionResult.error,
        });
        // 转换失败，返回原文件（让前端处理）
        return sendWarnningResponse(
          res,
          `文件转换失败: ${conversionResult.error || "未知错误"}，请尝试重新上传 PDF 格式文件`
        );
      }

      // 生成新的 PDF 文件 COS key
      const timestamp = Date.now();
      const random = crypto.randomBytes(8).toString("hex");
      const pdfCosKey = `papers/${userId}/${timestamp}_${random}.pdf`;

      // 上传转换后的 PDF 到 COS
      const uploaded = await uploadBuffer(
        pdfCosKey,
        conversionResult.pdfBuffer,
        "application/pdf"
      );

      if (!uploaded) {
        logger.error("上传转换后的 PDF 失败", { paperId: paper.id });
        return sendWarnningResponse(res, "文件转换后上传失败，请稍后再试");
      }

      // 更新数据库中的文件信息
      await updateUploadedPaper(paper.id, {
        filePath: pdfCosKey,
        fileType: "pdf",
        mimeType: "application/pdf",
        fileSize: BigInt(conversionResult.pdfBuffer.length),
      });

      logger.info("文件转换并上传成功", {
        paperId: paper.id,
        originalCosKey: paper.filePath,
        newCosKey: pdfCosKey,
        pdfSize: conversionResult.pdfBuffer.length,
      });

      // 更新当前文件信息
      currentFilePath = pdfCosKey;
      currentFileType = "pdf";
      currentMimeType = "application/pdf";
      currentFileSize = BigInt(conversionResult.pdfBuffer.length);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error("按需 PDF 转换异常", {
        paperId: paper.id,
        error: errorMessage,
      });
      return sendWarnningResponse(res, `文件转换失败: ${errorMessage}`);
    }
  }

  // 生成 COS 文件访问 URL
  let fileUrl = "";
  try {
    if (currentFilePath) {
      fileUrl = await getSignedUrl(currentFilePath);
    }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.warn("生成文件 URL 失败", {
      paperId: paper.id,
      error: errorMsg,
    });
  }

  return sendSuccessResponse(res, "获取成功", {
    id: paper.id,
    title: paper.title,
    authors,
    abstract: paper.abstract || "",
    keywords,
    publication_year: paper.publicationYear,
    source: paper.source || "",
    doi: paper.doi || "",
    // COS 相关字段（返回转换后的信息）
    file_url: fileUrl, // 带签名的访问 URL（始终是 PDF 或原本就是 PDF）
    cos_key: currentFilePath, // COS key（供前端缓存使用）
    file_name: paper.fileName, // 原始文件名（保持不变，方便用户识别）
    file_size: Number(currentFileSize),
    file_type: currentFileType, // 当前文件类型（转换后为 pdf）
    mime_type: currentMimeType,
    original_file_type: paper.fileType !== currentFileType ? paper.fileType : undefined, // 原始文件类型（如果发生过转换）
    // 解析状态
    parse_status: paper.parseStatus,
    page_count: paper.pageCount,
    word_count: paper.wordCount,
    parse_error: paper.parseError || "",
    parsed_at: paper.parsedAt,
    // 统计信息
    read_count: paper.readCount + 1, // 包含本次阅读
    conversation_count: paper.conversationCount,
    annotation_count: paper.annotationCount,
    citation_count: paper.citationCount,
    last_read_at: new Date(), // 本次阅读时间
    create_time: paper.createTime,
    update_time: paper.updateTime,
  });
};

/**
 * DELETE - 删除论文（软删除）
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "论文 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "论文 ID 校验失败");
  }

  // 验证论文存在且属于当前用户
  const paper = await findUploadedPaperById(id as string);

  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }

  if (paper.userId !== userId) {
    return sendWarnningResponse(res, "无权删除该论文");
  }

  // 执行软删除
  const result = await deleteUploadedPaper(id as string);

  if (!result) {
    throw new Error("删除论文失败");
  }

  logger.info("论文删除成功", { paperId: id, userId });

  return sendSuccessResponse(res, "删除成功");
};

/**
 * 论文详情 API 路由
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 和 DELETE 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "论文详情", useLogger: true })
);
