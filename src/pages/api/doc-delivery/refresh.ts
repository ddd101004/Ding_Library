import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getDocDelivery } from "@/service/docDelivery";
import {
  getDocDeliveryRequestById,
  getDocDeliveryRequestByTaskId,
  updateDocDeliveryRequest,
} from "@/db/docDeliveryRequest";
import { createNotification } from "@/db/userNotification";
import { getUserNotificationSettings } from "@/db/user";
import logger from "@/helper/logger";
import { validateId, validateString } from "@/utils/validateString";

/**
 * 查询/刷新全文传递任务状态 API
 * POST /api/doc-delivery/refresh
 *
 * @requires Authentication - 需要用户登录
 * @param id - 请求记录ID（二选一）
 * @param task_id - 第三方任务ID（二选一）
 * @returns 任务状态（如有本地记录则同步更新数据库）
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id, task_id } = req.body;

  // 验证参数：id 或 task_id 至少有一个
  const idResult = validateId(id, "记录 ID", false);
  const taskIdResult = validateString(task_id, "任务 ID", { limitKey: "task_id", required: false });

  if (!idResult.valid && id) {
    return sendWarnningResponse(res, idResult.error || "记录 ID 校验失败");
  }
  if (!taskIdResult.valid && task_id) {
    return sendWarnningResponse(res, taskIdResult.error || "任务 ID 校验失败");
  }
  if (!id && !task_id) {
    return sendWarnningResponse(res, "请提供记录ID或任务ID");
  }

  let request = null;
  let taskIdToQuery: string;

  // 优先使用 id 查询本地记录
  if (id) {
    request = await getDocDeliveryRequestById(id);
    if (!request) {
      return sendWarnningResponse(res, "请求记录不存在");
    }
    // 验证权限
    if (request.user_id !== userId) {
      return sendWarnningResponse(res, "无权操作此记录");
    }
    taskIdToQuery = request.task_id;
  } else {
    // 使用 task_id，尝试查找本地记录
    taskIdToQuery = task_id;
    request = await getDocDeliveryRequestByTaskId(task_id);
    // 如果找到记录，验证权限
    if (request && request.user_id !== userId) {
      return sendWarnningResponse(res, "无权操作此记录");
    }
  }

  // 如果有本地记录且已是终态，直接返回
  if (request && (request.status === 8 || request.status === 9)) {
    return sendSuccessResponse(res, "任务已完成", {
      id: request.id,
      task_id: request.task_id,
      status: request.status,
      status_text: request.status_text,
      fulltext_url: request.fulltext_url,
      completed_time: request.completed_time,
    });
  }

  // 调用第三方接口查询状态
  const result = await getDocDelivery({ taskId: taskIdToQuery });

  if (result.code !== 200 && result.code !== 0) {
    return sendWarnningResponse(res, result.msg || "查询状态失败");
  }

  const newStatus = result.data.status;
  const statusText = result.data.status_text;
  const isCompleted = newStatus === 8 || newStatus === 9;

  // 如果有本地记录，更新数据库
  if (request) {
    const oldStatus = request.status;
    const updatedRequest = await updateDocDeliveryRequest(request.id, {
      status: newStatus,
      ...(isCompleted ? { completed_time: new Date() } : {}),
    });

    if (!updatedRequest) {
      return sendWarnningResponse(res, "更新状态失败");
    }

    // 状态从非完成变为完成成功（status === 8）时，创建通知
    if (oldStatus !== 8 && newStatus === 8) {
      // 检查用户是否开启了文献传递通知
      const notifySettings = await getUserNotificationSettings(userId);
      if (notifySettings?.notify_doc_delivery !== false) {
        // 创建通知
        await createNotification({
          user_id: userId,
          notification_type: "doc_delivery",
          title: "文献传递完成",
          content: `您请求的文献《${request.title}》已传递成功`,
          related_type: "doc_delivery_request",
          related_id: request.id,
          metadata: {
            task_id: taskIdToQuery,
            paper_title: request.title,
            paper_id: request.paper_id,
          },
        });

        logger.info("创建文献传递完成通知", {
          userId,
          requestId: request.id,
          title: request.title,
        });
      }
    }

    logger.info("刷新全文传递状态成功", {
      requestId: request.id,
      taskId: taskIdToQuery,
      oldStatus: request.status,
      newStatus,
    });

    return sendSuccessResponse(res, "查询成功", {
      id: updatedRequest.id,
      task_id: taskIdToQuery,
      status: updatedRequest.status,
      status_text: updatedRequest.status_text,
      fulltext_url: updatedRequest.fulltext_url,
      completed_time: updatedRequest.completed_time,
    });
  }

  // 没有本地记录，仅返回查询结果
  logger.info("查询全文传递状态成功（无本地记录）", {
    taskId: taskIdToQuery,
    status: newStatus,
  });

  return sendSuccessResponse(res, "查询成功", {
    task_id: taskIdToQuery,
    status: newStatus,
    status_text: statusText,
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 POST 请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "刷新全文传递状态", useLogger: true }),
    {
      monitorType: "external_api",
      apiProvider: "doc_delivery",
      operationName: "refreshDocDeliveryStatus",
      extractMetadata: (req) => ({
        requestId: req.body.id,
        taskId: req.body.task_id,
      }),
      successMetric: "doc_delivery_refresh_success",
      failureMetric: "doc_delivery_refresh_error",
    }
  )
);
