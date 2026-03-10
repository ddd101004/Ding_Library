import {
  wanfangFetch,
  handleWanfangError,
  buildWanfangQuery,
  extractChineseValue,
  extractEnglishValue,
  extractStringArray,
  extractYear,
  WanfangDocument,
  WanfangSearchResponse,
  WanfangDetailResponse,
} from "./base";

// 万方专利 API 字段
const PATENT_FIELDS = [
  "Id",
  "Title",
  "Abstract",
  "Creator",
  "Applicant",
  "ApplicationNumber",
  "PublicationNumber",
  "PublicationDate",
  "ApplicationDate",
  "IPC",
  "Country",
] as const;

export interface WanfangPatentSearchParams {
  keyword: string;
  page?: number;
  size?: number;
  search_type?: "title" | "abstract" | "all";
  year_from?: number;
  year_to?: number;
}

export interface WanfangPatentResult {
  id: string;
  title?: string;
  title_en?: string;
  abstract?: string;
  abstract_en?: string;
  creators?: string[];
  applicants?: string[];
  app_num?: string;
  pub_num?: string;
  pub_date?: string;
  app_date?: string;
  ipc?: string[];
  country?: string;
  year?: number;
  source_db?: string;
  total?: number;
}

/**
 * 映射万方专利文档到内部格式
 */
function mapWanfangPatentDoc(doc: WanfangDocument): WanfangPatentResult {
  const fields = doc.fields || {};

  const appNum = extractChineseValue(fields.ApplicationNumber);
  const pubDate = extractChineseValue(fields.PublicationDate);
  const appDate = extractChineseValue(fields.ApplicationDate);

  return {
    id: extractChineseValue(fields.Id),
    title: extractChineseValue(fields.Title),
    title_en: extractEnglishValue(fields.Title),
    abstract: extractChineseValue(fields.Abstract),
    abstract_en: extractEnglishValue(fields.Abstract),
    creators: extractStringArray(fields.Creator),
    applicants: extractStringArray(fields.Applicant),
    app_num: appNum,
    pub_num: extractChineseValue(fields.PublicationNumber),
    pub_date: pubDate,
    app_date: appDate,
    ipc: extractStringArray(fields.IPC),
    country: extractChineseValue(fields.Country) || "CN",
    year: extractYear(pubDate, appNum),
    source_db: "wanfang",
  };
}

/**
 * 搜索万方专利
 */
export async function searchWanfangPatents(
  params: WanfangPatentSearchParams
): Promise<WanfangPatentResult[]> {
  try {
    const {
      keyword,
      page = 1,
      size = 10,
      search_type = "all",
      year_from,
      year_to,
    } = params;

    const query = buildWanfangQuery({
      keyword,
      search_type,
      year_from,
      year_to,
      year_field: "PublicationDate",
    });

    // 构建请求体 - 使用 OpenPatent 集合
    const requestBody: Record<string, unknown> = {
      collections: ["OpenPatent"],
      query,
      returned_fields: [...PATENT_FIELDS],
      start: (page - 1) * size,
      rows: Math.min(size, 100),
      expand_options: ["TRANSLATE"],
      sort: {
        sort_name: "OfflineScore",
      },
    };

    const response = await wanfangFetch<WanfangSearchResponse>("/getQuery", requestBody);

    if (!response?.documents) {
      throw new Error("万方专利 API 返回数据格式错误");
    }

    const numFound = parseInt(response.numFound, 10) || 0;

    return response.documents.map((doc, index) => ({
      ...mapWanfangPatentDoc(doc),
      total: index === 0 ? numFound : undefined,
    }));
  } catch (error) {
    handleWanfangError(error);
  }
}

/**
 * 获取万方专利详情
 */
export async function getWanfangPatentDetail(
  id: string
): Promise<WanfangPatentResult | null> {
  try {
    const response = await wanfangFetch<WanfangDetailResponse>("/getDoc", {
      collection: "OpenPatent",
      id,
      returned_fields: [...PATENT_FIELDS],
    });

    if (!response?.document) {
      return null;
    }

    return mapWanfangPatentDoc(response.document);
  } catch (error) {
    handleWanfangError(error);
  }
}
