import logger from "@/helper/logger";

/**
 * 第三方 API 调用监控（通用版）
 * 适用于所有外部 API 调用：Wanfang, EBSCO, OpenAI, 微信, 腾讯云, 等等
 *
 * @example
 * // Wanfang API
 * const monitor = new ExternalApiMonitor('wanfang', 'searchPapers', { keyword: 'AI' });
 *
 * // OpenAI API
 * const monitor = new ExternalApiMonitor('openai', 'chat-completion', { model: 'deepseek-v3' });
 *
 * // 微信 API
 * const monitor = new ExternalApiMonitor('wechat', 'send-message', { userId: '123' });
 */
export class ExternalApiMonitor {
  private apiName: string;
  private apiProvider: string;
  private startTime: number;
  private metadata: Record<string, any>;

  constructor(
    apiProvider: string,
    apiName: string,
    metadata?: Record<string, any>
  ) {
    this.apiProvider = apiProvider;
    this.apiName = apiName;
    this.startTime = Date.now();
    this.metadata = metadata || {};

    logger.info("External API Call Started", {
      provider: this.apiProvider,
      apiName: this.apiName,
      ...this.metadata,
    });
  }

  /**
   * 记录成功调用
   */
  success(resultCount?: number, additionalData?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    logger.info("External API Call Succeeded", {
      provider: this.apiProvider,
      apiName: this.apiName,
      duration,
      resultCount,
      ...this.metadata,
      ...additionalData,
    });
  }

  /**
   * 记录失败调用
   */
  failure(error: any, additionalData?: Record<string, any>) {
    const duration = Date.now() - this.startTime;

    logger.error("External API Call Failed", {
      provider: this.apiProvider,
      apiName: this.apiName,
      duration,
      error: {
        message: error.message,
        code: error.code,
        response: error.response?.data,
      },
      ...this.metadata,
      ...additionalData,
    });
  }

  /**
   * 记录缓存命中
   */
  cacheHit(source: "database" | "redis" | "memory") {
    const duration = Date.now() - this.startTime;

    logger.info("External API Cache Hit", {
      provider: this.apiProvider,
      apiName: this.apiName,
      source,
      duration,
      ...this.metadata,
    });
  }
}

/**
 * 数据库操作监控
 * 用于监控数据库查询性能，自动检测慢查询
 *
 * @example
 * const monitor = new DatabaseMonitor('batchUpsert', 'papers');
 * try {
 *   await prisma.paper.createMany({...});
 *   monitor.success(100);
 * } catch (error) {
 *   monitor.failure(error);
 * }
 */
export class DatabaseMonitor {
  private operation: string;
  private table: string;
  private startTime: number;

  constructor(operation: string, table: string) {
    this.operation = operation;
    this.table = table;
    this.startTime = Date.now();
  }

  /**
   * 记录成功操作
   */
  success(affectedRows?: number) {
    const duration = Date.now() - this.startTime;

    // 只记录慢查询（超过100ms）
    if (duration > 100) {
      logger.warn("Slow Database Operation", {
        operation: this.operation,
        table: this.table,
        duration,
        affectedRows,
      });
    }
  }

  /**
   * 记录失败操作
   */
  failure(error: any) {
    const duration = Date.now() - this.startTime;

    logger.error("Database Operation Failed", {
      operation: this.operation,
      table: this.table,
      duration,
      error: {
        message: error.message,
        code: error.code,
      },
    });
  }
}

/**
 * 业务操作监控
 * 用于记录关键业务逻辑的执行（登录、注册、批量处理等）
 *
 * @example
 * const monitor = new BusinessOperationMonitor('user_login', { phoneNumber: '138****1234' });
 * try {
 *   // 业务逻辑...
 *   monitor.success({ userId: 'xxx' });
 * } catch (error) {
 *   monitor.failure(error);
 * }
 */
export class BusinessOperationMonitor {
  private operationName: string;
  private startTime: number;
  private metadata: Record<string, any>;

  constructor(operationName: string, metadata?: Record<string, any>) {
    this.operationName = operationName;
    this.startTime = Date.now();
    this.metadata = metadata || {};

    logger.info("Business Operation Started", {
      operation: this.operationName,
      ...this.metadata,
    });
  }

  /**
   * 记录成功
   */
  success(result?: any) {
    const duration = Date.now() - this.startTime;

    logger.info("Business Operation Completed", {
      operation: this.operationName,
      duration,
      ...this.metadata,
      ...(result && { result: sanitizeResponse(result) }),
    });
  }

  /**
   * 记录失败
   */
  failure(error: any) {
    const duration = Date.now() - this.startTime;

    logger.error("Business Operation Failed", {
      operation: this.operationName,
      duration,
      error: {
        message: error.message,
        stack: error.stack,
      },
      ...this.metadata,
    });
  }
}

/**
 * 性能指标记录
 *
 * @example
 * recordPerformanceMetric('api_response_time', 850, 'ms', { endpoint: '/api/search' });
 */
export function recordPerformanceMetric(
  metricName: string,
  value: number,
  unit: "ms" | "count" | "bytes",
  tags?: Record<string, any>
) {
  logger.info("Performance Metric", {
    metric: metricName,
    value,
    unit,
    ...tags,
  });
}

/**
 * 业务指标记录
 *
 * @example
 * recordBusinessMetric('paper_search_success', { keyword: 'AI', resultCount: 150 });
 */
export function recordBusinessMetric(
  eventName: string,
  data?: Record<string, any>
) {
  logger.info("Business Event", {
    event: eventName,
    timestamp: new Date().toISOString(),
    ...data,
  });
}

// ========== 辅助函数 ==========

/**
 * 清理响应数据（限制大小）
 */
function sanitizeResponse(data: any): any {
  const dataStr = JSON.stringify(data);

  // 如果响应体过大，只记录摘要
  if (dataStr.length > 1000) {
    return {
      _summary: `Response too large (${dataStr.length} chars)`,
      _keys: Object.keys(data),
    };
  }

  return data;
}
