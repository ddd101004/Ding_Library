// pages/api/auth/send-code.ts
import {
  ACCOUNT_NAME,
  VERIFICATION_CODE_INTERVAL,
  VERIFICATION_CODE_MAX_COUNT_PER_MINUTE,
} from "@/constants";
import {
  generateVerificationCode,
  upsertVerificationCode,
  getUserByPhoneNumber,
} from "@/db/user";
import {
  sendErrorResponse,
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import logRequest from "@/middleware/monitoring/logRequest";
import sendSms from "@/service/notification/sms";
import logger from "@/helper/logger";
import { NextApiRequest, NextApiResponse } from "next";
import { validatePhone, validateString } from "@/utils/validateString";

/**
 * POST - 发送验证码
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  // 验证参数
  const { phone_number, type } = req.body;

  // 验证手机号格式
  const phoneResult = validatePhone(phone_number);
  if (!phoneResult.valid) {
    return sendWarnningResponse(res, phoneResult.error || "手机号校验失败");
  }

  // 验证类型
  const typeResult = validateString(type, "验证码类型", { max: 20 });
  if (!typeResult.valid) {
    return sendWarnningResponse(res, typeResult.error || "验证码类型校验失败");
  }
  if (!["register", "login", "resetPassword"].includes(type)) {
    return sendWarnningResponse(res, "请指定有效的验证码类型");
  }

  // 根据类型检查用户状态
  const existingUser = await getUserByPhoneNumber(phone_number);
  if (type === "register") {
    // 只有用户存在且有密码，才算已正式注册
    // 临时用户（无密码）允许重新发送验证码
    if (
      existingUser &&
      existingUser.hashed_password &&
      existingUser.hashed_password !== ""
    ) {
      sendWarnningResponse(res, "该手机号已注册，请直接登录");
      return;
    }
  } else {
    if (!existingUser) {
      sendWarnningResponse(res, "手机号未注册");
      return;
    }
  }

  // 检查发送频率（1分钟内最多发送5次）
  const now = new Date();
  if (existingUser) {
    const codeSendTime = existingUser.code_send_time;
    const currentCount = existingUser.code_send_count_minute || 0;

    // 计算时间差（毫秒）
    const timeDiff = codeSendTime
      ? now.getTime() - codeSendTime.getTime()
      : Infinity;

    // 如果在1分钟内
    if (timeDiff < VERIFICATION_CODE_INTERVAL * 1000 && timeDiff >= 0) {
      // 检查是否达到最大发送次数
      if (currentCount >= VERIFICATION_CODE_MAX_COUNT_PER_MINUTE) {
        sendWarnningResponse(
          res,
          `1分钟内最多只能发送${VERIFICATION_CODE_MAX_COUNT_PER_MINUTE}次验证码`
        );
        return;
      }
    }
  }

  const verificationCode = generateVerificationCode();

  // 使用新的函数名，只需要两个参数
  const user = await upsertVerificationCode(phone_number, verificationCode);

  if (!user) {
    sendWarnningResponse(res, "验证码发送失败");
    return;
  }

  // 发送短信
  await sendSms(phone_number, verificationCode);
  logger.info(
    `短信发送成功，手机号: ${phone_number}，验证码: ${verificationCode}`
  );
  sendSuccessResponse(res, `验证码已发送至您的${ACCOUNT_NAME}`);
};

/**
 * 发送验证码 API
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  logRequest(req, res);

  try {
    if (req.method === "POST") {
      return await handlePost(req, res);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持POST请求");
    }
  } catch (error: unknown) {
    // 对 error 进行类型检查
    const errorMessage = error instanceof Error ? error.message : "未知错误";

    // 根据错误类型返回不同提示
    if (
      errorMessage.includes("该手机号今日短信发送次数已达上限") ||
      errorMessage.includes("手机号格式不正确")
    ) {
      sendWarnningResponse(res, errorMessage);
    } else if (errorMessage.includes("短信余额不足")) {
      sendErrorResponse(res, errorMessage);
    } else {
      sendErrorResponse(res, "验证码发送失败,请稍后再试", error);
    }
  }
};

export default handler;
