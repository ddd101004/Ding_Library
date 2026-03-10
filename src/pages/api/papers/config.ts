import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import logger from "@/helper/logger";
import {
  getAllConfigsGrouped,
  getPublicConfigs,
  getConfigValue,
  batchUpdateConfigs,
} from "@/db/ebscoConfig";
import {
  getSessionCacheStatus,
  getSessionCount,
} from "@/service/ebsco/session";
import { getTokenCacheStatus } from "@/service/ebsco/auth";

/**
 * GET - 获取配置
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type = "all" } = req.query;

  logger.info("获取EBSCO配置", { type });

  if (type === "public") {
    // 只返回公开配置
    const configs = await getPublicConfigs();
    sendSuccessResponse(res, "获取公开配置成功", configs);
    return;
  }

  if (type === "status") {
    // 返回系统状态信息
    const syncDailyCount = await getConfigValue<number>(
      "ebsco.sync.daily_count",
      100
    );
    const downloadDailyCount = await getConfigValue<number>(
      "ebsco.download.daily_count",
      100
    );
    const downloadRateLimit = await getConfigValue<number>(
      "ebsco.download.rate_limit",
      5
    );

    const status = {
      sync: {
        dailyCount: syncDailyCount,
        cron: await getConfigValue("ebsco.sync.cron", "0 2 * * *"),
      },
      download: {
        dailyCount: downloadDailyCount,
        rateLimit: downloadRateLimit,
        cron: await getConfigValue("ebsco.download.cron", "0 3 * * *"),
      },
      cache: {
        sessions: getSessionCacheStatus(),
        sessionCount: getSessionCount(),
        tokens: getTokenCacheStatus(),
      },
    };

    sendSuccessResponse(res, "获取状态成功", status);
    return;
  }

  // 返回所有配置（分组）
  const configs = await getAllConfigsGrouped();
  sendSuccessResponse(res, "获取配置成功", configs);
};

/**
 * PUT - 更新配置
 */
const handlePut = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const updates = req.body;

  if (!updates || !Array.isArray(updates)) {
    sendWarnningResponse(res, "请提供要更新的配置数组");
    return;
  }

  logger.info("批量更新EBSCO配置", { count: updates.length });

  // 验证更新项
  for (const update of updates) {
    if (!update.configKey || update.configValue === undefined) {
      sendWarnningResponse(
        res,
        "配置项格式错误，需要包含configKey和configValue"
      );
      return;
    }
  }

  const result = await batchUpdateConfigs(updates);

  if (!result) {
    throw new Error("批量更新配置失败");
  }

  sendSuccessResponse(res, "更新配置成功", {
    total: result.total,
    successful: result.successful,
    failed: result.total - result.successful,
  });
};

/**
 * EBSCO 配置管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else if (req.method === "PUT") {
    return await handlePut(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和PUT请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "EBSCO配置管理", useLogger: true })
);
