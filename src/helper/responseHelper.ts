import { NextApiResponse } from "next";
import logger from "./logger";
import { UNAUTHORIZED_TIPS } from "@/constants";

interface JsonResponse {
  code: number;
  message: string;
  data?: any;
}

/**
 * 提取错误信息的辅助函数
 * 将 Error 对象转换为可记录的 JSON 格式
 */
function extractErrorInfo(error: any): object | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return { raw: error };
}

export function sendResponse(
  res: NextApiResponse,
  code: number,
  message: string,
  data: any = null
): void {
  const jsonResponse: JsonResponse = {
    code,
    message,
    data,
  };

  res.status(code).json(jsonResponse);
}

export function sendSuccessResponse(
  res: NextApiResponse,
  message: string = "数据获取成功",
  data: any = null
): void {
  sendResponse(res, 200, message, data);
}

export function sendErrorResponse(
  res: NextApiResponse,
  message: string,
  error?: any
): void {
  sendResponse(res, 501, message, null);

  // 记录完整错误信息
  logger.error(message, {
    statusCode: 501,
    error: extractErrorInfo(error),
  });
}

export function sendWarnningResponse(
  res: NextApiResponse,
  message: string,
  data: any = null
): void {
  sendResponse(res, 503, message, data);

  // 添加警告日志
  logger.warn(message, {
    statusCode: 503,
    data: data || undefined
  });
}

export function sendUnauthorizedResponse(
  res: NextApiResponse,
  message: string = UNAUTHORIZED_TIPS
): void {
  sendResponse(res, 401, message);

  // 记录未授权访问
  logger.warn(message, { statusCode: 401 });
}

// method not allowed
export function sendMethodNotAllowedResponse(
  res: NextApiResponse,
  message: string = "Method Not Allowed"
): void {
  sendResponse(res, 405, message);

  // 记录方法不允许
  logger.warn(message, { statusCode: 405 });
}
