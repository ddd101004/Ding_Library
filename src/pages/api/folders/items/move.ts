import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { moveItemsToFolder } from "@/db/paperFolder";
import { validateId } from "@/utils/validateString";

/**
 * POST - 移动内容到另一个文件夹
 *
 * @param item_ids - FolderItem 主键列表（支持单个或多个）
 * @param target_folder_id - 目标文件夹 ID
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { item_ids, target_folder_id } = req.body;

  // 参数验证
  const folderIdResult = validateId(target_folder_id, "目标文件夹 ID");
  if (!folderIdResult.valid) {
    return sendWarnningResponse(res, folderIdResult.error || "目标文件夹 ID 校验失败");
  }

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
    return sendWarnningResponse(res, "请选择要移动的内容");
  }

  // 执行移动
  const result = await moveItemsToFolder({
    item_ids: itemIdList,
    target_folder_id,
    user_id: userId,
  });

  // 根据结果返回不同信息
  if (result.moved_count === 0) {
    // 全部失败，检查第一个错误类型
    const firstError = result.errors[0]?.error;
    switch (firstError) {
      case "target_folder_not_found":
        return sendWarnningResponse(res, "目标文件夹不存在或无权访问");
      case "item_not_found":
        return sendWarnningResponse(res, "内容不存在");
      case "permission_denied":
        return sendWarnningResponse(res, "无权移动该内容");
      case "already_in_target_folder":
        return sendWarnningResponse(res, "内容已在目标文件夹中");
      case "duplicate_in_target_folder":
        return sendWarnningResponse(res, "目标文件夹已存在相同内容");
      default:
        return sendWarnningResponse(res, "移动失败");
    }
  }

  // 部分成功或全部成功
  const message =
    result.failed_count > 0
      ? `已移动 ${result.moved_count} 项，${result.failed_count} 项失败`
      : `已移动 ${result.moved_count} 项`;

  return sendSuccessResponse(res, message, {
    moved_count: result.moved_count,
    failed_count: result.failed_count,
    errors: result.errors,
  });
};

/**
 * 文件夹内容移动 API
 *
 * POST /api/folders/items/move - 移动内容到另一个文件夹
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
  withErrorHandler(handler, { logPrefix: "移动文件夹内容" })
);
