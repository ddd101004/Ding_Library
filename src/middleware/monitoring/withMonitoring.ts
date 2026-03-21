import { NextApiRequest, NextApiResponse } from "next";
import {
  ExternalApiMonitor,
  DatabaseMonitor,
  BusinessOperationMonitor,
  recordBusinessMetric,
} from "./apiMonitor";
import logger from "@/helper/logger";

/**
 * 监控配置选项
 */
export interface MonitoringOptions {
  /**
   * 监控类型
   * - 'external_api': 第三方 API 调用监控
   * - 'business': 业务逻辑监控
   * - 'none': 不使用专用监控（仅依赖 logRequest）
   */
  monitorType?: "external_api" | "business" | "none";

  /**
   * 操作名称
   * - external_api: API 名称（如 'searchPapers', 'chat-completion'）
   * - business: 业务操作名（如 'user_login', 'verify_code'）
   */
  operationName?: string;

  /**
   * 第三方 API 提供商（仅 external_api 类型需要）
   * 如：'aminer', 'openai', 'wechat'
   */
  apiProvider?: string;

  /**
   * 从请求中提取元数据的函数
   * 返回的对象会被传递给监控器
   */
  extractMetadata?: (req: NextApiRequest) => Record<string, any>;

  /**
   * 从响应数据中提取结果计数
   */
  extractResultCount?: (data: any) => number;

  /**
   * 成功时记录的业务指标名称
   */
  successMetric?: string;

  /**
   * 失败时记录的业务指标名称
   */
  failureMetric?: string;

  /**
   * 是否记录详细的请求/响应数据
   * 默认 false（只在开发环境记录）
   */
  logDetails?: boolean;
}

/**
 * 高阶函数：为 API handler 添加自动监控
 *
 * @example
 * // 业务逻辑监控
 * export default withMonitoring(
 *   async (req, res) => {
 *     // 业务逻辑
 *     return { success: true, userId: '123' };
 *   },
 *   {
 *     monitorType: 'business',
 *     operationName: 'user_login',
 *     extractMetadata: (req) => ({ phoneNumber: req.body.phone_number }),
 *     successMetric: 'login_success',
 *     failureMetric: 'login_failed',
 *   }
 * );
 *
 * @example
 * // 第三方 API 监控
 * export default withMonitoring(
 *   async (req, res) => {
 *     const results = await searchPapers(req.body.keyword);
 *     return { success: true, data: results };
 *   },
 *   {
 *     monitorType: 'external_api',
 *     apiProvider: 'wanfang',
 *     operationName: 'searchPapers',
 *     extractMetadata: (req) => ({ keyword: req.body.keyword }),
 *     extractResultCount: (data) => data?.length || 0,
 *   }
 * );
 */
export function withMonitoring<T = any>(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse
  ) => Promise<T | void>,
  options: MonitoringOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const {
      monitorType = "none",
      operationName,
      apiProvider,
      extractMetadata,
      extractResultCount,
      successMetric,
      failureMetric,
      logDetails = false,
    } = options;

    const startTime = Date.now();
    const isDev = process.env.NODE_ENV === "development";

    // 提取元数据
    const metadata = extractMetadata ? extractMetadata(req) : {};

    // 创建监控器
    let monitor:
      | ExternalApiMonitor
      | BusinessOperationMonitor
      | null = null;

    if (monitorType === "external_api" && apiProvider && operationName) {
      monitor = new ExternalApiMonitor(apiProvider, operationName, metadata);
    } else if (monitorType === "business" && operationName) {
      monitor = new BusinessOperationMonitor(operationName, metadata);
    }

    // 记录开始
    if (isDev || logDetails) {
      logger.info(`API Handler Started: ${req.method} ${req.url}`, {
        metadata,
      });
    }

    try {
      // 执行业务逻辑
      const result = await handler(req, res);

      // 记录成功
      const duration = Date.now() - startTime;

      if (monitor) {
        if (monitor instanceof ExternalApiMonitor) {
          const resultCount = extractResultCount
            ? extractResultCount(result)
            : undefined;
          monitor.success(resultCount, { duration });
        } else {
          monitor.success(result);
        }
      }

      // 记录业务指标
      if (successMetric) {
        recordBusinessMetric(successMetric, {
          ...metadata,
          duration,
        });
      }

      if (isDev || logDetails) {
        logger.info(`API Handler Completed: ${req.method} ${req.url}`, {
          duration,
          metadata,
        });
      }

      return result;
    } catch (error) {
      // 记录失败
      const duration = Date.now() - startTime;

      if (monitor) {
        monitor.failure(error as Error);
      }

      // 记录业务指标
      if (failureMetric) {
        recordBusinessMetric(failureMetric, {
          ...metadata,
          errorMessage:
            error instanceof Error ? error.message : String(error),
          duration,
        });
      }

      logger.error(`API Handler Failed: ${req.method} ${req.url}`, {
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        metadata,
        duration,
      });

      throw error;
    }
  };
}

/**
 * 为需要鉴权的接口添加监控
 * 配合 authMiddleware 使用
 *
 * @example
 * export default withAuth(
 *   withAuthMonitoring(
 *     async (req, res, userId) => {
 *       // 业务逻辑
 *     },
 *     {
 *       monitorType: 'business',
 *       operationName: 'get_user_favorites',
 *     }
 *   )
 * );
 */
export function withAuthMonitoring<T = any>(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string
  ) => Promise<T | void>,
  options: MonitoringOptions = {}
) {
  return async (
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string
  ) => {
    const {
      monitorType = "none",
      operationName,
      apiProvider,
      extractMetadata,
      extractResultCount,
      successMetric,
      failureMetric,
      logDetails = false,
    } = options;

    const startTime = Date.now();
    const isDev = process.env.NODE_ENV === "development";

    // 提取元数据（自动包含 userId）
    const baseMetadata = extractMetadata ? extractMetadata(req) : {};
    const metadata = { ...baseMetadata, userId };

    // 创建监控器
    let monitor:
      | ExternalApiMonitor
      | BusinessOperationMonitor
      | null = null;

    if (monitorType === "external_api" && apiProvider && operationName) {
      monitor = new ExternalApiMonitor(apiProvider, operationName, metadata);
    } else if (monitorType === "business" && operationName) {
      monitor = new BusinessOperationMonitor(operationName, metadata);
    }

    // 记录开始
    if (isDev || logDetails) {
      logger.info(`Auth API Handler Started: ${req.method} ${req.url}`, {
        userId,
        metadata,
      });
    }

    try {
      // 执行业务逻辑
      const result = await handler(req, res, userId);

      // 记录成功
      const duration = Date.now() - startTime;

      if (monitor) {
        if (monitor instanceof ExternalApiMonitor) {
          const resultCount = extractResultCount
            ? extractResultCount(result)
            : undefined;
          monitor.success(resultCount, { duration });
        } else {
          monitor.success(result);
        }
      }

      // 记录业务指标
      if (successMetric) {
        recordBusinessMetric(successMetric, {
          ...metadata,
          duration,
        });
      }

      if (isDev || logDetails) {
        logger.info(`Auth API Handler Completed: ${req.method} ${req.url}`, {
          userId,
          duration,
          metadata,
        });
      }

      return result;
    } catch (error) {
      // 记录失败
      const duration = Date.now() - startTime;

      if (monitor) {
        monitor.failure(error as Error);
      }

      // 记录业务指标
      if (failureMetric) {
        recordBusinessMetric(failureMetric, {
          ...metadata,
          errorMessage:
            error instanceof Error ? error.message : String(error),
          duration,
        });
      }

      logger.error(`Auth API Handler Failed: ${req.method} ${req.url}`, {
        userId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
        metadata,
        duration,
      });

      throw error;
    }
  };
}
