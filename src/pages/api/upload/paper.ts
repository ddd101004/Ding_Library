/**
 * 论文文件上传 API
 *
 * 用于接收前端上传的论文文件，保存到本地文件系统
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
import { saveFile as saveFileToLocal } from "@/lib/storage/local";
// import { upsertUploadedPaper } from "@/db/ai-reading/uploadedPaper";
import logger from "@/helper/logger";

// 禁用 Next.js 默认的 body parser（因为 formidable 需要原始请求）
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
 * POST - 上传论文文件
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    // 解析表单数据
    const { fields, files } = await parseForm(req);

    // 获取文件
    const file = files.file as FormidableFile | undefined;
    if (!file || !file.filepath) {
      return sendWarnningResponse(res, "未找到上传文件");
    }

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

    // 获取论文元数据（可选）
    const title = fields.title?.toString() || file.originalFilename || "未命名论文";
    const authors = fields.authors?.toString();
    const abstract = fields.abstract?.toString();
    const keywords = fields.keywords?.toString();

    // AI伴读功能已移除,论文上传功能暂时禁用
    logger.info("论文上传功能已禁用", {
      userId,
      fileName: file.originalFilename,
    });

    return sendWarnningResponse(res, "AI伴读功能已移除,论文上传功能暂时不可用");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("论文上传失败", { userId, error: errorMessage });
    throw error;
  }
};

/**
 * 论文上传 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 POST 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "论文上传" })
);
