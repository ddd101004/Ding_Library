import { aminerClient, handleAminerError, AminerApiResponse } from "./base";
import { ScholarEdu, ScholarWork, ScholarDomain, ScholarInterest } from "@/type/scholar";

// ========== 接口类型定义 ==========

export interface ScholarSearchParams {
  name: string;
  org?: string;
  page?: number;
  size?: number;
  org_id?: string[];
}

export interface ScholarSearchResult {
  id: string;
  interests?: string[];
  n_citation?: number;
  name?: string;
  name_zh?: string;
  org?: string;
  org_id?: string;
  org_zh?: string;
  total?: number;
}

export interface ScholarDetailResult {
  bio?: string;
  bio_zh?: string;
  edu?: string;
  edu_zh?: string;
  honor?: Array<unknown>;
  id: string;
  name?: string;
  name_zh?: string;
  org_zhs?: string[];
  orgs?: string[];
  position?: string;
  position_zh?: string;
  interests?: string[];
  n_citation?: number;
}

export interface ScholarPaper {
  author_id: string;
  id: string;
  title?: string;
  title_zh?: string;
}

// 学者专利关联 - AMiner API 原始响应格式
export interface ScholarPatentRaw {
  patent_id: string;
  person_id: string;
  title?: {
    en?: string[];
    zh?: string[];
  };
}

// 学者专利关联 - 转换后的格式
export interface ScholarPatent {
  id: string;
  author_id: string;
  title?: string;
  title_zh?: string;
}

// 学者画像接口返回类型
export interface ScholarFigureResult {
  id: string;
  ai_domain?: ScholarDomain[];
  ai_interests?: ScholarInterest[];
  edus?: ScholarEdu[];
  works?: ScholarWork[];
}

// ========== API 调用函数 ==========

/**
 * 学者搜索
 * @param params 搜索参数 (page 从 1 开始)
 * @returns 学者列表（第一条记录包含 total 字段）
 */
export async function searchScholars(params: ScholarSearchParams) {
  try {
    // AMiner API 使用 offset，需要转换: offset = (page - 1) * size
    const page = params.page ?? 1;
    const size = params.size ?? 10;
    const offset = (page - 1) * size;

    const apiParams = {
      name: params.name,
      org: params.org,
      offset,
      size,
      org_id: params.org_id,
    };

    const response = (await aminerClient.post(
      "/person/search",
      apiParams
    )) as AminerApiResponse<ScholarSearchResult[]>;
    const scholars = response.data;

    // 将 total 添加到第一条记录中（如果有数据的话）
    if (scholars.length > 0 && response.total !== undefined) {
      scholars[0].total = response.total;
    }

    return scholars;
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 学者详情
 * @param id 学者ID
 * @returns 学者详情
 */
export async function getScholarDetail(id: string) {
  try {
    const response = await aminerClient.get("/person/detail", {
      params: { id },
    });
    return response.data as ScholarDetailResult;
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 获取学者论文列表
 * @param id 学者ID
 * @returns 学者论文列表，无数据时返回空数组
 */
export async function getScholarPapers(id: string): Promise<ScholarPaper[]> {
  try {
    const response = await aminerClient.get("/person/paper/relation", {
      params: { id },
    });
    const rawData = response.data as ScholarPaper[] | null;

    // 处理空数据情况
    if (!rawData || !Array.isArray(rawData)) {
      return [];
    }

    return rawData;
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 学者画像(结构化教育/工作经历)
 * @param id 学者ID
 * @returns 学者画像信息(包含结构化教育经历、工作经历、研究领域等)
 */
export async function getScholarFigure(id: string) {
  try {
    const response = await aminerClient.get("/person/figure", {
      params: { id },
    });
    return response.data as ScholarFigureResult;
  } catch (error) {
    handleAminerError(error);
  }
}

/**
 * 获取学者专利列表
 * @param id 学者ID
 * @returns 学者专利列表（已转换为统一格式），无数据时返回空数组
 */
export async function getScholarPatents(id: string): Promise<ScholarPatent[]> {
  try {
    const response = await aminerClient.get("/person/patent/relation", {
      params: { id },
    });
    const rawData = response.data as ScholarPatentRaw[] | null;

    // 处理空数据情况
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    // 转换 AMiner API 响应格式为统一格式
    return rawData.map(
      (item): ScholarPatent => ({
        id: item.patent_id,
        author_id: item.person_id,
        title: item.title?.en?.[0] || item.title?.zh?.[0] || undefined,
        title_zh: item.title?.zh?.[0] || undefined,
      })
    );
  } catch (error) {
    handleAminerError(error);
  }
}
