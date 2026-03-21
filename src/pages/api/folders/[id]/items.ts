import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  addItemToFolder,
  batchAddItemsToFolder,
  getFolderContents,
  verifyFolderOwner,
  FolderItemType,
} from "@/db/paperFolder";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString, validateId } from "@/utils/validateString";

// 合法的内容类型
const VALID_ITEM_TYPES: FolderItemType[] = [
  "uploaded_paper",
  "conversation",
];

/**
 * POST - 添加内容到文件夹（支持单个或批量）
 *
 * 支持内容类型:
 * - uploaded_paper: 用户上传论文 (user_uploaded_papers表)
 * - conversation: 对话 (chat_conversations表)
 *
 * 单个添加参数:
 * @param item_type - 内容类型，默认 "uploaded_paper"
 * @param item_id - 内容ID
 * @param notes - 备注（可选）
 *
 * 批量添加参数:
 * @param items - 内容数组 [{ item_type, item_id }]
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  folder_id: string
) => {
  const { item_type, item_id, items, notes } = req.body;

  // 批量添加模式
  if (items && Array.isArray(items)) {
    // 验证 items 格式
    const validItems: Array<{ item_type: FolderItemType; item_id: string }> = [];
    for (const item of items) {
      // 校验 item_id
      const itemIdResult = validateId(item.item_id, "内容 ID", false);
      if (!itemIdResult.valid) {
        continue; // 跳过无效项
      }
      const type = item.item_type || "uploaded_paper";
      if (!VALID_ITEM_TYPES.includes(type)) {
        continue; // 跳过无效类型
      }
      validItems.push({
        item_type: type as FolderItemType,
        item_id: item.item_id,
      });
    }

    if (validItems.length === 0) {
      return sendWarnningResponse(res, "没有有效的内容可添加");
    }

    const result = await batchAddItemsToFolder({
      folder_id,
      items: validItems,
      user_id: userId,
    });

    return sendSuccessResponse(res, "批量添加完成", {
      added_count: result.added_count,
      failed_count: result.failed_count,
      errors: result.errors,
    });
  }

  // 单个添加模式
  // 校验 item_id
  const itemIdResult = validateId(item_id, "内容 ID");
  if (!itemIdResult.valid) {
    return sendWarnningResponse(res, itemIdResult.error || "内容 ID 校验失败");
  }

  // 校验 notes（如果提供）
  if (notes) {
    const notesResult = validateString(notes, "备注", {
      limitKey: "description",
      required: false,
    });
    if (!notesResult.valid) {
      return sendWarnningResponse(res, notesResult.error || "备注校验失败");
    }
  }

  const type = item_type || "uploaded_paper";

  // 验证 item_type 是否合法
  if (!VALID_ITEM_TYPES.includes(type)) {
    return sendWarnningResponse(
      res,
      "无效的内容类型，请使用 uploaded_paper 或 conversation"
    );
  }

  const result = await addItemToFolder({
    folder_id,
    item_type: type as FolderItemType,
    item_id,
    user_id: userId,
    notes,
  });

  if (!result.success) {
    // 根据错误类型返回不同的错误信息
    switch (result.error) {
      case "uploaded_paper_not_found":
        return sendWarnningResponse(res, "用户上传的论文不存在");
      case "conversation_not_found":
        return sendWarnningResponse(res, "对话不存在或无权访问");
      case "invalid_item_type":
        return sendWarnningResponse(
          res,
          "无效的内容类型，请使用 uploaded_paper 或 conversation"
        );
      case "item_already_in_folder":
        return sendWarnningResponse(res, "该内容已在文件夹中");
      default:
        throw new Error("添加失败");
    }
  }

  const item = result.item;
  if (!item) {
    throw new Error("添加失败");
  }

  sendSuccessResponse(res, "已加入到文件夹", {
    item_id: item.item_id,
    folder_id: item.folder_id,
    item_type: type,
    content_id: item.uploaded_paper_id || item.paper_id,
    added_at: item.added_at,
  });
};

/**
 * GET - 获取文件夹内所有内容
 *
 * 返回统一的 items 列表，通过 item_type 区分类型:
 * - uploaded_paper: 用户上传论文
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  folder_id: string
) => {
  const { page, limit } = req.query;

  const result = await getFolderContents({
    folder_id,
    page: parsePageNumber(page),
    limit: parseLimitParam(limit),
  });

  if (!result) {
    throw new Error("获取失败");
  }

  sendSuccessResponse(res, "获取成功", result);
};

/**
 * 文件夹内容管理 API
 *
 * POST /api/folders/:id/items - 添加内容到文件夹（支持批量）
 * GET  /api/folders/:id/items - 获取文件夹内所有内容
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "文件夹 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "文件夹 ID 校验失败");
  }
  const folder_id = id as string;

  // 验证文件夹所有权
  const isOwner = await verifyFolderOwner(folder_id, userId);
  if (!isOwner) {
    sendWarnningResponse(res, "无权访问此文件夹");
    return;
  }

  if (req.method === "POST") {
    return await handlePost(req, res, userId, folder_id);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId, folder_id);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "文件夹内容管理" })
);
