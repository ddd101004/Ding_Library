import { NextApiRequest, NextApiResponse } from "next";
import { sendErrorResponse } from "@/helper/responseHelper";
import logger from "@/helper/logger";

/**
 * API 错误处理配置
 */
interface ErrorHandlerOptions {
  /** 错误日志前缀，用于识别是哪个接口出错 */
  logPrefix?: string;
  /** 返回给用户的默认错误消息（仅当 exposeErrorMessage 为 false 时使用） */
  defaultMessage?: string;
  /** 是否使用 logger 而不是 console.error */
  useLogger?: boolean;
  /** 是否将实际错误信息暴露给客户端（默认 true，业务错误应该暴露） */
  exposeErrorMessage?: boolean;
}

/**
 * 错误处理高阶函数
 * 统一处理 API 接口的错误，消除重复的 try-catch 模式
 *
 * @param handler - API 处理函数
 * @param options - 错误处理配置
 * @returns 包装后的处理函数
 *
 * @example
 * // 基础用法 - 使用默认错误消息
 * const handler = withErrorHandler(
 *   async (req, res, userId) => {
 *     // 业务逻辑，无需 try-catch
 *     const data = await someOperation();
 *     sendSuccessResponse(res, "操作成功", data);
 *   },
 *   { logPrefix: "获取用户信息" }
 * );
 *
 * @example
 * // 与 withAuth 组合使用
 * export default withAuth(
 *   withErrorHandler(
 *     async (req, res, userId) => {
 *       // 业务逻辑
 *     },
 *     { logPrefix: "论文搜索", defaultMessage: "搜索失败，请稍后再试" }
 *   )
 * );
 */
export function withErrorHandler<T extends unknown[]>(
  handler: (req: NextApiRequest, res: NextApiResponse, ...args: T) => Promise<void>,
  options: ErrorHandlerOptions = {}
): (req: NextApiRequest, res: NextApiResponse, ...args: T) => Promise<void> {
  const {
    logPrefix = "API请求",
    defaultMessage = "操作失败，请稍后再试",
    useLogger = false,
    exposeErrorMessage = true,
  } = options;

  return async (req: NextApiRequest, res: NextApiResponse, ...args: T) => {
    try {
      await handler(req, res, ...args);
    } catch (error: unknown) {
      // 如果响应已发送，不再处理
      if (res.writableEnded) {
        return;
      }

      // 提取错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录错误日志
      if (useLogger) {
        logger.error(`${logPrefix}失败`, { error: errorMessage, stack: error instanceof Error ? error.stack : undefined });
      } else {
        console.error(`${logPrefix}失败:`, error);
      }

      // 返回错误响应：如果允许暴露错误信息，则使用实际错误信息；否则使用默认消息
      const responseMessage = exposeErrorMessage ? errorMessage : defaultMessage;
      sendErrorResponse(res, responseMessage, error);
    }
  };
}

/**
 * 简化版错误处理器
 * 适用于不需要自定义配置的场景
 *
 * @param handler - API 处理函数
 * @param logPrefix - 错误日志前缀
 * @returns 包装后的处理函数
 *
 * @example
 * export default withAuth(
 *   handleErrors(async (req, res, userId) => {
 *     // 业务逻辑
 *   }, "用户收藏")
 * );
 */
export function handleErrors<T extends unknown[]>(
  handler: (req: NextApiRequest, res: NextApiResponse, ...args: T) => Promise<void>,
  logPrefix: string
): (req: NextApiRequest, res: NextApiResponse, ...args: T) => Promise<void> {
  return withErrorHandler(handler, { logPrefix });
}

export default withErrorHandler;
