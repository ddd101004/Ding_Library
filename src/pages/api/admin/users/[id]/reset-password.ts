import { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { withAdminAuth } from "@/middleware/auth/withAdminAuth";
import { resetUserPasswordByAdmin, findUserByUserIdInner } from "@/db/user";
import { sendSuccessResponse, sendErrorResponse } from "@/helper/responseHelper";
import { DEFAULT_RESET_PASSWORD } from "@/constants";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return sendErrorResponse(res, "方法不允许", 405);
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return sendErrorResponse(res, "用户ID无效", 400);
  }

  // 检查目标用户是否存在
  const targetUser = await findUserByUserIdInner(id);
  if (!targetUser) {
    return sendErrorResponse(res, "用户不存在", 404);
  }

  // 使用默认密码重置
  const hashedPassword = await bcrypt.hash(DEFAULT_RESET_PASSWORD, 10);
  const result = await resetUserPasswordByAdmin(id, hashedPassword);

  if (!result) {
    return sendErrorResponse(res, "重置密码失败", 500);
  }

  return sendSuccessResponse(res, "密码重置成功", {
    user_id: result.user_id,
    username: result.username,
    default_password: DEFAULT_RESET_PASSWORD,
  });
};

export default withAdminAuth(handler);
