/**
 * 手动触发同步任务API
 *
 * 功能：
 * - POST - 手动触发论文同步
 * - GET - 获取最近的同步日志
 */

import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  triggerSyncManually,
} from "@/scripts/scheduleTasks";
import { getSyncLogsByType } from "@/db/ebscoSyncLog";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";

/**
 * POST - 手动触发同步任务
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
) => {
  const { type } = req.query;

  const validTypes = ["wanfang_papers", "wanfang_en_papers"];
  if (validTypes.indexOf(type as string) === -1) {
    throw new Error(`无效的同步类型，只支持 ${validTypes.join("、")}`);
  }

  // 触发相应的任务
  let result;
  if (type === "wanfang_papers") {
    result = await triggerSyncManually("zh");
  } else if (type === "wanfang_en_papers") {
  }

  sendSuccessResponse(res, "同步任务已触发", result);
};

/**
 * GET - 获取同步日志
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
) => {
  const { type, limit, page } = req.query;

  const limitNum = parseLimitParam(limit, 10);
  const pageNum = parsePageNumber(page);

  const validTypes = ["wanfang_papers", "wanfang_en_papers"];
  const syncType = type && validTypes.indexOf(type as string) !== -1 ? (type as string) : undefined;

  const { logs, total } = await getSyncLogsByType({
    syncType,
    page: pageNum,
    size: limitNum,
  });

  sendSuccessResponse(res, "获取同步日志成功", {
    logs,
    total,
    page: pageNum,
    size: limitNum,
    total_pages: Math.ceil(total / limitNum),
  });
};

/**
 * 论文同步任务管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "论文同步任务" }),
);
