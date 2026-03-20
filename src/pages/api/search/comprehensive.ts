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
import { WanfangPaperItem } from "@/type";
import logger from "@/helper/logger";
import { parseLimitParam } from "@/utils/parsePageParams";
import { validateString } from "@/utils/validateString";
import { createSearchHistory } from "@/db/aminer/searchHistory";

/**
 * POST - 综合搜索
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
): Promise<void> => {
  const { keyword, page_size } = req.body;

  // 参数验证
  const keywordResult = validateString(keyword, "搜索关键词", {
    limitKey: "keyword",
  });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "搜索关键词校验失败");
  }

  const sizeNum = parseLimitParam(page_size, 5, 20);
  const trimmedKeyword = keyword.trim();

  // 并发调用两个数据源
  // 万方中文 + 万方外文（NSTL）
  const [wanfangZhResults, wanfangEnResults] =
    await Promise.allSettled([
      // 中文论文：万方默认检索
      searchWanfangPapers({ keyword: trimmedKeyword, page: 1, size: sizeNum }),
      // 外文论文：万方 NSTL 检索
      searchWanfangPapers({
        keyword: trimmedKeyword,
        page: 1,
        size: sizeNum,
        filters: [{ field: "SourceDB", value: "NSTL" }]
      }),
    ]);

  // 处理万方论文结果（中文发现）
  let papersZhItems: WanfangPaperItem[] = [];
  let papersZhTotal = 0;
  if (
    wanfangZhResults.status === "fulfilled" &&
    wanfangZhResults.value?.length > 0
  ) {
    const result = await processWanfangSearchResults({
      papers: wanfangZhResults.value,
      size: sizeNum,
    });
    papersZhItems = result.items;
    papersZhTotal = result.total;
  }

  // 处理万方论文结果（外文发现 - NSTL）
  let papersEnItems: WanfangPaperItem[] = [];
  let papersEnTotal = 0;
  if (
    wanfangEnResults.status === "fulfilled" &&
    wanfangEnResults.value?.length > 0
  ) {
    const result = await processWanfangSearchResults({
      papers: wanfangEnResults.value,
      size: sizeNum,
      isEnglish: true,
    });
    papersEnItems = result.items;
    papersEnTotal = result.total;
  }

  // 记录搜索历史
  await createSearchHistory({
    user_id: userId,
    keyword: trimmedKeyword,
    search_type: "comprehensive",
    result_count: papersZhTotal + papersEnTotal,
  }).catch((err) =>
    logger.error("记录搜索历史失败", {
      error: err instanceof Error ? err.message : err,
    })
  );

  return sendSuccessResponse(res, "搜索成功", {
    keyword: trimmedKeyword,
    papers_zh: {
      total: papersZhTotal,
      page: 1,
      page_size: sizeNum,
      items: papersZhItems,
      source: "wanfang" as const,
    },
    papers_en: {
      total: papersEnTotal,
      page: 1,
      page_size: sizeNum,
      items: papersEnItems,
      source: "wanfang_en" as const,
    },
  });
};

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
    withErrorHandler(handler, { logPrefix: "综合搜索" }),
    {
      monitorType: "external_api",
      apiProvider: "multiple",
      operationName: "comprehensiveSearch",
      extractMetadata: (req) => ({
        keyword: req.body.keyword,
        page_size: req.body.page_size || 5,
      }),
      successMetric: "comprehensive_search_success",
      failureMetric: "comprehensive_search_error",
    }
  )
);
