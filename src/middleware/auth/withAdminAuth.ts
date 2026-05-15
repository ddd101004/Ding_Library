import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "./withAuth";
import { findUserByUserIdInner } from "@/db/user";
import { sendErrorResponse } from "@/helper/responseHelper";
import { ADMIN_ROLE } from "@/constants";

/**
 * 管理员认证中间件
 * 在withAuth基础上额外验证用户是否为管理员
 */
export const withAdminAuth = (
  handler: (req: NextApiRequest, res: NextApiResponse, userId: string) => void
) => {
  return withAuth(async (req, res, userId) => {
    const user = await findUserByUserIdInner(userId);

    if (!user || user.role !== ADMIN_ROLE) {
      return sendErrorResponse(res, "无管理员权限", 403);
    }

    return handler(req, res, userId);
  });
};
