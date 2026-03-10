import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { searchScholars } from "@/service/aminer/scholar";
import { batchUpsertScholars, findScholarIdsBySource } from "@/db/aminer/scholar";
import { createSearchHistory } from "@/db/aminer/searchHistory";
import { batchCheckFavorites } from "@/db/aminer/favorite";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString } from "@/utils/validateString";
import logger from "@/helper/logger";

/**
 * POST - 学者搜索
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { name, org, page = 1, size = 10, order } = req.body;

  // 验证必填参数
  const nameResult = validateString(name, "学者名称", { limitKey: "keyword" });
  if (!nameResult.valid) {
    return sendWarnningResponse(res, nameResult.error || "学者名称校验失败");
  }

  // 机构名称校验（可选）
  if (org) {
    const orgResult = validateString(org, "机构名称", {
      required: false,
      max: 200,
    });
    if (!orgResult.valid) {
      return sendWarnningResponse(res, orgResult.error || "机构名称校验失败");
    }
  }

  // 解析分页参数
  const pageNum = parsePageNumber(page);
  // AMiner 学者搜索 API 限制：size 最大为 10，offset 最大为 0（不支持分页）
  const sizeNum = Math.min(parseLimitParam(size, 10), 10);

  // AMiner API 限制：不支持分页，page > 1 时直接返回空结果
  if (pageNum > 1) {
    return sendSuccessResponse(res, "已到达最后一页", {
      total: 0,
      page: pageNum,
      size: sizeNum,
      totalPages: 1,
      items: [],
    });
  }

  // 构建搜索参数
  const searchParams: any = {
    name: name.trim(),
    page: 1,  // AMiner API 只支持第一页
    size: sizeNum,
  };

  // 添加可选参数
  if (org && org.trim()) {
    searchParams.org = org.trim();
  }

  // 调用 AMiner API 搜索学者
  const aminerResults = await searchScholars(searchParams);

  if (!aminerResults || aminerResults.length === 0) {
    return sendSuccessResponse(res, "未找到相关学者", {
      total: 0,
      page: 1,
      size: sizeNum,
      totalPages: 0,
      items: [],
    });
  }

  // 获取总数(从第一条结果中获取)
  const total = aminerResults[0]?.total || 0;
  // AMiner API 不支持分页，totalPages 始终为 1
  const totalPages = 1;

  // 处理结果并存入数据库
  const cacheStart = Date.now();
  const scholarsToUpsert = aminerResults.map((scholar) => ({
    aminer_id: scholar.id,
    name: scholar.name,
    name_zh: scholar.name_zh,
    orgs: scholar.org ? [scholar.org] : [],
    org_zhs: scholar.org_zh ? [scholar.org_zh] : [],
    interests: scholar.interests || [],
    n_citation: scholar.n_citation || 0,
  }));

  // 批量存入数据库
  await batchUpsertScholars(scholarsToUpsert);

  const cacheDuration = Date.now() - cacheStart;
  logger.info("Scholars cached to database", {
    count: scholarsToUpsert.length,
    duration: cacheDuration,
  });

  // 查询数据库 UUID（用于收藏状态检查）
  const dbScholars = await findScholarIdsBySource(
    'aminer',
    aminerResults.map(s => s.id)
  );

  // 创建 source_id 到数据库 UUID 的映射
  const sourceIdToDbIdMap = new Map(dbScholars.map(s => [s.source_id, s.id]));

  // 批量检查收藏状态（使用数据库 UUID）
  const dbScholarIds = dbScholars.map(s => s.id);
  const favoriteMap = await batchCheckFavorites({
    user_id: userId,
    favorite_type: "scholar",
    item_ids: dbScholarIds,
  });

  // 获取第一条结果的数据库ID（用于搜索历史）
  const firstScholarDbId = aminerResults[0]
    ? sourceIdToDbIdMap.get(aminerResults[0].id) || null
    : null;

  // 记录搜索历史
  await createSearchHistory({
    user_id: userId,
    keyword: name.trim(),
    search_type: "scholar",
    result_count: total,
    scholar_id: firstScholarDbId || undefined,
  });
  // 应用排序
  let sortedResults = [...aminerResults];
  if (order === "n_citation") {
    sortedResults.sort((a, b) => (b.n_citation || 0) - (a.n_citation || 0));
  } else if (order === "name") {
    sortedResults.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }

  // 格式化返回数据（返回数据库 UUID）
  const items = sortedResults.map((scholar) => {
    const dbId = sourceIdToDbIdMap.get(scholar.id);
    return {
      id: dbId || scholar.id,
      name: scholar.name,
      name_zh: scholar.name_zh,
      org: scholar.org,
      org_zh: scholar.org_zh,
      n_citation: scholar.n_citation || 0,
      isFavorited: dbId ? (favoriteMap[dbId] || false) : false,
    };
  });

  return sendSuccessResponse(res, "搜索成功", {
    total,
    page: pageNum,
    size: sizeNum,
    totalPages,
    items,
  });
};

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
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "学者搜索" }),
    {
      monitorType: "external_api",
      apiProvider: "aminer",
      operationName: "searchScholars",
      extractMetadata: (req) => ({
        name: req.body.name,
        org: req.body.org,
      }),
      extractResultCount: (data) => data?.items?.length || 0,
      successMetric: "scholar_search_success",
      failureMetric: "scholar_search_error",
    }
  )
);
