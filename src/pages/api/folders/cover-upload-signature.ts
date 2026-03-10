import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  generateCoverImageUploadSignature,
  validateCoverImageFile,
  COVER_IMAGE_CONSTANTS,
} from "@/lib/cos/cosClient";
import logger from "@/helper/logger";
import { validateString } from "@/utils/validateString";

/**
 * POST - 获取文件夹封面图上传签名
 *
 * 用于前端直传文件到 COS，返回预签名 URL
 *
 * @requires Authentication - 需要用户登录
 * @param file_name - 文件名
 * @param file_size - 文件大小（字节）
 * @param file_type - 文件类型（可选，从文件名自动提取）
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { file_name, file_size, file_type } = req.body;

  // 验证参数
  const nameResult = validateString(file_name, "文件名", { max: 255 });
  if (!nameResult.valid) {
    return sendWarnningResponse(res, nameResult.error || "文件名校验失败");
  }

  if (!file_size || typeof file_size !== "number" || file_size <= 0) {
    return sendWarnningResponse(res, "文件大小无效");
  }

  // 获取文件扩展名
  const ext = file_type || file_name.split(".").pop()?.toLowerCase() || "";

  // 验证文件
  const validation = validateCoverImageFile(ext, file_size);
  if (!validation.valid) {
    return sendWarnningResponse(res, validation.error || "文件验证失败");
  }

  try {
    // 生成上传签名
    const signature = await generateCoverImageUploadSignature({
      user_id: userId,
      file_type: ext,
      file_size,
    });

    logger.info("生成封面图上传签名", {
      userId,
      fileName: file_name,
      fileSize: file_size,
      cosKey: signature.cos_key,
    });

    return sendSuccessResponse(res, "获取上传签名成功", {
      cos_key: signature.cos_key,
      signed_url: signature.signed_url,
      expires_at: signature.expires_at,
      method: signature.method,
      headers: signature.headers,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("生成封面图上传签名失败", { userId, error: errorMessage });
    throw error;
  }
};

/**
 * 封面图上传签名 API
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
  withErrorHandler(handler, { logPrefix: "封面图上传签名" })
);
