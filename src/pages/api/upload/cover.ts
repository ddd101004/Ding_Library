/**
 * 封面图上传 API
 *
 * 用于上传知识库封面图，保存到本地文件系统
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
import logger from "@/helper/logger";

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
    maxFileSize: 2 * 1024 * 1024, // 2MB
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
 * POST - 上传封面图
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    // 解析表单数据
    const { files } = await parseForm(req);

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
      file.originalFilename || "cover.jpg",
      userId,
      "cover"
    );

    if (!result.success || !result.filePath) {
      return sendWarnningResponse(res, result.error || "封面图保存失败");
    }

    logger.info("封面图上传成功", {
      userId,
      filePath: result.filePath,
      fileSize: file.size,
    });

    return sendSuccessResponse(res, "上传成功", {
      file_path: result.filePath,
      file_url: `/uploads/${result.filePath}`, // 访问 URL
      file_name: result.fileName,
      file_size: file.size,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("封面图上传失败", { userId, error: errorMessage });
    throw error;
  }
};

/**
 * 封面图上传 API
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
  withErrorHandler(handler, { logPrefix: "封面图上传" })
);
