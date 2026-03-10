import { aminerClient, handleAminerError } from "./base";

// ========== 接口类型定义 ==========

export interface PaperSearchParams {
  page?: number;
  size?: number;
  title?: string;
  keyword?: string;
  abstract?: string;
  author?: string;
  org?: string;
  venue?: string;
  order?: "year" | "n_citation";
  yearFrom?: number;
  yearTo?: number;
}

export interface PaperSearchResult {
  doi?: string;
  id: string;
  title?: string;
  title_zh?: string;
  abstract?: string;
  abstract_zh?: string;
  year?: number;
  keywords?: string[];
  keywords_zh?: string[];
  authors?: Array<{
    name?: string;
    name_zh?: string;
    org?: string;
    org_zh?: string;
  }>;
  venue?: {
    raw?: string;
    raw_zh?: string;
    t?: string;
  };
  issn?: string;
  issue?: string;
  volume?: string;
  n_citation?: number;
  total?: number; // 搜索结果总数(仅第一条记录包含)
}

export interface PaperDetailResult {
  abstract?: string;
  abstract_zh?: string;
  authors?: Array<{
    name?: string;
    name_zh?: string;
    org?: string;
    org_zh?: string;
  }>;
  doi?: string;
  id: string;
  issn?: string;
  issue?: string;
  keywords?: string[];
  keywords_zh?: string[];
  title?: string;
  title_zh?: string;
  venue?: {
    raw?: string;
    raw_zh?: string;
    t?: string;
  };
  volume?: string;
  year?: number;
  n_citation?: number;
}

// ========== API 调用函数 ==========

/**
 * 论文搜索(免费版)
 * @param params 搜索参数 (page 从 1 开始)
 * @returns 论文列表
 */
export async function searchPapers(params: {
  title: string;
  page?: number;
  size?: number;
}) {
  try {
    // AMiner API page 从 0 开始，需要转换
    const page = params.page ?? 1;
    const aminerPage = page - 1;

    const response = await aminerClient.get("/paper/search", {
      params: {
        title: params.title,
        page: aminerPage,
        size: params.size || 10,
      },
    });
    return response.data as PaperSearchResult[];
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 论文搜索Pro(付费版) - 支持更多搜索条件
 * @param params 搜索参数
 * @returns 论文列表
 */
export async function searchPapersPro(params: PaperSearchParams) {
  try {
    // AMiner API page 从 0 开始，需要转换
    const page = params.page ?? 1;
    const aminerPage = page - 1;

    const apiParams = {
      ...params,
      page: aminerPage,
    };

    const response = await aminerClient.get("/paper/search/pro", {
      params: apiParams,
    });
    return response.data as PaperSearchResult[];
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 论文详情
 * @param id 论文ID
 * @returns 论文详情
 */
export async function getPaperDetail(id: string) {
  try {
    const response = await aminerClient.get("/paper/detail", {
      params: { id },
    });
    return response.data as PaperDetailResult;
  } catch (error) {
    handleAminerError(error);
  }
}
