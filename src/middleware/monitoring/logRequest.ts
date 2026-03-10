import logger from "@/helper/logger";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * 请求日志配置
 */
interface LogRequestOptions {
  slowThreshold?: number; // 慢请求阈值（毫秒），默认 2000
  skipHealthCheck?: boolean; // 跳过健康检查接口，默认 true
  logBody?: boolean; // 是否记录请求体，默认 false
}

/**
 * 增强版请求日志中间件
 * 自动记录所有请求的基本信息、响应时间、用户信息
 */
const logRequest = (
  req: NextApiRequest,
  res: NextApiResponse,
  options: LogRequestOptions = {}
) => {
  const {
    slowThreshold = 2000,
    skipHealthCheck = true,
    logBody = false,
  } = options;

  // 跳过健康检查
  if (skipHealthCheck && req.url?.includes('/alive')) {
    return;
  }

  const start = Date.now();
  const isDev = process.env.NODE_ENV === 'development';
  const path = req.url?.split('?')[0] || 'unknown';

  // 记录请求完成后的回调函数
  const logOnFinish = () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // 清理请求体（移除敏感信息）
    let sanitizedBody: any = undefined;
    if (logBody && req.body) {
      sanitizedBody = { ...req.body };
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key', 'hashed_password'];
      sensitiveFields.forEach(field => {
        if (sanitizedBody[field]) {
          sanitizedBody[field] = '***REDACTED***';
        }
      });
    }

    // 判断是否需要记录日志
    const isSlow = duration > slowThreshold;
    const isError = statusCode >= 400;
    const shouldLog = isDev || isSlow || isError;

    if (shouldLog) {
      const logLevel = isError ? 'error' : isSlow ? 'warn' : 'info';
      const logData: any = {
        method: req.method,
        path,
        statusCode,
        duration,
        ip: getClientIp(req),
      };

      // 标记慢请求
      if (isSlow) {
        logData.slow = true;
      }

      // 开发环境或记录请求体
      if (isDev || logBody) {
        if (sanitizedBody && Object.keys(sanitizedBody).length > 0) {
          const bodyStr = JSON.stringify(sanitizedBody);
          logData.body = bodyStr.length > 1000 ? '(body too large)' : sanitizedBody;
        }
      }

      logger[logLevel](
        `${req.method} ${path} - ${statusCode} - ${duration}ms`,
        logData
      );
    }
  };

  // 监听请求完成事件
  res.once("finish", logOnFinish);
};

/**
 * 获取客户端 IP
 */
function getClientIp(req: NextApiRequest): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

export default logRequest;

