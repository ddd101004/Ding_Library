/**
 * 获取未读通知数量 API
 * GET /api/user/notifications/unread-count
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
  sendErrorResponse,
} from "@/helper/responseHelper";
import {
  getUnreadNotificationCount,
  getUnreadCountByType,
} from "@/db/userNotification";
import logRequest from "@/middleware/monitoring/logRequest";

const handleGetUnreadCount = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  logRequest(req, res);

  // 获取总未读数量
  const unreadCount = await getUnreadNotificationCount(userId);

  // 获取分类未读数量
  const byType = await getUnreadCountByType(userId);

  return sendSuccessResponse(res, "获取成功", {
    unread_count: unreadCount,
    by_type: byType,
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "GET") {
      return await handleGetUnreadCount(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
    }
  } catch (error) {
    console.error("获取未读通知数量失败:", error);
    return sendErrorResponse(res, "获取失败，请稍后再试");
  }
};

export default withAuth(handler);
