/**
 * 通知列表 API
 * GET /api/user/notifications
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
  sendErrorResponse,
} from "@/helper/responseHelper";
import { getUserNotifications, NotificationType } from "@/db/userNotification";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import logRequest from "@/middleware/monitoring/logRequest";

const handleGetNotifications = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  logRequest(req, res);

  const { type, is_read, page, size } = req.query;

  // 解析分页参数
  const pageNum = parsePageNumber(page);
  const sizeNum = parseLimitParam(size);

  // 解析过滤参数
  let notificationType: NotificationType | undefined;
  if (type && type !== "all" && typeof type === "string") {
    notificationType = type as NotificationType;
  }

  let isRead: boolean | undefined;
  if (is_read === "true") {
    isRead = true;
  } else if (is_read === "false") {
    isRead = false;
  }

  const result = await getUserNotifications({
    user_id: userId,
    notification_type: notificationType,
    is_read: isRead,
    page: pageNum,
    size: sizeNum,
  });

  return sendSuccessResponse(res, "获取成功", {
    total: result.total,
    page: pageNum,
    size: sizeNum,
    items: result.items,
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "GET") {
      return await handleGetNotifications(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
    }
  } catch (error) {
    console.error("获取通知列表失败:", error);
    return sendErrorResponse(res, "获取失败，请稍后再试");
  }
};

export default withAuth(handler);
