import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  getUserNotificationSettings,
  updateUserNotificationSettings,
} from "@/db/user";
import logger from "@/helper/logger";

/**
 * 通知设置 API
 * GET  /api/user/settings/notifications - 获取通知设置
 * PATCH /api/user/settings/notifications - 更新通知设置
 */

/**
 * 获取通知设置
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const settings = await getUserNotificationSettings(userId);

  if (!settings) {
    return sendWarnningResponse(res, "获取设置失败");
  }

  return sendSuccessResponse(res, "获取成功", {
    doc_delivery: settings.notify_doc_delivery,
  });
};

/**
 * 更新通知设置
 */
const handlePatch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { doc_delivery } = req.body;

  // 验证参数
  if (doc_delivery === undefined) {
    return sendWarnningResponse(res, "请提供要更新的设置");
  }

  if (typeof doc_delivery !== "boolean") {
    return sendWarnningResponse(res, "参数格式错误");
  }

  const updatedSettings = await updateUserNotificationSettings(userId, {
    notify_doc_delivery: doc_delivery,
  });

  if (!updatedSettings) {
    return sendWarnningResponse(res, "更新失败");
  }

  logger.info("通知设置更新成功", {
    userId,
    doc_delivery,
  });

  return sendSuccessResponse(res, "更新成功", {
    doc_delivery: updatedSettings.notify_doc_delivery,
  });
};

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
  withErrorHandler(handler, { logPrefix: "通知设置", useLogger: true })
);
