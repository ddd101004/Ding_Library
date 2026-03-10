// pages/api/auth/login.ts
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  getUserByPhoneNumber,
  resetCodeAttemptCount,
  lockUserAccount,
  incrementCodeAttemptCount,
  clearVerificationCode,
} from "@/db/user";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  generateJWT,
  verifyPassword,
  verifyVerificationCode,
} from "@/utils/auth";
import logRequest from "@/middleware/monitoring/logRequest";
import { withMonitoring } from "@/middleware/monitoring/withMonitoring";
import logger from "@/helper/logger";
import { NextApiRequest, NextApiResponse } from "next";
import { validateStrings, validatePhone } from "@/utils/validateString";

// 验证码最大尝试次数
const MAX_ATTEMPTS = 5;
// 锁定时间（毫秒）：15分钟
const LOCK_DURATION = 15 * 60 * 1000;

/**
 * POST - 用户登录
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const { phone_number, password, verification_code } = req.body;

  // 验证手机号
  const phoneResult = validatePhone(phone_number);
  if (!phoneResult.valid) {
    return sendWarnningResponse(res, phoneResult.error || "手机号校验失败");
  }

  // 验证密码或验证码长度
  if (password) {
    const pwdError = validateStrings([
      { value: password, fieldName: "密码", options: { limitKey: "password" } },
    ]);
    if (pwdError) {
      return sendWarnningResponse(res, pwdError);
    }
  } else if (verification_code) {
    const codeError = validateStrings([
      {
        value: verification_code,
        fieldName: "验证码",
        options: { limitKey: "verification_code" },
      },
    ]);
    if (codeError) {
      return sendWarnningResponse(res, codeError);
    }
  }

  // 获取用户信息
  const user = await getUserByPhoneNumber(phone_number);

  if (!user) {
    sendWarnningResponse(res, `该用户未注册，请先注册`);
    return;
  }

  // 密码登录
  if (password) {
    const pwd = Buffer.from(password, "base64").toString();
    const isValid = await verifyPassword(pwd, user.hashed_password);

    if (!isValid) {
      sendWarnningResponse(res, "密码错误，请重新输入");
      return;
    }
  }
  // 验证码登录
  else if (verification_code) {
    // 检查账户是否被锁定
    if (
      user.code_locked_until &&
      new Date(user.code_locked_until) > new Date()
    ) {
      const remainingMinutes = Math.ceil(
        (new Date(user.code_locked_until).getTime() - Date.now()) / 60000
      );
      return res.status(429).json({
        message: `验证码尝试次数过多，账户已锁定${remainingMinutes}分钟`,
      });
    }

    // 如果锁定时间已过，重置计数器
    if (
      user.code_locked_until &&
      new Date(user.code_locked_until) <= new Date()
    ) {
      await resetCodeAttemptCount(user.user_id);
    }

    // 验证验证码 - 使用bcrypt比较
    const isCodeValid = user.verification_code
      ? await verifyVerificationCode(
          verification_code,
          user.verification_code
        )
      : false;

    if (!isCodeValid) {
      const attemptCount = (user.code_attempt_count || 0) + 1;

      // 如果达到最大尝试次数，锁定账户
      if (attemptCount >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION);
        await lockUserAccount(user.user_id, lockUntil, attemptCount);
        return res.status(429).json({
          message: `验证码错误次数过多，账户已锁定15分钟`,
        });
      }

      // 更新尝试次数
      await incrementCodeAttemptCount(user.user_id, attemptCount);

      const remainingAttempts = MAX_ATTEMPTS - attemptCount;
      sendWarnningResponse(
        res,
        `验证码错误，还剩${remainingAttempts}次尝试机会`
      );
      return;
    }

    // 检查验证码是否过期（5分钟）
    if (user.code_send_time) {
      const timeDiff = Date.now() - new Date(user.code_send_time).getTime();
      if (timeDiff > 5 * 60 * 1000) {
        sendWarnningResponse(res, "验证码已过期，请重新获取");
        return;
      }
    }

    // 验证成功后清空验证码和计数器
    await clearVerificationCode(user.user_id);
  } else {
    sendWarnningResponse(res, "请输入密码或验证码");
    return;
  }

  // 生成JWT
  const token = await generateJWT(user.user_id);

  logger.info("登录成功", {
    userId: user.user_id,
    method: password ? "password" : "code",
  });

  // 返回用户数据
  sendSuccessResponse(res, "登录成功", {
    token,
    phone_number: user.phone_number,
    user_id: user.user_id,
    username: user.username,
  });
};

/**
 * 用户登录 API
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  logRequest(req, res);

  if (req.method === "POST") {
    return await handlePost(req, res);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

// 导出：监控包装 + 错误处理
export default withMonitoring(
  withErrorHandler(handler, { logPrefix: "用户登录", useLogger: true }),
  {
  monitorType: "business",
  operationName: "user_login",
  extractMetadata: (req) => ({
    phoneNumber: req.body.phone_number
      ? req.body.phone_number.slice(0, 3) +
        "****" +
        req.body.phone_number.slice(-4)
      : "unknown",
    loginMethod: req.body.password
      ? "password"
      : req.body.verification_code
      ? "verification_code"
      : "unknown",
  }),
  successMetric: "login_success",
  failureMetric: "login_error",
});
