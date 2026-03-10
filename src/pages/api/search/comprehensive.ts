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
import { searchWanfangPatents } from "@/service/wanfang/patent";
import { searchWanfangPapers } from "@/service/wanfang/paper";
import { processWanfangSearchResults } from "@/service/wanfang/paperProcessor";
import {
  batchUpsertScholars,
  findScholarIdsBySource,
} from "@/db/aminer/scholar";
import { batchUpsertPatents, findPatentIdsBySource } from "@/db/aminer/patent";
import { createSearchHistory } from "@/db/aminer/searchHistory";
import { batchCheckFavorites } from "@/db/aminer/favorite";
import {
  WanfangPaperItem,
  ScholarItem,
  PatentItem,
} from "@/type";
import logger from "@/helper/logger";
import { parseLimitParam } from "@/utils/parsePageParams";
import { validateString } from "@/utils/validateString";

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

  // 并发调用四个数据源
  // 万方中文 + 万方外文（NSTL） + AMiner 学者 + 万方专利
  const [wanfangZhResults, wanfangEnResults, scholarResults, patentSearchResults] =
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
      searchScholars({ name: trimmedKeyword, page: 1, size: sizeNum }),
      // 专利：万方专利检索
      searchWanfangPatents({ keyword: trimmedKeyword, page: 1, size: sizeNum }),
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
      userId,
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
      userId,
      size: sizeNum,
      isEnglish: true,
    });
    papersEnItems = result.items;
    papersEnTotal = result.total;
  }

  // 处理学者结果
  let scholarItems: ScholarItem[] = [];
  let scholarTotal = 0;
  if (
    scholarResults.status === "fulfilled" &&
    scholarResults.value?.length > 0
  ) {
    const scholars = scholarResults.value;

    // 确保 total 是数字类型（AMiner API 可能返回字符串）
    const rawTotal = scholars[0]?.total || scholars.length;
    scholarTotal =
      typeof rawTotal === "string" ? parseInt(rawTotal, 10) : rawTotal;

    await batchUpsertScholars(
      scholars.map((s) => ({
        aminer_id: s.id,
        name: s.name || s.name_zh || "",
        name_zh: s.name_zh,
        orgs: s.org ? [s.org] : [],
        org_zhs: s.org_zh ? [s.org_zh] : [],
        interests: s.interests || [],
        n_citation: s.n_citation || 0,
      }))
    ).catch((err) =>
      logger.error("批量存储学者失败", {
        error: err instanceof Error ? err.message : err,
      })
    );

    const dbScholars = await findScholarIdsBySource(
      "aminer",
      scholars.map((s) => s.id)
    );
    const sourceIdToDbIdMap = new Map(
      dbScholars.map((s) => [s.source_id, s.id])
    );
    const favoriteMap =
      dbScholars.length > 0
        ? await batchCheckFavorites({
            user_id: userId,
            favorite_type: "scholar",
            item_ids: dbScholars.map((s) => s.id),
          })
        : {};

    scholarItems = scholars.slice(0, sizeNum).map((scholar): ScholarItem => {
      const dbId = sourceIdToDbIdMap.get(scholar.id);
      return {
        id: dbId || scholar.id,
        name: scholar.name || scholar.name_zh || "",
        name_zh: scholar.name_zh,
        org: scholar.org,
        org_zh: scholar.org_zh,
        n_citation: scholar.n_citation || 0,
        isFavorited: dbId ? favoriteMap[dbId] || false : false,
      };
    });
  }

  // 处理专利结果（万方专利）
  let patentItems: PatentItem[] = [];
  let patentTotal = 0;
  if (
    patentSearchResults.status === "fulfilled" &&
    patentSearchResults.value?.length > 0
  ) {
    const patents = patentSearchResults.value;

    // 万方专利 API 返回 total 字段
    const rawTotal = patents[0]?.total || patents.length;
    patentTotal =
      typeof rawTotal === "string" ? parseInt(rawTotal, 10) : rawTotal;

    // 批量存储到数据库
    await batchUpsertPatents(
      patents.map((patent) => ({
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
      })),
      "wanfang"
    ).catch((err) =>
      logger.error("批量存储专利失败", {
        error: err instanceof Error ? err.message : err,
      })
    );

    // 查询数据库 UUID
    const dbPatents = await findPatentIdsBySource(
      "wanfang",
      patents.map((p) => p.id)
    );
    const sourceIdToDbIdMap = new Map(
      dbPatents.map((p) => [p.source_id, p.id])
    );
    const favoriteMap =
      dbPatents.length > 0
        ? await batchCheckFavorites({
            user_id: userId,
            favorite_type: "patent",
            item_ids: dbPatents.map((p) => p.id),
          })
        : {};

    patentItems = patents.slice(0, sizeNum).map((patent): PatentItem => {
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
  }

  // 记录搜索历史
  await createSearchHistory({
    user_id: userId,
    keyword: trimmedKeyword,
    search_type: "comprehensive",
    result_count: papersZhTotal + papersEnTotal + scholarTotal + patentTotal,
  }).catch((err) =>
    logger.error("记录搜索历史失败", {
      error: err instanceof Error ? err.message : err,
    })
  );

  // 提取所有论文的 keywords 到 tags（中文 + 外文）
  const tagsSet = new Set<string>();
  [...papersZhItems, ...papersEnItems].forEach((paper) => {
    if (paper.keywords && Array.isArray(paper.keywords)) {
      paper.keywords.forEach((keyword: string) => {
        if (keyword && typeof keyword === "string") {
          tagsSet.add(keyword);
        }
      });
    }
  });
  // 打乱顺序
  const tags = [...tagsSet].sort(() => Math.random() - 0.5);

  return sendSuccessResponse(res, "搜索成功", {
    keyword: trimmedKeyword,
    tags,
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
    scholars: {
      total: scholarTotal,
      page: 1,
      page_size: sizeNum,
      items: scholarItems,
      source: "aminer" as const,
    },
    patents: {
      total: patentTotal,
      page: 1,
      page_size: sizeNum,
      items: patentItems,
      source: "wanfang" as const,
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
