import { NextApiRequest, NextApiResponse } from "next";
import { withAdminAuth } from "@/middleware/auth/withAdminAuth";
import { toggleUserStatus, findUserByUserIdInner } from "@/db/user";
import { sendSuccessResponse, sendErrorResponse } from "@/helper/responseHelper";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return sendErrorResponse(res, "方法不允许", 405);
  }

  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return sendErrorResponse(res, "用户ID无效", 400);
  }

  const targetUser = await findUserByUserIdInner(id);
  if (!targetUser) {
    return sendErrorResponse(res, "用户不存在", 404);
  }

  if (targetUser.role === "admin") {
    return sendErrorResponse(res, "不能禁用管理员账号", 400);
  }

  const result = await toggleUserStatus(id);

  if (!result) {
    return sendErrorResponse(res, "操作失败", 500);
  }

  return sendSuccessResponse(res, result.disabled_status ? "已禁用" : "已启用", {
    user_id: result.user_id,
    username: result.username,
    disabled_status: result.disabled_status,
  });
};

export default withAdminAuth(handler);
