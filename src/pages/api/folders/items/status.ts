import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { batchGetFolderItemStatus } from "@/db/paperFolder";
import { validateString } from "@/utils/validateString";

/**
 * GET - 批量查询内容的文件夹加入状态
 *
 * 支持查询任意类型的内容（论文、用户上传论文、对话）
 * 无需传入类型，直接通过 ID 查询
 *
 * @query item_ids - 逗号分隔的内容ID列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { item_ids } = req.query;

  // 参数校验
  const idsResult = validateString(item_ids, "内容 ID 列表", { max: 5000 });
  if (!idsResult.valid) {
    return sendWarnningResponse(res, idsResult.error || "内容 ID 列表校验失败");
  }

  // 将逗号分隔的字符串转换为数组
  const itemIdsArray = (item_ids as string).split(",").filter((id) => id.trim());

  // 批量查询内容状态
  const statusMap = await batchGetFolderItemStatus(userId, itemIdsArray);

  return sendSuccessResponse(res, "查询成功", statusMap);
};

/**
 * 内容状态查询 API
 *
 * GET /api/folders/items/status?item_ids=id1,id2
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "内容状态查询" })
);
