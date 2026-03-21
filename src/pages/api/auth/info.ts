import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getUserProfile } from "@/db/user";

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
 * 获取用户信息
 * GET /api/auth/info - 获取用户信息
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
 * 用户信息 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "用户信息", useLogger: true })
);
