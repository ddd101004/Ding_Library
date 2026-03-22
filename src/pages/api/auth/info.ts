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
 * 获取用户信息
 * GET /api/auth/info - 获取用户信息（只读，不支持修改）
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
    phone_number: user.phone_number || null,
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
