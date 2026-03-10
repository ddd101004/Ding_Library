// pages/api/auth/register.ts
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { withMonitoring } from "@/middleware/monitoring/withMonitoring";
import {
  getUserByPhoneNumber,
  createUser,
  verifyPhoneNumberCode,
  updateUserByPhoneNumber,
} from "@/db/user";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { generateJWT, hashPassword } from "@/utils/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { validateStrings, validatePhone } from "@/utils/validateString";

/**
 * POST - 用户注册
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const {
    username,
    phone_number,
    password,
    verification_code,
    register_type = "phone",
  } = req.body;

    // 1. 参数长度校验
    const validationError = validateStrings([
      { value: username, fieldName: "用户名", options: { limitKey: "username" } },
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

    try {
      let user;
      
      // 1. 检查手机号是否已注册（排除临时用户）
      const existingUser = await getUserByPhoneNumber(phone_number);
      
      // 如果用户存在且有密码，说明已注册
      if (existingUser && existingUser.hashed_password && existingUser.hashed_password !== '') {
        sendWarnningResponse(res, "该手机号已注册");
        return;
      }

      // 2. 验证短信验证码
      const isCodeValid = await verifyPhoneNumberCode(
        phone_number, 
        verification_code
      );
      if (!isCodeValid) {
        sendWarnningResponse(res, "验证码无效或已过期");
        return;
      }

      // 3. 密码处理
      const pwd = Buffer.from(password, "base64").toString();
      // 密码复杂度验证: 至少6位，包含字母和数字
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
      if (!passwordRegex.test(pwd)) {
        sendWarnningResponse(res, "密码必须至少6位，且包含字母和数字");
        return;
      }
      const hashedPassword = await hashPassword(pwd);

      // 4. 创建或更新用户
      if (existingUser) {
        // 用户存在但没有密码（验证码临时用户），更新用户信息
        user = await updateUserByPhoneNumber(phone_number, {
          username,
          hashed_password: hashedPassword,
          phone_verified: true,
        });
      } else {
        // 全新用户，创建记录
        user = await createUser(
          phone_number,
          username,
          hashedPassword
        );
      }

      if (!user) {
        sendWarnningResponse(res, "用户注册失败,请重试");
        return;
      }

      // 5. 生成 JWT(自动登录)
      const token = await generateJWT(user.user_id);

      // 6. 返回用户数据
      sendSuccessResponse(res, "注册成功", {
        token,
        phone_number: user.phone_number,
        user_id: user.user_id,
        username: user.username,
        register_type,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`注册失败: ${errorMessage}`);
    }
};

/**
 * 用户注册 API
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    return await handlePost(req, res);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withMonitoring(
  withErrorHandler(handler, { logPrefix: "用户注册", useLogger: true }),
  {
    monitorType: "business",
    operationName: "user_register",
    extractMetadata: (req) => ({
      phoneNumber: "***masked***",
      registerType: req.body.register_type || "phone",
    }),
    successMetric: "register_success",
    failureMetric: "register_error",
  }
);