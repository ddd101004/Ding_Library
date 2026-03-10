/**
 * 定时任务调度器
 *
 * 功能：
 * 1. 每天定时同步论文数据（中文凌晨1点，外文凌晨2点）
 * 2. 每天定时下载PDF文件（默认凌晨3点）
 * 3. 每5分钟刷新一次全文传递状态
 * 4. 所有定时任务的执行时间可通过配置调整
 */

// 加载环境变量（独立进程运行时必需）
import dotenv from "dotenv";
import path from "path";

// 根据 NODE_ENV 加载对应的 .env 文件
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

import cron from "node-cron";
import logger from "@/helper/logger";
import { syncWanfangZhPapers, syncWanfangEnPapers } from "./syncWanfang";
import { downloadPdfs } from "./downloadPdfs";
import { refreshDocDeliveryStatus } from "./refreshDocDeliveryStatus";

/**
 * 启动所有定时任务
 */
export async function startScheduledTasks() {
  logger.info("========== 定时任务调度器启动 ==========");

  try {
    const syncZhCron = "0 1 * * *";
    const syncEnCron = "0 2 * * *";
    const downloadCron = "0 3 * * *";
    const docDeliveryCron = "*/5 * * * *";

    logger.info("定时任务配置", {
      syncZhCron,
      syncEnCron,
      downloadCron,
      docDeliveryCron,
    });

    const syncZhTask = cron.schedule(
      syncZhCron,
      async () => {
        logger.info("========== 开始执行万方中文论文同步任务 ==========");
        try {
          const result = await syncWanfangZhPapers();
          logger.info("万方中文论文同步任务完成", result);
        } catch (error: any) {
          logger.error("万方中文论文同步任务执行失败", {
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Shanghai",
      },
    );

    logger.info("万方中文论文同步任务已注册", { cron: syncZhCron });

    const syncEnTask = cron.schedule(
      syncEnCron,
      async () => {
        logger.info("========== 开始执行万方外文论文同步任务 ==========");
        try {
          const result = await syncWanfangEnPapers();
          logger.info("万方外文论文同步任务完成", result);
        } catch (error: any) {
          logger.error("万方外文论文同步任务执行失败", {
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Shanghai",
      },
    );

    logger.info("万方外文论文同步任务已注册", { cron: syncEnCron });

    const downloadTask = cron.schedule(
      downloadCron,
      async () => {
        logger.info("========== 开始执行PDF下载任务 ==========");
        try {
          const result = await downloadPdfs();
          logger.info("PDF下载任务完成", result);
        } catch (error: any) {
          logger.error("PDF下载任务执行失败", {
            error: error.message,
            stack: error.stack,
          });
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Shanghai",
      },
    );

    logger.info("PDF下载任务已注册", { cron: downloadCron });

    const docDeliveryTask = cron.schedule(
      docDeliveryCron,
      async () => {
        try {
          const result = await refreshDocDeliveryStatus();
          if (result.total > 0) {
            logger.info("全文传递状态刷新任务完成", result);
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          logger.error("全文传递状态刷新任务执行失败", {
            error: errorMessage,
          });
        }
      },
      {
        scheduled: true,
        timezone: "Asia/Shanghai",
      },
    );

    logger.info("全文传递状态刷新任务已注册", { cron: docDeliveryCron });

    const shutdown = () => {
      logger.info("========== 定时任务调度器正在关闭 ==========");
      syncZhTask.stop();
      syncEnTask.stop();
      downloadTask.stop();
      docDeliveryTask.stop();
      logger.info("所有定时任务已停止");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    logger.info("========== 定时任务调度器启动完成 ==========", {
      tasks: [
        "万方中文论文同步",
        "万方外文论文同步",
        "PDF下载",
        "全文传递状态刷新",
      ],
      timezone: "Asia/Shanghai",
    });

    logger.info("调度器运行中，按 Ctrl+C 停止...");
  } catch (error: any) {
    logger.error("定时任务调度器启动失败", {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

/**
 * 手动触发论文同步任务
 */
export async function triggerSyncManually(type: "zh" | "en" = "en") {
  logger.info(`手动触发万方${type === "zh" ? "中文" : "外文"}论文同步任务`);
  try {
    const result =
      type === "zh" ? await syncWanfangZhPapers() : await syncWanfangEnPapers();
    logger.info("手动同步任务完成", result);
    return result;
  } catch (error: any) {
    logger.error("手动同步任务失败", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 手动触发PDF下载任务
 */
export async function triggerDownloadManually() {
  logger.info("手动触发PDF下载任务");
  try {
    const result = await downloadPdfs();
    logger.info("手动下载任务完成", result);
    return result;
  } catch (error: any) {
    logger.error("手动下载任务失败", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  startScheduledTasks().catch((error) => {
    console.error("定时任务调度器启动失败:", error);
    process.exit(1);
  });
}
