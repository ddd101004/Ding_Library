import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getUserProfile, updateUserProfile, isEmailTaken } from "@/db/user";
import logger from "@/helper/logger";

/**
 * 生成头像 URL（兼容本地和 COS）
 */
function getAvatarUrl(avatar: string | null): string | null {
  if (!avatar) return null;

  // 本地存储路径
  if (avatar.startsWith('avatars/') || avatar.startsWith('covers/')) {
    return `/api/uploads/${avatar}`;
  }

  // 完整 URL（COS 或其他）
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }

  // 旧的 COS 路径格式
  return `https://library-cos.centum-cloud.com/${avatar}`;
}

/**
 * 用户信息 API
 * GET   /api/auth/info - 获取用户信息
 * PATCH /api/auth/info - 更新用户资料
 */

/**
 * 获取用户信息
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

  return sendSuccessResponse(res, "获取成功", {
    user_id: user.user_id,
    nickname: user.nickname || user.username,
    email: user.email,
    phone_number: user.phone_number || null,
    avatar: getAvatarUrl(user.avatar || "") || null,
    company_name: user.company_name,
    create_time: user.create_time,
  });
};

/**
 * 更新用户资料
 */
const handlePatch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { nickname, email } = req.body;

  // 至少需要一个更新字段
  if (!nickname && !email) {
    return sendWarnningResponse(res, "请提供要更新的信息");
  }

  // 验证昵称
  if (nickname !== undefined) {
    if (typeof nickname !== "string") {
      return sendWarnningResponse(res, "昵称格式错误");
    }
    const trimmedNickname = nickname.trim();
    if (trimmedNickname.length < 2 || trimmedNickname.length > 50) {
      return sendWarnningResponse(res, "昵称长度应在2-50个字符之间");
    }
  }

  // 验证邮箱
  if (email !== undefined) {
    if (typeof email !== "string") {
      return sendWarnningResponse(res, "邮箱格式错误");
    }
    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      // 邮箱格式校验
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return sendWarnningResponse(res, "邮箱格式不正确");
      }
      // 检查邮箱是否已被使用
      const emailExists = await isEmailTaken(trimmedEmail, userId);
      if (emailExists) {
        return sendWarnningResponse(res, "该邮箱已被其他用户使用");
      }
    }
  }

  // 构建更新数据
  const updateData: { nickname?: string; email?: string } = {};
  if (nickname !== undefined) {
    updateData.nickname = nickname.trim();
  }
  if (email !== undefined) {
    updateData.email = email.trim() || null;
  }

  const updatedUser = await updateUserProfile(userId, updateData);

  if (!updatedUser) {
    return sendWarnningResponse(res, "更新失败");
  }

  logger.info("用户资料更新成功", { userId, updateData });

  return sendSuccessResponse(res, "更新成功", {
    user_id: updatedUser.user_id,
    nickname: updatedUser.nickname || updatedUser.username,
    email: updatedUser.email,
    phone_number: updatedUser.phone_number || null,
    avatar: getAvatarUrl(updatedUser.avatar || "") || null,
  });
};

/**
 * 用户信息 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else if (req.method === "PATCH") {
    return await handlePatch(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 和 PATCH 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "用户信息", useLogger: true })
);
