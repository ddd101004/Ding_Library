import { findCommonConfigList } from "@/db/commonConfig";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * GET - 获取配置列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const result = await findCommonConfigList("cow");
  return sendSuccessResponse(res, "获取成功", result);
};

/**
 * 通用配置 API
 *
 * GET /api/common-config - 获取配置列表
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "通用配置列表" })
);
