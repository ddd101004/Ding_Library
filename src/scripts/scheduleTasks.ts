/**
 * 定时任务调度器
 *
 * 功能：
 * 1. 每天定时同步论文数据（中文凌晨1点，外文凌晨2点）
 * 2. 所有定时任务的执行时间可通过配置调整
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

/**
 * 启动所有定时任务
 */
export async function startScheduledTasks() {
  logger.info("========== 定时任务调度器启动 ==========");

  try {
    const syncZhCron = "0 1 * * *";
    const syncEnCron = "0 2 * * *";

    logger.info("定时任务配置", {
      syncZhCron,
      syncEnCron,
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

    const shutdown = () => {
      logger.info("========== 定时任务调度器正在关闭 ==========");
      syncZhTask.stop();
      syncEnTask.stop();
      logger.info("所有定时任务已停止");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    logger.info("========== 定时任务调度器启动完成 ==========", {
      tasks: [
        "万方中文论文同步",
        "万方外文论文同步",
      ],
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


// 如果直接运行此脚本
