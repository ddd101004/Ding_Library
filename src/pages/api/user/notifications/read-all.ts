/**
 * 批量标记通知已读 API
 * PATCH /api/user/notifications/read-all
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
  sendErrorResponse,
} from "@/helper/responseHelper";
import {
  markAllNotificationsAsRead,
  NotificationType,
} from "@/db/userNotification";
import logRequest from "@/middleware/monitoring/logRequest";

const handleMarkAllAsRead = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  logRequest(req, res);

  const { type } = req.body || {};

  // 可选：只标记指定类型的通知
  let notificationType: NotificationType | undefined;
  if (type && type !== "all" && typeof type === "string") {
    notificationType = type as NotificationType;
  }

  const updatedCount = await markAllNotificationsAsRead(
    userId,
    notificationType
  );

  return sendSuccessResponse(res, "标记成功", {
    updated_count: updatedCount,
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "PATCH") {
      return await handleMarkAllAsRead(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持 PATCH 请求");
    }
  } catch (error) {
    console.error("批量标记通知已读失败:", error);
    return sendErrorResponse(res, "操作失败，请稍后再试");
  }
};

export default withAuth(handler);
