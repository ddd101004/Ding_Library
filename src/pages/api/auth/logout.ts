import { updateUserByUserId } from "@/db/user";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * POST - 用户登出
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  await updateUserByUserId(userId, {
    session_id: "",
  });

  return sendSuccessResponse(res, "登出成功");
};

/**
 * 用户登出 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "用户登出" })
);
