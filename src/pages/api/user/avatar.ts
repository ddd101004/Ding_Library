/**
 * 头像管理 API
 *
 * GET /api/user/avatar - 获取头像 URL（仅返回数据库中的值或默认头像）
 *
 * @requires Authentication - 需要用户登录
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getUserProfile } from "@/db/user";
import logger from "@/helper/logger";

/**
 * 获取头像 URL
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

  let avatarUrl: string | null = null;

  if (user.avatar) {
    // 判断是本地路径还是 COS URL
    if (user.avatar.startsWith('avatars/') || user.avatar.startsWith('covers/')) {
      // 本地存储路径
      avatarUrl = `/api/uploads/${user.avatar}`;
    } else if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
      // 完整 URL（COS 或其他）
      avatarUrl = user.avatar;
    } else {
      // 旧的 COS 路径格式
      avatarUrl = `https://library-cos.centum-cloud.com/${user.avatar}`;
    }
  }

  logger.info("获取头像", { userId, hasAvatar: !!user.avatar, avatarUrl });

  return sendSuccessResponse(res, "获取成功", {
    avatar: avatarUrl, // 如果没有头像，返回 null
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 请求（头像上传功能已禁用）");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "头像管理", useLogger: true })
);
