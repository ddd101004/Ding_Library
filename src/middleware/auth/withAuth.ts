import { UNAUTHORIZED_TIPS } from "@/constants";
import { findUserByUserIdInner, updateOperateTime } from "@/db/user";
import { NextApiRequest, NextApiResponse } from "next";
import { verifyJWT } from "@/utils/auth";
import logRequest from "@/middleware/monitoring/logRequest";
import {
  sendUnauthorizedResponse,
  sendErrorResponse,
} from "@/helper/responseHelper";

/**
 * 认证中间件（高阶函数模式）
 * @param handler - 实际的API处理函数，接收 (req, res, userId) 参数
 * @param options - 配置选项
 * @returns Next.js API路由处理函数
 *
 * @example
 * export default withAuth(async (req, res, userId) => {
 *   // 处理业务逻辑
 *   // userId 已经过验证且用户未被禁用
 * });
 */
export const withAuth = (
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    userId: string
  ) => Promise<void>,
  options: {
    allowGuest?: boolean; // 是否允许游客访问
  } = {}
) => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // 记录请求日志
    logRequest(req, res);

    const { allowGuest = false } = options;
    const authHeader = req.headers.authorization;
    const fingerprint = (req.headers.xcookie as string) || "";
    const authed = authHeader && authHeader.startsWith("Bearer ");

    // 未认证且不允许游客访问
    if (!authed && !fingerprint && !allowGuest) {
      sendUnauthorizedResponse(res);
      return;
    }

    if (authed) {
      // 登录用户
      const token = authHeader.substring(7);

      // 单独 try-catch JWT 验证
      let decoded;
      try {
        decoded = await verifyJWT(token);
      } catch (jwtError) {
        // JWT 验证失败，直接返回 401
        sendUnauthorizedResponse(res);
        return;
      }

      const { userId } = decoded;

      if (userId) {
        try {
          // 查询用户信息
          const userInfo = await findUserByUserIdInner(userId);

          // 用户不存在或已禁用
          if (!userInfo) {
            sendUnauthorizedResponse(res, "用户不存在");
            return;
          }

          if (userInfo.disabled_status) {
            sendUnauthorizedResponse(
              res,
              "该用户因违规使用，已被封禁，如有疑问请联系客服处理"
            );
            return;
          }

          // 调用实际的处理函数
          await handler(req, res, userId);

          // 更新用户操作时间（异步执行，不阻塞响应）
          updateOperateTime(userId).catch((err) => {
            // 静默处理错误，不影响主流程
          });
        } catch (error) {
          // 捕获业务逻辑错误
          // 如果 handler 内部已经发送了响应（有 try-catch），这里不会执行
          // 如果 handler 抛出错误或 findUserByUserIdInner 抛错，这里会捕获
          if (!res.writableEnded) {
            // 响应还未发送，返回 500
            console.error("API处理失败:", error);
            sendErrorResponse(res, "服务器内部错误", error);
          }
          // 如果响应已发送，说明 handler 内部已处理错误，不做任何操作
        }
      } else {
        sendUnauthorizedResponse(res);
      }
    } else {
      sendUnauthorizedResponse(res);
    }
  };
};
