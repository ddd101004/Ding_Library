import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
} from "@/helper/responseHelper";
import { searchWanfangPatents } from "@/service/wanfang/patent";
import { batchUpsertPatents, findPatentIdsBySource } from "@/db/aminer/patent";
import { createSearchHistory } from "@/db/aminer/searchHistory";
import { batchCheckFavorites } from "@/db/aminer/favorite";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString } from "@/utils/validateString";

/**
 * 专利搜索处理函数（万方渠道）
 */
const handlePatentSearch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { keyword, page = 1, size = 10, order } = req.body;

  // 验证必填参数
  const keywordResult = validateString(keyword, "搜索关键词", {
    limitKey: "keyword",
  });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "搜索关键词校验失败");
  }

  // 解析分页参数
  const pageNum = parsePageNumber(page);
  const sizeNum = parseLimitParam(size, 10);

  // 调用万方 API 搜索专利
  const searchResults = await searchWanfangPatents({
    keyword: keyword.trim(),
    page: pageNum,
    size: sizeNum,
  });

  if (!searchResults || searchResults.length === 0) {
    sendSuccessResponse(res, "未找到相关专利", {
      total: 0,
      page: pageNum,
      size: sizeNum,
      totalPages: 0,
      items: [],
    });
    return;
  }

  // 获取总数
  const total = searchResults[0]?.total || searchResults.length;
  const totalPages = Math.ceil(total / sizeNum);

  // 处理结果并存入数据库
  const patentsToUpsert = searchResults.map((patent) => ({
    source_id: patent.id,
    source: "wanfang" as const,
    title: patent.title || "",
    title_zh: patent.title || undefined,
    title_en: patent.title_en || undefined,
    abstract: patent.abstract || undefined,
    year: patent.year,
    app_num: patent.app_num || undefined,
    pub_num: patent.pub_num || undefined,
    country: patent.country || undefined,
    inventors: patent.creators || [],
    ipc: patent.ipc || undefined,
    app_date: patent.app_date || undefined,
    pub_date: patent.pub_date || undefined,
  }));

  // 批量存入数据库
  await batchUpsertPatents(patentsToUpsert, "wanfang");

  // 查询数据库 UUID（用于收藏状态检查）
  const dbPatents = await findPatentIdsBySource(
    "wanfang",
    searchResults.map((p) => p.id)
  );

  // 创建 source_id 到数据库 UUID 的映射
  const sourceIdToDbIdMap = new Map(dbPatents.map((p) => [p.source_id, p.id]));

  // 批量检查收藏状态（使用数据库 UUID）
  const dbPatentIds = dbPatents.map((p) => p.id);
  const favoriteMap = await batchCheckFavorites({
    user_id: userId,
    favorite_type: "patent",
    item_ids: dbPatentIds,
  });

  // 获取第一条结果的数据库ID（用于搜索历史）
  const firstPatentDbId = searchResults[0]
    ? sourceIdToDbIdMap.get(searchResults[0].id) || null
    : null;

  // 记录搜索历史
  await createSearchHistory({
    user_id: userId,
    keyword: keyword.trim(),
    search_type: "patent",
    result_count: total,
    patent_id: firstPatentDbId || undefined,
  });

  // 应用排序(如果指定)
  let sortedResults = [...searchResults];
  if (order === "year") {
    sortedResults.sort((a, b) => {
      const yearA = a.year || 0;
      const yearB = b.year || 0;
      return yearB - yearA;
    });
  } else if (order === "title") {
    sortedResults.sort((a, b) => {
      const titleA = a.title || "";
      const titleB = b.title || "";
      return titleA.localeCompare(titleB);
    });
  }

  // 格式化返回数据（返回数据库 UUID）
  const items = sortedResults.map((patent) => {
    const dbId = sourceIdToDbIdMap.get(patent.id);
    return {
      id: dbId || patent.id,
      title: patent.title || "",
      title_zh: patent.title,
      title_en: patent.title_en,
      abstract: patent.abstract,
      year: patent.year,
      isFavorited: dbId ? favoriteMap[dbId] || false : false,
    };
  });

  sendSuccessResponse(res, "搜索成功", {
    total,
    page: pageNum,
    size: sizeNum,
    totalPages,
    items,
  });
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handlePatentSearch, { logPrefix: "专利搜索" }),
    {
      monitorType: "external_api",
      apiProvider: "wanfang",
      operationName: "searchPatents",
      extractMetadata: (req) => ({
        keyword: req.body.keyword,
        page: req.body.page || 1,
        size: req.body.size || 10,
      }),
      successMetric: "patent_search_success",
      failureMetric: "patent_search_error",
    }
  )
);
