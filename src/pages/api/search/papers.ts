import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { searchPapersPro } from "@/service/aminer/paper";
import { searchWanfangPapers } from "@/service/wanfang/paper";
import { processWanfangSearchResults } from "@/service/wanfang/paperProcessor";
import { batchUpsertPapers, findPaperIdsBySource } from "@/db/aminer/paper";
import {
  searchPapers as searchLocalPapers,
  SearchPapersParams,
} from "@/db/paper";
import { createSearchHistory } from "@/db/aminer/searchHistory";
import { batchCheckFavorites } from "@/db/aminer/favorite";
import { syncPapersToDatasetByIds } from "@/service/fastgpt/publicDataset";
import logger from "@/helper/logger";
import {
  PaperSearchResponse,
  AMinerPaperItem,
  LocalPaperItem,
  WanfangPaperItem,
} from "@/type/paper";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString } from "@/utils/validateString";

/**
 * POST - 论文搜索（支持 AMiner、Wanfang、本地数据库）
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
): Promise<void> => {
  const {
    keyword,
    page = 1,
    page_size = 20,
    sort = "relevance",
    source = "aminer",
  } = req.body;

  // 参数验证
  const keywordResult = validateString(keyword, "搜索关键词", {
    limitKey: "keyword",
  });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "搜索关键词校验失败");
  }

  // source 参数校验
  const sourceResult = validateString(source, "数据源", {
    required: false,
    max: 20,
  });
  if (!sourceResult.valid) {
    return sendWarnningResponse(res, sourceResult.error || "数据源参数校验失败");
  }

  // 解析分页参数
  const pageNum = parsePageNumber(page);
  const sizeNum = parseLimitParam(page_size);

  // 根据 source 参数选择搜索渠道
  if (source === "local") {
    // 搜索本地数据库
    return await handleLocalSearch(
      req,
      res,
      userId,
      keyword,
      pageNum,
      sizeNum,
      sort
    );
  } else if (source === "wanfang") {
    // 搜索万方 API（中文）
    return await handleWanfangSearch(
      req,
      res,
      userId,
      keyword,
      pageNum,
      sizeNum,
      sort
    );
  } else if (source === "wanfang_en") {
    // 搜索万方 API（外文/NSTL）
    return await handleWanfangEnSearch(
      req,
      res,
      userId,
      keyword,
      pageNum,
      sizeNum,
      sort
    );
  } else {
    // 默认搜索 AMiner
    return await handleAminerSearch(
      req,
      res,
      userId,
      keyword,
      pageNum,
      sizeNum,
      sort
    );
  }
};

/**
 * AMiner 搜索
 */
async function handleAminerSearch(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  keyword: string,
  page: number,
  size: number,
  sort?: string
): Promise<void> {
  // 构建搜索参数（service 层会处理 AMiner API 的 page 差异）
  const searchParams: any = {
    keyword: keyword.trim(),
    page: page,
    size,
  };

  // 添加排序参数（如果需要）
  if (sort && sort !== "relevance") {
    searchParams.sort_by = sort;
  }

  // 调用 AMiner API 搜索论文
  const aminerResults = await searchPapersPro(searchParams);

  if (!aminerResults || aminerResults.length === 0) {
    return sendSuccessResponse(res, "未找到相关论文", {
      total: 0,
      page,
      page_size: size,
      total_pages: 0,
      items: [],
      source: "aminer",
    });
  }

  // 获取总数(从第一条结果中获取)
  const total = aminerResults[0]?.total || 0;
  const total_pages = Math.ceil(total / size);

  // 处理结果并存入数据库
  const cacheStart = Date.now();
  const papersToUpsert = aminerResults.map((paper) => ({
    aminer_id: paper.id,
    title: paper.title,
    title_zh: paper.title_zh,
    abstract: paper.abstract,
    abstract_zh: paper.abstract_zh,
    doi: paper.doi,
    year: paper.year,
    language: paper.title_zh ? "zh" : "en", // 自动识别语言
    keywords: paper.keywords,
    keywords_zh: paper.keywords_zh,
    venue: paper.venue,
    authors: paper.authors,
    issn: paper.issn,
    issue: paper.issue,
    volume: paper.volume,
    n_citation: paper.n_citation || 0,
  }));

  // 批量存入数据库
  await batchUpsertPapers(papersToUpsert);
  const cacheDuration = Date.now() - cacheStart;

  logger.info("Papers cached to database", {
    count: papersToUpsert.length,
    duration: cacheDuration,
  });

  // 查询数据库 UUID（用于收藏状态检查）
  const dbPapers = await findPaperIdsBySource(
    "aminer",
    aminerResults.map((p) => p.id)
  );

  // 创建 source_id 到数据库 UUID 的映射
  const sourceIdToDbIdMap = new Map(dbPapers.map((p) => [p.source_id, p.id]));

  // 批量检查收藏状态（使用数据库 UUID）
  const dbPaperIds = dbPapers.map((p) => p.id);
  const favoriteMap = await batchCheckFavorites({
    user_id: userId,
    favorite_type: "paper",
    item_ids: dbPaperIds,
  });

  // 异步同步到 FastGPT 公共数据集（非阻塞）
  syncPapersToDatasetByIds(dbPaperIds, "user_search");

  // 获取第一条结果的数据库ID（用于搜索历史）
  const firstPaperDbId = aminerResults[0]
    ? sourceIdToDbIdMap.get(aminerResults[0].id) || null
    : null;

  // 记录搜索历史
  await createSearchHistory({
    user_id: userId,
    keyword: keyword.trim(),
    search_type: "paper",
    result_count: total,
    paper_id: firstPaperDbId || undefined,
  });

  // 格式化返回数据（返回数据库 UUID）
  const items: AMinerPaperItem[] = aminerResults.map((paper) => {
    const dbId = sourceIdToDbIdMap.get(paper.id);
    return {
      id: dbId || paper.id, // 优先使用数据库 UUID
      source: "aminer" as const,
      source_id: paper.id, // AMiner 源 ID
      title: paper.title || "",
      title_zh: paper.title_zh,
      abstract: paper.abstract,
      abstract_zh: paper.abstract_zh,
      authors: paper.authors,
      venue: paper.venue,
      year: paper.year,
      n_citation: paper.n_citation,
      keywords: paper.keywords,
      keywords_zh: paper.keywords_zh,
      doi: paper.doi,
      isFavorited: dbId ? favoriteMap[dbId] || false : false,
    };
  });

  return sendSuccessResponse(res, "搜索成功", {
    total,
    page,
    page_size: size,
    total_pages,
    items,
    source: "aminer",
  });
}

/**
 * 本地数据库搜索
 */
async function handleLocalSearch(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  keyword: string,
  page: number,
  page_size: number,
  sort: string
): Promise<void> {
  logger.info("搜索本地论文数据库", { keyword, page, page_size });

  const searchParams: SearchPapersParams = {
    keyword,
    page,
    pageSize: page_size,
    sortBy: sort === "date" ? "publication_date" : "relevancy_score",
    sortOrder: "desc",
  };

  const result = await searchLocalPapers(searchParams);

  if (!result) {
    throw new Error("搜索本地数据库失败");
  }

  return sendSuccessResponse(res, "搜索成功", {
    total: result.total,
    page: result.page,
    page_size: result.pageSize,
    total_pages: result.totalPages,
    items: result.data.map(
      (paper): LocalPaperItem => ({
        // 通用字段
        id: paper.id,
        source: "local" as const,
        source_id: paper.an || "", // EBSCO AN
        title: paper.title || "",
        abstract: paper.abstract || undefined,
        authors: (Array.isArray(paper.authors)
          ? paper.authors
          : []) as string[],

        // Local 特定字段
        publication_name: paper.publication_name || undefined,
        publication_date: paper.publication_date
          ? paper.publication_date instanceof Date
            ? paper.publication_date.toISOString().split("T")[0]
            : paper.publication_date
          : undefined,
        has_fulltext: paper.has_fulltext || undefined,
        pdf_downloaded: paper.pdf_downloaded || undefined,
        view_count: paper.view_count || undefined,
        download_count: paper.download_count || undefined,
      })
    ),
    source: "local",
  });
}

/**
 * 万方搜索
 */
async function handleWanfangSearch(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  keyword: string,
  page: number,
  size: number,
  sort?: string
): Promise<void> {
  const wanfangResults = await searchWanfangPapers({
    keyword: keyword.trim(),
    page,
    size,
  });

  if (!wanfangResults || wanfangResults.length === 0) {
    return sendSuccessResponse(res, "未找到相关论文", {
      total: 0,
      page,
      page_size: size,
      total_pages: 0,
      items: [],
      source: "wanfang",
    });
  }

  const { items, total, dbPaperIds } = await processWanfangSearchResults({
    papers: wanfangResults,
    userId,
    size,
  });

  // 异步同步到 FastGPT 公共数据集（非阻塞）
  syncPapersToDatasetByIds(dbPaperIds, "user_search");

  await createSearchHistory({
    user_id: userId,
    keyword: keyword.trim(),
    search_type: "paper",
    result_count: total,
    paper_id: dbPaperIds[0] || undefined,
  });

  return sendSuccessResponse(res, "搜索成功", {
    total,
    page,
    page_size: size,
    total_pages: Math.ceil(total / size),
    items,
    source: "wanfang",
  });
}

/**
 * 万方外文搜索（NSTL）
 */
async function handleWanfangEnSearch(
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  keyword: string,
  page: number,
  size: number,
  sort?: string
): Promise<void> {
  const wanfangResults = await searchWanfangPapers({
    keyword: keyword.trim(),
    page,
    size,
    filters: [{ field: "SourceDB", value: "NSTL" }],
  });

  if (!wanfangResults || wanfangResults.length === 0) {
    return sendSuccessResponse(res, "未找到相关论文", {
      total: 0,
      page,
      page_size: size,
      total_pages: 0,
      items: [],
      source: "wanfang_en",
    });
  }

  const { items, total, dbPaperIds } = await processWanfangSearchResults({
    papers: wanfangResults,
    userId,
    size,
    isEnglish: true,
  });

  // 异步同步到 FastGPT 公共数据集（非阻塞）
  syncPapersToDatasetByIds(dbPaperIds, "user_search");

  await createSearchHistory({
    user_id: userId,
    keyword: keyword.trim(),
    search_type: "paper",
    result_count: total,
    paper_id: dbPaperIds[0] || undefined,
  });

  return sendSuccessResponse(res, "搜索成功", {
    total,
    page,
    page_size: size,
    total_pages: Math.ceil(total / size),
    items,
    source: "wanfang_en",
  });
}

/**
 * 论文搜索 API
 * 支持搜索渠道: AMiner（默认）、Wanfang（中文）、Wanfang_EN（外文/NSTL）、本地数据库
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
): Promise<void> => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "论文搜索", useLogger: true }),
    {
      monitorType: "external_api",
      apiProvider: "multi",
      operationName: "searchPapers",
      extractMetadata: (req) => ({
        keyword: req.body.keyword || req.body.query,
        source: req.body.source || "aminer",
        page: req.body.page,
        page_size: req.body.page_size,
      }),
      extractResultCount: (data) => data?.items?.length || 0,
      successMetric: "paper_search_success",
      failureMetric: "paper_search_failed",
    }
  )
);
