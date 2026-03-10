import logger from "@/helper/logger";
import { PrismaClient } from "@prisma/client";

const isDev = process.env.NODE_ENV === "development";

// 全局类型声明，用于开发环境缓存 Prisma 实例
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaEventsBound: boolean | undefined;
}

// 创建 Prisma 客户端实例
function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: [
      { emit: "event", level: "query" }, // 查询事件
      { emit: "event", level: "error" }, // 错误事件
      { emit: "event", level: "warn" }, // 警告事件
    ],
  });
}

// 始终使用全局单例模式
// - 开发环境：避免热重载时创建多个连接
// - 生产环境：防止 Serverless 冷启动时连接泄漏
const prisma = globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient());

// 确保事件监听器只注册一次（开发环境热重载时避免重复注册）
if (!globalThis.__prismaEventsBound) {
  globalThis.__prismaEventsBound = true;

  // 监听查询事件 - 智能日志记录
  prisma.$on("query" as never, (e: { duration: number; query: string; params: unknown; target: string }) => {
    const duration = e.duration;

    // 慢查询告警（超过 1 秒）- 生产和开发环境都记录
    if (duration > 1000) {
      logger.warn("Slow Query Detected", {
        query: e.query.slice(0, 200), // 截取前 200 个字符
        duration,
        params: e.params,
        target: e.target,
      });
    } else if (isDev && duration > 100) {
      // 开发环境：仅记录耗时超过 100ms 的查询
      logger.info("Database Query (>100ms)", {
        query: e.query.slice(0, 200),
        duration,
        target: e.target,
      });
    }
    // 普通查询（<100ms）不再记录日志，减少日志量
  });

  // 监听错误事件 - 记录数据库错误
  prisma.$on("error" as never, (e: { message: string; target: string; timestamp: string }) => {
    logger.error("Prisma Error Event", {
      message: e.message,
      target: e.target,
      timestamp: e.timestamp,
    });
  });

  // 监听警告事件 - 记录警告信息
  prisma.$on("warn" as never, (e: { message: string; target: string; timestamp: string }) => {
    logger.warn("Prisma Warning Event", {
      message: e.message,
      target: e.target,
      timestamp: e.timestamp,
    });
  });
}

function handlePrismaError(error: Error) {
  logger.error(`Prisma error: ${error.message}`, { error });
}

// 详细的查询监控已由 Prisma 内置监控处理（见上方的 $on 事件监听）
const handler: ProxyHandler<PrismaClient> = {
  get(target, propKey) {
    const origMethod = target[propKey as keyof PrismaClient];

    if (typeof origMethod === "function") {
      return function (this: PrismaClient, ...args: unknown[]) {
        const boundMethod = (origMethod as Function).bind(this);
        try {
          const result = boundMethod(...args);
          if (result instanceof Promise) {
            return result.catch(handlePrismaError);
          }
          return result;
        } catch (error) {
          return handlePrismaError(error as Error);
        }
      };
    }

    return target[propKey as keyof PrismaClient];
  },
};

const prismaProxy = new Proxy(prisma, handler);
export default prismaProxy;
