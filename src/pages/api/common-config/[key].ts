import { findConfigByKey, updateConfigByKey } from "@/db/commonConfig";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { NextApiRequest, NextApiResponse } from "next";
import { validateString } from "@/utils/validateString";

/**
 * GET - 查询单个配置
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  key: string
) => {
  const result = await findConfigByKey({
    key,
    source: "cow",
  });

  return sendSuccessResponse(res, "获取成功", result);
};

/**
 * PUT - 更新配置
 */
const handlePut = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  key: string
) => {
  const data = req.body;

  const result = await updateConfigByKey({ ...data, key, source: "cow" });

  if (result?.count) {
    return sendSuccessResponse(res, "更新成功");
  } else {
    throw new Error("更新失败");
  }
};

/**
 * 单个配置 API
 *
 * GET /api/common-config/[key] - 查询单个配置
 * PUT /api/common-config/[key] - 更新配置
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { key } = req.query;

  // 参数校验
  const keyResult = validateString(key, "配置键名", { limitKey: "config_key" });
  if (!keyResult.valid) {
    return sendWarnningResponse(res, keyResult.error || "配置键名校验失败");
  }

  const configKey = key as string;

  if (req.method === "GET") {
    return await handleGet(req, res, userId, configKey);
  } else if (req.method === "PUT") {
    return await handlePut(req, res, userId, configKey);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET/PUT请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "单个配置" })
);
