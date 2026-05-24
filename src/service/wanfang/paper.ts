/**
 * 万方论文搜索服务 — 期刊/会议/学位论文检索与详情获取
 *
 * 【后端】仅在学术搜索API和自动论文检索中使用
 *
 * 导出函数/类型：
 * - WanfangFilter — 过滤器类型（field + value）
 * - WanfangPaperSearchParams — 论文搜索参数类型（keyword/page/size/search_type/year_from/year_to/filters）
 * - WanfangPaperResult — 论文结果类型（id/title/creator/abstract/keywords/doi等）
 * - searchWanfangPapers(params) — 搜索万方论文（4个collections：期刊/会议/中文期刊/学位论文，默认search_type=all全文检索）
 * - getWanfangPaperDetail(id) — 获取单篇论文详情
 *
 * 引用方：
 * - service/chat/autoRelatedPapers.ts — 自动论文检索调用searchWanfangPapers
 * - pages/api/academic-search.ts — 学术搜索API
 * - service/wanfang/paperProcessor.ts — 搜索结果处理
 */
import {
  wanfangFetch,
  handleWanfangError,
  buildWanfangQuery,
  extractChineseValue,
  extractEnglishValue,
  extractStringArray,
  WanfangDocument,
  WanfangSearchResponse,
  WanfangDetailResponse,
} from "./base";

// 万方论文 API 字段
const PAPER_FIELDS = [
  "Id",
  "Title",
  "Creator",
  "Abstract",
  "Keywords",
  "PeriodicalTitle",
  "PublishYear",
  "DOI",
  "ISSN",
] as const;

// 万方 API 过滤器类型
export interface WanfangFilter {
  field: string;
  value: string;
}

export interface WanfangPaperSearchParams {
  keyword: string;
  page?: number;
  size?: number;
  search_type?: "title" | "abstract" | "keyword" | "all";
  year_from?: number;
  year_to?: number;
  filters?: WanfangFilter[];
}

export interface WanfangPaperResult {
  id: string;
  title?: string;
  title_en?: string;
  creator?: string[];
  abstract?: string;
  abstract_en?: string;
  keywords?: string[];
  periodical_title?: string;
  periodical_title_en?: string;
  publish_year?: string;
  doi?: string;
  issn?: string;
  source_db?: string;
  total?: number;
}

/**
 * 映射万方论文文档到内部格式
 */
function mapWanfangPaperDoc(doc: WanfangDocument): WanfangPaperResult {
  const fields = doc.fields || {};

  return {
    id: extractChineseValue(fields.Id),
    title: extractChineseValue(fields.Title),
    title_en: extractEnglishValue(fields.Title),
    creator: extractStringArray(fields.Creator),
    abstract: extractChineseValue(fields.Abstract),
    abstract_en: extractEnglishValue(fields.Abstract),
    keywords: extractStringArray(fields.Keywords),
    periodical_title: extractChineseValue(fields.PeriodicalTitle),
    periodical_title_en: extractEnglishValue(fields.PeriodicalTitle),
    publish_year: extractChineseValue(fields.PublishYear),
    doi: extractChineseValue(fields.DOI),
    issn: extractChineseValue(fields.ISSN),
    source_db: "wanfang",
  };
}

/**
 * 搜索万方论文
 */
export async function searchWanfangPapers(
  params: WanfangPaperSearchParams
): Promise<WanfangPaperResult[]> {
  try {
    const {
      keyword,
      page = 1,
      size = 10,
      search_type = "all",
      year_from,
      year_to,
      filters,
    } = params;

    const query = buildWanfangQuery({
      keyword,
      search_type,
      year_from,
      year_to,
      year_field: "PublishYear",
    });

    // 构建请求体
    const requestBody: Record<string, unknown> = {
      collections: [
        "OpenPeriodical",
        "OpenConference",
        "OpenPeriodicalChi",
        "OpenThesis"
      ],
      query,
      returned_fields: [...PAPER_FIELDS],
      start: (page - 1) * size,
      rows: Math.min(size, 100),
      expand_options: ["TRANSLATE"],
      sort: {
        sort_name: "OfflineScore"
      }
    };

    // 添加过滤器（用于外文 NSTL 检索）
    if (filters && filters.length > 0) {
      requestBody.filters = filters;
    }

    const response = await wanfangFetch<WanfangSearchResponse>("/getQuery", requestBody);

    if (!response?.documents) {
      throw new Error("万方 API 返回数据格式错误");
    }

    const numFound = parseInt(response.numFound, 10) || 0;

    return response.documents.map((doc, index) => ({
      ...mapWanfangPaperDoc(doc),
      total: index === 0 ? numFound : undefined,
    }));
  } catch (error) {
    handleWanfangError(error);
  }
}

/**
 * 获取万方论文详情
 */
export async function getWanfangPaperDetail(
  id: string
): Promise<WanfangPaperResult | null> {
  try {
    const response = await wanfangFetch<WanfangDetailResponse>("/getDoc", {
      collection: "OpenPeriodical",
      id,
      returned_fields: [...PAPER_FIELDS],
    });

    if (!response?.document) {
      return null;
    }

    return mapWanfangPaperDoc(response.document);
  } catch (error) {
    handleWanfangError(error);
  }
}
