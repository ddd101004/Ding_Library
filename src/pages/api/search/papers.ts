import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { searchWanfangPapers } from "@/service/wanfang/paper";
import { processWanfangSearchResults } from "@/service/wanfang/paperProcessor";
import {
  searchPapers as searchLocalPapers,
  SearchPapersParams,
} from "@/db/paper";
import { createSearchHistory } from "@/db/aminer/searchHistory";
import logger from "@/helper/logger";
import {
  PaperSearchResponse,
  WanfangPaperItem,
} from "@/type/paper";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString } from "@/utils/validateString";

/**
 * POST - 论文搜索（支持 Wanfang、本地数据库）
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
    source = "wanfang",
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
    // 默认搜索万方 API（中文）
    return await handleWanfangSearch(
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
 * 万方搜索（中文）
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
  try {
    // 调用万方 API 搜索论文
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

    // 从第一条结果中获取总数
    const totalHits = wanfangResults[0]?.total || 0;
    const totalPages = Math.ceil(totalHits / size);

    // 处理搜索结果
    const result = await processWanfangSearchResults({
      papers: wanfangResults,
      size,
    });

    // 获取第一条结果的数据库ID（用于搜索历史）
    const firstPaperDbId = result.items[0]?.id || null;

    // 记录搜索历史
    await createSearchHistory({
      user_id: userId,
      keyword: keyword.trim(),
      search_type: "paper",
      result_count: totalHits,
      paper_id: firstPaperDbId || undefined,
    }).catch((err) =>
      logger.error("记录搜索历史失败", {
        error: err instanceof Error ? err.message : err,
      })
    );

    return sendSuccessResponse(res, "搜索成功", {
      total: totalHits,
      page,
      page_size: size,
      total_pages: totalPages,
      items: result.items,
      source: "wanfang",
    });
  } catch (error) {
    logger.error("万方论文搜索失败", {
      error: error instanceof Error ? error.message : String(error),
    });
    return sendSuccessResponse(res, "搜索失败", {
      total: 0,
      page,
      page_size: size,
      total_pages: 0,
      items: [],
      source: "wanfang",
    });
  }
}

/**
 * 万方搜索（外文/NSTL）
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
  try {
    // 调用万方 API 搜索外文论文（NSTL）
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

    // 从第一条结果中获取总数
    const totalHits = wanfangResults[0]?.total || 0;
    const totalPages = Math.ceil(totalHits / size);

    // 处理搜索结果（标记为英文）
    const result = await processWanfangSearchResults({
      papers: wanfangResults,
      size,
      isEnglish: true,
    });

    // 获取第一条结果的数据库ID（用于搜索历史）
    const firstPaperDbId = result.items[0]?.id || null;

    // 记录搜索历史
    await createSearchHistory({
      user_id: userId,
      keyword: keyword.trim(),
      search_type: "paper_en",
      result_count: totalHits,
      paper_id: firstPaperDbId || undefined,
    }).catch((err) =>
      logger.error("记录搜索历史失败", {
        error: err instanceof Error ? err.message : err,
      })
    );

    return sendSuccessResponse(res, "搜索成功", {
      total: totalHits,
      page,
      page_size: size,
      total_pages: totalPages,
      items: result.items,
      source: "wanfang_en",
    });
  } catch (error) {
    logger.error("万方外文论文搜索失败", {
      error: error instanceof Error ? error.message : String(error),
    });
    return sendSuccessResponse(res, "搜索失败", {
      total: 0,
      page,
      page_size: size,
      total_pages: 0,
      items: [],
      source: "wanfang_en",
    });
  }
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
  size: number,
  sort?: string
): Promise<void> {
  try {
    const searchParams: SearchPapersParams = {
      keyword: keyword.trim(),
      page,
      pageSize: size,
      sortBy: sort,
    };

    const localResult = await searchLocalPapers(searchParams);

    if (!localResult) {
      return sendSuccessResponse(res, "搜索成功", {
        total: 0,
        page,
        page_size: size,
        total_pages: 0,
        items: [],
        source: "local",
      });
    }

    const items = localResult.data.map((paper: any) => ({
      ...paper,
      is_favorited: false,
    }));

    return sendSuccessResponse(res, "搜索成功", {
      total: localResult.total,
      page,
      page_size: size,
      total_pages: Math.ceil(localResult.total / size),
      items,
      source: "local",
    });
  } catch (error) {
    logger.error("本地数据库搜索失败", {
      error: error instanceof Error ? error.message : String(error),
    });
    return sendSuccessResponse(res, "搜索失败", {
      total: 0,
      page,
      page_size: size,
      total_pages: 0,
      items: [],
      source: "local",
    });
  }
}

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
    withErrorHandler(handler, { logPrefix: "论文搜索" }),
    {
      monitorType: "external_api",
      apiProvider: "wanfang",
      operationName: "searchPapers",
      extractMetadata: (req) => ({
        keyword: req.body.keyword || req.body.query,
        source: req.body.source || "wanfang",
        page: req.body.page,
        page_size: req.body.page_size,
      }),
      successMetric: "paper_search_success",
      failureMetric: "paper_search_error",
    }
  )
);
