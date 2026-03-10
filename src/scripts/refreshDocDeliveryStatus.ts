/**
 * 全文传递状态刷新定时任务
 *
 * 功能：
 * 1. 查询所有进行中的全文传递请求（状态 1-4）
 * 2. 调用第三方接口刷新状态
 * 3. 状态变为完成（8）时创建用户通知
 */

import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { getDocDelivery } from "@/service/docDelivery";
import { updateDocDeliveryRequest } from "@/db/docDeliveryRequest";
import { createNotification } from "@/db/userNotification";
import { getUserNotificationSettings } from "@/db/user";

/**
 * 刷新结果统计
 */
interface RefreshResult {
  total: number;
  updated: number;
  completed: number;
  failed: number;
  notified: number;
  errors: string[];
}

/**
 * 刷新所有进行中的全文传递请求状态
 */
export async function refreshDocDeliveryStatus(): Promise<RefreshResult> {
  const result: RefreshResult = {
    total: 0,
    updated: 0,
    completed: 0,
    failed: 0,
    notified: 0,
    errors: [],
  };

  try {
    // 查询所有进行中的请求（状态 1-4）
    const pendingRequests = await prisma.docDeliveryRequest.findMany({
      where: {
        status: { in: [1, 2, 3, 4] },
      },
      select: {
        id: true,
        user_id: true,
        task_id: true,
        title: true,
        paper_id: true,
        status: true,
      },
    });

    result.total = pendingRequests.length;

    if (pendingRequests.length === 0) {
      logger.info("没有进行中的全文传递请求需要刷新");
      return result;
    }

    logger.info(`开始刷新 ${pendingRequests.length} 个全文传递请求状态`);

    // 逐个刷新状态（避免并发过高）
    for (const request of pendingRequests) {
      try {
        // 调用第三方接口查询状态
        const apiResult = await getDocDelivery({ taskId: request.task_id });

        if (apiResult.code !== 200 && apiResult.code !== 0) {
          result.errors.push(
            `请求 ${request.id} 查询失败: ${apiResult.msg || "未知错误"}`
          );
          result.failed++;
          continue;
        }

        const newStatus = apiResult.data.status;
        const oldStatus = request.status;

        // 状态无变化，跳过
        if (newStatus === oldStatus) {
          continue;
        }

        // 更新数据库状态
        const isCompleted = newStatus === 8 || newStatus === 9;
        const updatedRequest = await updateDocDeliveryRequest(request.id, {
          status: newStatus,
          ...(isCompleted ? { completed_time: new Date() } : {}),
        });

        if (!updatedRequest) {
          result.errors.push(`请求 ${request.id} 更新数据库失败`);
          result.failed++;
          continue;
        }

        result.updated++;

        // 状态变为完成成功（8）时创建通知
        if (oldStatus !== 8 && newStatus === 8) {
          result.completed++;

          // 检查用户是否开启了通知
          const notifySettings = await getUserNotificationSettings(
            request.user_id
          );
          if (notifySettings?.notify_doc_delivery !== false) {
            await createNotification({
              user_id: request.user_id,
              notification_type: "doc_delivery",
              title: "文献传递完成",
              content: `您请求的文献《${request.title}》已传递成功`,
              related_type: "doc_delivery_request",
              related_id: request.id,
              metadata: {
                task_id: request.task_id,
                paper_title: request.title,
                paper_id: request.paper_id,
              },
            });

            result.notified++;

            logger.info("创建文献传递完成通知", {
              userId: request.user_id,
              requestId: request.id,
              title: request.title,
            });
          }
        }

        logger.debug("刷新请求状态成功", {
          requestId: request.id,
          oldStatus,
          newStatus,
        });

        // 添加延迟避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        result.errors.push(`请求 ${request.id} 处理失败: ${errorMessage}`);
        result.failed++;
      }
    }

    logger.info("全文传递状态刷新完成", result);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`全文传递状态刷新任务失败: ${errorMessage}`, { error });
    result.errors.push(errorMessage);
    return result;
  }
}

// 如果直接运行此脚本（用于手动测试）
if (require.main === module) {
  refreshDocDeliveryStatus()
    .then((result) => {
      console.log("刷新完成:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("刷新失败:", error);
      process.exit(1);
    });
}
