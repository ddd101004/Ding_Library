/**
 * AI伴读论文管理 API
 *
 * 支持本地文件存储，替代原有的COS存储方案
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import formidable, { File as FormidableFile } from "formidable";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { saveFile as saveFileToLocal, checkFileExists } from "@/lib/storage/local";
import { upsertUploadedPaper } from "@/db/uploadedPaper";
import logger from "@/helper/logger";
import { triggerFileParsing } from "@/service/parser/fileParser";

// 禁用 Next.js 默认的 body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * 解析表单数据
 */
function parseForm(
  req: NextApiRequest
): Promise<{ fields: formidable.Fields; files: formidable.Files }> {
  const form = formidable({
    maxFileSize: 100 * 1024 * 1024, // 100MB
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

/**
 * POST - 上传论文并创建记录
 */
 const handlePost = async (
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string
  ) => {
    try {
      // 如果有文件直接上传（multipart/form-data）
      const contentType = req.headers["content-type"] || "";
      logger.info("接收到的请求", { contentType, hasBody: !!req.body });

      if (contentType.includes("multipart/form-data")) {
        const { files, fields } = await parseForm(req);

        logger.info("解析表单结果", {
          filesKeys: Object.keys(files),
          fieldsKeys: Object.keys(fields),
          file: files.file,
        });

       const fileArray = Array.isArray(files.file) ? files.file : [files.file];
  const file = fileArray[0] as FormidableFile | undefined;

  if (!file || !file.filepath) {
    logger.warn("未找到上传文件", { files, fields });
    return sendWarnningResponse(res, "未找到上传文件");
  }

  logger.info("文件解析成功", {
    originalFilename: file.originalFilename,
    size: file.size,
    mimetype: file.mimetype,
  });


        // 读取文件内容
        const fs = require("fs");
        const fileBuffer = fs.readFileSync(file.filepath);

        // 保存到本地存储
        const result = await saveFileToLocal(
          fileBuffer,
          file.originalFilename || "unknown.pdf",
          userId,
          "paper"
        );

        if (!result.success || !result.filePath) {
          return sendWarnningResponse(res, result.error || "文件保存失败");
        }

        // 保存到数据库
        const paperTitle = fields.title?.toString() || file.originalFilename || "未命名论文";
        const paper = await upsertUploadedPaper({
          user_id: userId,
          title: paperTitle,
          authors: fields.authors?.toString(),
          abstract: fields.abstract?.toString(),
          keywords: fields.keywords?.toString(),
          file_path: result.filePath,
          file_name: result.fileName || file.originalFilename || "",
          file_size: BigInt(file.size),
          file_type: file.originalFilename?.split(".").pop() || "pdf",
          mime_type: file.mimetype || "application/pdf",
        });

        logger.info("论文上传成功（表单方式）", {
          userId,
          paperId: paper.id,
          filePath: result.filePath,
        });

        // 异步触发文件内容解析
        triggerFileParsing(paper.id).catch((error) => {
          logger.error("触发文件解析失败", { paperId: paper.id, error: error.message });
        });

        return sendSuccessResponse(res, "上传成功", {
          id: paper.id,
          title: paper.title,
          file_name: paper.fileName,
          file_size: Number(paper.fileSize),
          file_type: paper.fileType,
          parse_status: paper.parseStatus,
          cos_key: result.filePath, // 兼容前端，返回文件路径
        });
      }
      // 如果不是 multipart/form-data，则处理 JSON 数据
      const { cos_key, file_name, file_size, file_type, title, authors, keywords } = req.body;

    // 如果是通过 cos_key 创建记录（已上传到COS或本地的场景）
    if (!cos_key || !file_name) {
      return sendWarnningResponse(res, "缺少必要参数：cos_key 或 file_name");
    }

    // 检查是否是本地路径（以 papers/ 或 covers/ 开头）
    const isLocalPath = cos_key.startsWith("papers/") || cos_key.startsWith("covers/") || cos_key.startsWith("avatars/");

    let filePath = cos_key;
    let fileSize = file_size || 0;

    // 如果是本地路径，验证文件是否存在
    if (isLocalPath) {
      const fileInfo = checkFileExists(cos_key);

      if (!fileInfo.exists) {
        return sendWarnningResponse(res, "文件不存在，请先上传文件");
      }

      if (fileInfo.size) {
        fileSize = fileInfo.size;
      }
    }

    // 保存到数据库
    const paper = await upsertUploadedPaper({
      user_id: userId,
      title: title || file_name,
      authors,
      keywords,
      file_path: filePath,
      file_name,
      file_size: BigInt(fileSize),
      file_type: file_type || file_name.split(".").pop() || "pdf",
      mime_type: "application/pdf", // 默认MIME类型
    });

    logger.info("论文记录创建成功", {
      userId,
      paperId: paper.id,
      filePath,
      parseStatus: paper.parseStatus,
    });

    // 异步触发文件内容解析
    triggerFileParsing(paper.id).catch((error) => {
      logger.error("触发文件解析失败", { paperId: paper.id, error: error.message });
    });

    return sendSuccessResponse(res, "创建成功", {
      id: paper.id,
      title: paper.title,
      file_name: paper.fileName,
      file_size: Number(paper.fileSize),
      file_type: paper.fileType,
      parse_status: paper.parseStatus,
      cos_key: filePath, // 兼容前端
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("论文上传失败", { userId, error: errorMessage });
    throw error;
  }
};

/**
 * GET - 获取论文列表（可选）
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    // 这里可以添加获取用户论文列表的逻辑
    // 暂时返回空列表
    return sendSuccessResponse(res, "获取成功", {
      items: [],
      total: 0,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("获取论文列表失败", { userId, error: errorMessage });
    throw error;
  }
};

/**
 * 论文管理 API
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
  withErrorHandler(handler, { logPrefix: "AI伴读论文管理" })
);
