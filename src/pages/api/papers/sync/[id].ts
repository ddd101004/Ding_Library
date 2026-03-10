import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getSyncLogById } from "@/db/ebscoSyncLog";
import { validateId } from "@/utils/validateString";

/**
 * GET - 获取同步日志详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "日志 ID");
  if (!idResult.valid) {
    sendWarnningResponse(res, idResult.error || "日志 ID 校验失败");
    return;
  }

  const log = await getSyncLogById(id as string);

  if (!log) {
    sendWarnningResponse(res, "日志不存在");
    return;
  }

  // 解析详细日志JSON
  let detailLog = null;
  if (log.detail_log) {
    try {
      detailLog = JSON.parse(log.detail_log);
    } catch {
      detailLog = log.detail_log;
    }
  }

  sendSuccessResponse(res, "获取日志详情成功", {
    ...log,
    detail_log: detailLog,
  });
};

/**
 * 同步日志详情 API
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
  withErrorHandler(handler, { logPrefix: "同步日志详情" })
);
