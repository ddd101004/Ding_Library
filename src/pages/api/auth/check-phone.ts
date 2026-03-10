import { getUserByPhoneNumber } from "@/db/user";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import logRequest from "@/middleware/monitoring/logRequest";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * POST - 检查手机号是否已注册
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const { phone_number } = req.body;

  if (!phone_number) {
    return sendWarnningResponse(res, "手机号不能为空");
  }

  const user = await getUserByPhoneNumber(phone_number);

  // 如果用户已删除，返回未注册
  if (user && user.deleted_status !== 0) {
    return sendSuccessResponse(res, "查询成功", { exists: false });
  }

  // 只有用户存在且有密码，才算已正式注册
  // 临时用户（send-code 创建的无密码用户）不算已注册
  const exists = !!(
    user &&
    user.hashed_password &&
    user.hashed_password !== ""
  );

  return sendSuccessResponse(res, "查询成功", { exists });
};

/**
 * 检查手机号 API
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  logRequest(req, res);

  if (req.method === "POST") {
    return await handlePost(req, res);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withErrorHandler(handler, { logPrefix: "检查手机号" });
