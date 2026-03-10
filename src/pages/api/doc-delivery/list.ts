import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getDocDeliveryRequestsByUser } from "@/db/docDeliveryRequest";
import logger from "@/helper/logger";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";

/**
 * 全文传递列表 API
 * GET /api/doc-delivery/list
 *
 * @requires Authentication - 需要用户登录
 * @param status - 状态筛选：all(全部) / pending(传递中) / completed(已完成)
 * @param page - 页码，默认 1
 * @param limit - 每页数量，默认 20
 * @returns 全文传递请求列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { status = "all", page, limit } = req.query;

  // 解析分页参数
  const pageNum = parsePageNumber(page);
  const limitNum = parseLimitParam(limit);

  // 验证状态参数
  const validStatuses = ["all", "pending", "completed"];
  const statusFilter = validStatuses.includes(status as string)
    ? (status as "all" | "pending" | "completed")
    : "all";

  const result = await getDocDeliveryRequestsByUser(userId, {
    status: statusFilter,
    page: pageNum,
    limit: limitNum,
  });

  // 格式化返回数据
  const items = result.items.map((item) => ({
    id: item.id,
    task_id: item.task_id,
    paper_id: item.paper_id,
    title: item.title,
    authors: item.authors,
    publication_name: item.publication_name,
    publication_year: item.publication_year,
    abstract: item.abstract,
    doi: item.doi,
    tags: item.tags,
    subject_category: item.subject_category,
    article_type: item.article_type,
    status: item.status,
    status_text: item.status_text,
    fulltext_url: item.fulltext_url,
    create_time: item.create_time,
    completed_time: item.completed_time,
  }));

  logger.info("获取全文传递列表成功", {
    userId,
    status: statusFilter,
    count: items.length,
    total: result.total,
  });

  return sendSuccessResponse(res, "获取成功", {
    items,
    total: result.total,
    page: result.page,
    limit: result.limit,
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "全文传递列表", useLogger: true })
);
