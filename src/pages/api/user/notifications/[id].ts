/**
 * 单条通知操作 API
 * PATCH /api/user/notifications/:id - 标记单条通知为已读
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
  sendErrorResponse,
} from "@/helper/responseHelper";
import { markNotificationAsRead } from "@/db/userNotification";
import logRequest from "@/middleware/monitoring/logRequest";
import { validateId } from "@/utils/validateString";

const handleMarkAsRead = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  logRequest(req, res);

  const { id } = req.query;

  const idResult = validateId(id, "通知 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "通知 ID 校验失败");
  }

  const success = await markNotificationAsRead(id as string, userId);

  if (!success) {
    return sendWarnningResponse(res, "通知不存在或已读");
  }

  return sendSuccessResponse(res, "标记成功");
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "PATCH") {
      return await handleMarkAsRead(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持 PATCH 请求");
    }
  } catch (error) {
    console.error("标记通知已读失败:", error);
    return sendErrorResponse(res, "操作失败，请稍后再试");
  }
};

export default withAuth(handler);
