import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { updateUserProfile, getUserProfile } from "@/db/user";
import {
  generateAvatarUploadSignature,
  deleteAvatar,
  getAvatarSignedUrl,
  validateAvatarFile,
  AVATAR_CONSTANTS,
} from "@/lib/cos/cosClient";
import logger from "@/helper/logger";
import { validateString } from "@/utils/validateString";

/**
 * 头像管理 API
 *
 * POST   /api/user/avatar - 获取上传签名（前端直传 COS）
 * PUT    /api/user/avatar - 确认上传完成，更新数据库
 * DELETE /api/user/avatar - 删除头像
 * GET    /api/user/avatar - 获取头像 URL
 *
 * @requires Authentication - 需要用户登录
 */

/**
 * 获取头像上传签名（前端直传用）
 *
 * 流程：
 * 1. 前端调用此接口获取签名
 * 2. 前端使用签名直传文件到 COS
 * 3. 前端调用 PUT 接口确认上传完成
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { file_name, file_size, file_type } = req.body;

  // 验证参数
  const fileNameResult = validateString(file_name, "文件名", { limitKey: "file_name" });
  if (!fileNameResult.valid) {
    return sendWarnningResponse(res, fileNameResult.error || "文件名校验失败");
  }

  if (!file_size || typeof file_size !== "number" || file_size <= 0) {
    return sendWarnningResponse(res, "文件大小无效");
  }

  // 获取文件扩展名
  const ext = file_type || file_name.split(".").pop()?.toLowerCase() || "";

  // 验证文件
  const validation = validateAvatarFile(ext, file_size);
  if (!validation.valid) {
    return sendWarnningResponse(res, validation.error || "文件验证失败");
  }

  try {
    // 生成上传签名
    const signature = await generateAvatarUploadSignature({
      user_id: userId,
      file_type: ext,
      file_size,
    });

    logger.info("生成头像上传签名", {
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
    logger.error("生成头像上传签名失败", { userId, error: errorMessage });
    throw error;
  }
};

/**
 * 确认头像上传完成，更新数据库
 */
const handlePut = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { cos_key } = req.body;

  // 验证参数
  const cosKeyResult = validateString(cos_key, "cos_key", { limitKey: "file_path" });
  if (!cosKeyResult.valid) {
    return sendWarnningResponse(res, cosKeyResult.error || "cos_key 校验失败");
  }

  // 验证 cos_key 格式
  if (!cos_key.startsWith("avatars/")) {
    return sendWarnningResponse(res, "无效的 cos_key");
  }

  // 获取旧头像的 cos_key，用于后续删除
  const oldUser = await getUserProfile(userId);
  const oldAvatarKey = oldUser?.avatar || null;

  // 更新数据库
  const updatedUser = await updateUserProfile(userId, {
    avatar: cos_key,
  });

  if (!updatedUser) {
    return sendWarnningResponse(res, "头像更新失败");
  }

  // 删除旧头像
  if (oldAvatarKey) {
    await deleteAvatar(oldAvatarKey);
  }

  // 生成签名 URL 返回给前端
  const signedUrl = getAvatarSignedUrl(cos_key);

  logger.info("头像更新成功", {
    userId,
    cosKey: cos_key,
  });

  return sendSuccessResponse(res, "头像更新成功", {
    avatar: signedUrl,
    avatar_key: cos_key,
  });
};

/**
 * 删除头像
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  // 获取当前头像
  const user = await getUserProfile(userId);

  if (!user) {
    return sendWarnningResponse(res, "用户不存在");
  }

  if (!user.avatar) {
    return sendWarnningResponse(res, "当前没有头像");
  }

  // 删除 COS 文件
  await deleteAvatar(user.avatar);

  // 清空数据库中的头像字段
  const updatedUser = await updateUserProfile(userId, { avatar: "" });

  if (!updatedUser) {
    return sendWarnningResponse(res, "删除失败");
  }

  logger.info("头像删除成功", { userId });

  return sendSuccessResponse(res, "头像已删除");
};

/**
 * 获取头像（生成带签名的临时 URL）
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const user = await getUserProfile(userId);

  if (!user) {
    return sendWarnningResponse(res, "用户不存在");
  }

  if (!user.avatar) {
    return sendSuccessResponse(res, "获取成功", {
      avatar: null,
      config: {
        allowed_types: AVATAR_CONSTANTS.ALLOWED_TYPES,
        max_size: AVATAR_CONSTANTS.MAX_SIZE,
      },
    });
  }

  // 生成签名 URL
  const avatarUrl = getAvatarSignedUrl(user.avatar);

  return sendSuccessResponse(res, "获取成功", {
    avatar: avatarUrl,
    config: {
      allowed_types: AVATAR_CONSTANTS.ALLOWED_TYPES,
      max_size: AVATAR_CONSTANTS.MAX_SIZE,
    },
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else if (req.method === "PUT") {
    return await handlePut(req, res, userId);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET、POST、PUT 和 DELETE 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "头像管理", useLogger: true })
);
