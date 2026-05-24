/**
 * GET /api/admin/users — 获取用户列表（管理员）
 *
 * 【后端API】管理员模块
 *
 * 参数：page/size/search
 * 权限：withAdminAuth
 */
import { NextApiRequest, NextApiResponse } from "next";
import { withAdminAuth } from "@/middleware/auth/withAdminAuth";
import { getAllUsersWithFileCount } from "@/db/user";
import { sendSuccessResponse, sendErrorResponse } from "@/helper/responseHelper";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "GET") {
    return sendErrorResponse(res, "方法不允许", 405);
  }

  const page = parseInt(req.query.page as string) || 1;
  const size = parseInt(req.query.size as string) || 20;
  const search = (req.query.search as string) || undefined;

  const result = await getAllUsersWithFileCount(page, size, search);

  if (!result) {
    return sendErrorResponse(res, "获取用户列表失败", 500);
  }

  return sendSuccessResponse(res, "获取用户列表成功", result);
};

export default withAdminAuth(handler);
