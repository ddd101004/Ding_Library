import { aminerClient, handleAminerError, AminerApiResponse } from "./base";

// ========== 接口类型定义 ==========

export interface PatentSearchParams {
  query: string;
  page?: number;
  size?: number;
}

export interface PatentSearchResult {
  id: string;
  title: string;
  title_zh?: string;
  total?: number; // 搜索结果总数(仅第一条记录包含)
}

export interface PatentInfoResult {
  app_num: string;
  country: string;
  en?: any[];
  id: string;
  inventor?: Array<{
    name?: string;
  }>;
  name?: string;
  pub_kind: string;
  pub_num: string;
  sequence?: number;
  title: {
    zh?: string;
    en?: string;
  };
}

export interface PatentDetailResult {
  abstract?: {
    zh?: string | string[];
    en?: string | string[];
  };
  app_date?: {
    $date?: string;
    seconds?: number;
  };
  app_num: string;
  assignee?: Array<{ name?: string; sequence?: number }>;
  country: string;
  cpc?: string[];
  description?: string | { zh?: string[]; en?: string[] };
  id: string;
  inventor?: Array<{ name?: string; sequence?: number }>;
  ipc?: string[];
  ipcr?: string[];
  priority?: Array<{
    country?: string;
    date?: string;
    num?: string;
  }>;
  pub_date?: {
    $date?: string;
    seconds?: number;
  };
  pub_kind: string;
  pub_num: string;
  title: {
    zh?: string | string[];
    en?: string | string[];
  };
}

// ========== API 调用函数 ==========

/**
 * 专利搜索
 * @param params 搜索参数 (page 从 1 开始)
 * @returns 专利列表（注意：AMiner 专利搜索 API 不返回 total 字段）
 */
export async function searchPatents(params: PatentSearchParams) {
  try {
    // AMiner API page 从 0 开始，需要转换
    const page = params.page ?? 1;
    const aminerPage = page - 1;

    const response = (await aminerClient.post("/patent/search", {
      query: params.query,
      page: aminerPage,
      size: params.size ?? 10,
    })) as AminerApiResponse<PatentSearchResult[]>;

    // AMiner 专利搜索 API 不返回 total 字段
    // 返回的数组中也不包含 total
    return response.data;
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 专利信息(免费接口,推荐优先使用)
 * @param id 专利ID
 * @returns 专利基础信息
 */
export async function getPatentInfo(id: string) {
  try {
    const response = await aminerClient.get("/patent/info", {
      params: { id },
    });
    // AMiner API 返回格式: {code: 200, data: [...], ...}
    // 取 data 数组的第一个元素
    return response.data?.[0] as PatentInfoResult;
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 专利详情(付费接口,包含更多详细信息)
 * @param id 专利ID
 * @returns 专利详细信息
 */
export async function getPatentDetail(id: string) {
  try {
    const response = await aminerClient.get("/patent/detail", {
      params: { id },
    });
    // AMiner API 返回格式: {code: 200, data: [...], ...}
    // 取 data 数组的第一个元素
    return response.data?.[0] as PatentDetailResult;
  } catch (error) {
    handleAminerError(error);
  }
}
