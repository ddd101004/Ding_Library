import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  getUserSearchHistory,
  deleteSearchHistory,
  deleteSearchHistoryByKeyword,
  clearUserSearchHistory,
} from "@/db/aminer/searchHistory";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString, validateId } from "@/utils/validateString";

/**
 * GET - 获取搜索历史
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { type, page, size } = req.query;

  // 验证类型参数
  if (
    type &&
    typeof type === "string" &&
    !["paper", "paper", "comprehensive"].includes(type)
  ) {
    return sendWarnningResponse(res, "搜索类型无效");
  }

  // 获取搜索历史
  const result = await getUserSearchHistory({
    user_id: userId,
    search_type: type as string | undefined,
    page: parsePageNumber(page),
    size: parseLimitParam(size),
  });

  if (!result) {
    throw new Error("获取搜索历史失败");
  }

  // 格式化返回数据（仅返回基础信息，不关联详细数据）
  const items = result.items.map((item) => ({
    id: item.id,
    keyword: item.keyword,
    search_type: item.search_type,
    result_count: item.result_count,
    create_time: item.create_time,
    paper_id: item.paper_id,
  }));

  return sendSuccessResponse(res, "获取成功", {
    total: result.total,
    items,
  });
};

/**
 * DELETE - 删除搜索历史
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id, keyword, clear_all } = req.body;

  if (clear_all === true || clear_all === "true") {
    await clearUserSearchHistory(userId);
    return sendSuccessResponse(res, "清空成功");
  }

  if (keyword && typeof keyword === "string") {
    // 校验关键词
    const keywordResult = validateString(keyword, "关键词", { limitKey: "keyword" });
    if (!keywordResult.valid) {
      return sendWarnningResponse(res, keywordResult.error || "关键词校验失败");
    }
    await deleteSearchHistoryByKeyword(keyword, userId);
    return sendSuccessResponse(res, "删除成功");
  }

  // 校验 ID
  const idResult = validateId(id, "搜索历史 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "搜索历史 ID 校验失败");
  }

  await deleteSearchHistory(id, userId);
  return sendSuccessResponse(res, "删除成功");
};

/**
 * 搜索历史 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和DELETE请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "搜索历史操作" })
);
