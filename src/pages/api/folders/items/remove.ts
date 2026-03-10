import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { batchRemoveItemsFromFolder } from "@/db/paperFolder";
import { validateId } from "@/utils/validateString";

/**
 * POST - 批量从文件夹移除内容
 *
 * @param item_ids - FolderItem 主键列表（支持单个或多个）
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { item_ids } = req.body;

  // 支持单个 ID 或数组
  let itemIdList: string[] = [];
  if (Array.isArray(item_ids)) {
    // 校验每个 item_id
    for (const id of item_ids) {
      const itemResult = validateId(id, "内容 ID", false);
      if (itemResult.valid) {
        itemIdList.push(id);
      }
    }
  } else {
    const itemResult = validateId(item_ids, "内容 ID", false);
    if (itemResult.valid) {
      itemIdList = [item_ids];
    }
  }

  if (itemIdList.length === 0) {
    return sendWarnningResponse(res, "请选择要移除的内容");
  }

  // 执行批量删除
  const result = await batchRemoveItemsFromFolder({
    item_ids: itemIdList,
    user_id: userId,
  });

  // 根据结果返回不同信息
  if (result.removed_count === 0) {
    const firstError = result.errors[0]?.error;
    switch (firstError) {
      case "item_not_found":
        return sendWarnningResponse(res, "内容不存在");
      case "permission_denied":
        return sendWarnningResponse(res, "无权移除该内容");
      default:
        return sendWarnningResponse(res, "移除失败");
    }
  }

  // 部分成功或全部成功
  const message =
    result.failed_count > 0
      ? `已移除 ${result.removed_count} 项，${result.failed_count} 项失败`
      : `已移除 ${result.removed_count} 项`;

  return sendSuccessResponse(res, message, {
    removed_count: result.removed_count,
    failed_count: result.failed_count,
    errors: result.errors,
  });
};

/**
 * 批量移除文件夹内容 API
 *
 * POST /api/folders/items/remove - 批量从文件夹移除内容
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "批量移除文件夹内容" })
);
