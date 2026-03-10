import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { generateUploadSignature } from "@/lib/cos/cosClient";
import { validateFile, getMimeType } from "@/utils/fileUtils";
import { MAX_FILE_SIZE } from "@/constants";
import logger from "@/helper/logger";

/**
 * POST - 获取 COS 上传签名
 *
 * 用于前端直传文件到 COS，返回预签名 URL
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { file_name, file_size, file_type } = req.body;

  // 统一文件校验
  const validation = validateFile({
    file_name,
    file_size,
    file_type,
    max_size: MAX_FILE_SIZE,
  });

  if (!validation.valid) {
    return sendWarnningResponse(res, validation.error!);
  }

  const actualFileType = validation.file_type!;

  try {
    // 生成上传签名
    const signature = await generateUploadSignature({
      file_name,
      file_size,
      file_type: actualFileType,
      user_id: userId,
      expires: 1800, // 30 分钟有效期
    });

    logger.info("生成 COS 上传签名", {
      userId,
      fileName: file_name,
      fileSize: file_size,
      fileType: actualFileType,
      cosKey: signature.cos_key,
    });

    return sendSuccessResponse(res, "获取上传签名成功", {
      cos_key: signature.cos_key,
      signed_url: signature.signed_url,
      expires_at: signature.expires_at,
      // 前端直传需要的额外信息
      method: "PUT",
      headers: {
        "Content-Type": getMimeType(actualFileType),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("获取 COS 上传签名失败", {
      userId,
      fileName: file_name,
      error: errorMessage,
    });
    throw error;
  }
};

/**
 * COS 上传签名 API
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
  withErrorHandler(handler, { logPrefix: "COS上传签名" })
);
