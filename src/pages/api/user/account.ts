import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { deleteUser, softDeleteUser } from "@/db/user";
import { validateString } from "@/utils/validateString";
import logger from "@/helper/logger";

/**
 * 账户管理 API
 * DELETE /api/user/account - 删除账户（软删除）
 *
 * @requires Authentication - 需要用户登录
 * @param confirmation - 确认字符串，必须为 "DELETE"
 * @returns 删除结果
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { confirmation } = req.body;

  // 参数校验
  const confirmResult = validateString(confirmation, "确认字符串", { max: 10 });
  if (!confirmResult.valid) {
    return sendWarnningResponse(res, confirmResult.error || "确认字符串校验失败");
  }

  // 验证确认字符串
  if (confirmation !== "DELETE") {
    return sendWarnningResponse(
      res,
      "请输入 DELETE 确认删除操作"
    );
  }

  // 删除
  const result = await deleteUser(userId);

  if (!result) {
    return sendWarnningResponse(res, "删除失败，请稍后再试");
  }

  logger.info("用户账户删除成功", { userId });

  return sendSuccessResponse(res, "账户已删除");
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "DELETE") {
    return await handleDelete(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 DELETE 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "账户管理", useLogger: true })
);
