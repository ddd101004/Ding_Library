// pages/api/auth/reset-pwd.ts
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { withMonitoring } from "@/middleware/monitoring/withMonitoring";
import { REGISTER_TYPE } from "@/constants";
import {
  getUserByPhoneNumber,
  updateUserByPhoneNumber,
} from "@/db/user";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { hashPassword, verifyVerificationCode } from "@/utils/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { validateStrings, validatePhone } from "@/utils/validateString";

/**
 * POST - 重置密码
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const { phone_number, password, verification_code } = req.body;

  // 参数长度校验
  const validationError = validateStrings([
    { value: password, fieldName: "密码", options: { limitKey: "password" } },
    {
      value: verification_code,
      fieldName: "验证码",
      options: { limitKey: "verification_code" },
    },
  ]);
  if (validationError) {
    return sendWarnningResponse(res, validationError);
  }

  // 验证手机号格式
  const phoneResult = validatePhone(phone_number);
  if (!phoneResult.valid) {
    return sendWarnningResponse(res, phoneResult.error || "手机号校验失败");
  }

  // 检查用户是否存在
  const user = await getUserByPhoneNumber(phone_number);

  if (!user) {
    sendWarnningResponse(res, "该手机号未注册");
    return;
  }

  // 检查验证码是否过期（10分钟有效期）
  const now = new Date();
  const codeSendTime = user.code_send_time;
  if (codeSendTime) {
    const timeDiff = now.getTime() - codeSendTime.getTime();
    const tenMinutes = 10 * 60 * 1000; // 10分钟

    if (timeDiff > tenMinutes) {
      sendWarnningResponse(res, "验证码已过期，请重新获取");
      return;
    }
  }

  // 使用 bcrypt 验证验证码
  const isCodeValid = user.verification_code
    ? await verifyVerificationCode(verification_code, user.verification_code)
    : false;

  if (!isCodeValid) {
    sendWarnningResponse(res, "验证码错误");
    return;
  }

  // 验证码正确，重置密码
  const pwd = Buffer.from(password, "base64").toString();
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
  if (!passwordRegex.test(pwd)) {
    sendWarnningResponse(res, "密码必须至少6位，且包含字母和数字");
    return;
  }

  const hashedPassword = await hashPassword(pwd);

  // 重置密码后清空验证码
  const updatedUser = await updateUserByPhoneNumber(phone_number, {
    hashed_password: hashedPassword,
    verification_code: null,
    code_send_time: null,
  });

  if (!updatedUser) {
    sendWarnningResponse(res, "密码重置失败");
    return;
  }

  sendSuccessResponse(res, "密码重置成功");
};

/**
 * 重置密码 API
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    return await handlePost(req, res);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withMonitoring(
  withErrorHandler(handler, { logPrefix: "重置密码", useLogger: true }),
  {
    monitorType: "business",
    operationName: "password_reset",
    extractMetadata: (req) => ({
      phoneNumber: "***masked***",
    }),
    successMetric: "password_reset_success",
    failureMetric: "password_reset_error",
  }
);
