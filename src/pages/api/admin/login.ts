import { NextApiRequest, NextApiResponse } from "next";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { getUserByPhoneNumber } from "@/db/user";
import { sendSuccessResponse, sendWarnningResponse, sendMethodNotAllowedResponse } from "@/helper/responseHelper";
import { generateJWT, verifyPassword } from "@/utils/auth";
import { ADMIN_ROLE } from "@/constants";
import logRequest from "@/middleware/monitoring/logRequest";
import logger from "@/helper/logger";
import { validateStrings, validatePhone } from "@/utils/validateString";

/**
 * POST - 管理员登录（仅允许管理员账号）
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const { phone_number, password } = req.body;

  // 验证手机号
  const phoneResult = validatePhone(phone_number);
  if (!phoneResult.valid) {
    return sendWarnningResponse(res, phoneResult.error || "手机号校验失败");
  }

  // 验证密码
  if (!password) {
    return sendWarnningResponse(res, "请输入密码");
  }
  const pwdError = validateStrings([
    { value: password, fieldName: "密码", options: { limitKey: "password" } },
  ]);
  if (pwdError) {
    return sendWarnningResponse(res, pwdError);
  }

  // 获取用户信息
  const user = await getUserByPhoneNumber(phone_number);

  if (!user) {
    return sendWarnningResponse(res, "该账号不存在");
  }

  // 验证是否为管理员
  if (user.role !== ADMIN_ROLE) {
    return sendWarnningResponse(res, "该账号不是管理员");
  }

  // 验证密码
  const pwd = Buffer.from(password, "base64").toString();
  const isValid = await verifyPassword(pwd, user.hashed_password);

  if (!isValid) {
    return sendWarnningResponse(res, "密码错误");
  }

  // 生成JWT
  const token = await generateJWT(user.user_id);

  logger.info("管理员登录成功", { userId: user.user_id });

  sendSuccessResponse(res, "登录成功", {
    token,
    phone_number: user.phone_number,
    user_id: user.user_id,
    username: user.username,
    role: user.role,
  });
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  logRequest(req, res);
  if (req.method === "POST") {
    return await handlePost(req, res);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withErrorHandler(handler, { logPrefix: "管理员登录", useLogger: true });