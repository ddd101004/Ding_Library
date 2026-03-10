/**
 * 论文相关类型定义
 */

/**
 * 数据源类型
 */
export type PaperSource = "aminer" | "ebsco" | "local" | "wanfang" | "wanfang_en";

/**
 * 论文基础字段（所有数据源共有）
 */
export interface BasePaperItem {
  /** 唯一标识（数据库 UUID 或源系统 ID） */
  id: string;
  /** 数据源标识 */
  source: PaperSource;
  /** 源系统 ID */
  source_id: string;
  /** 标题 */
  title: string;
  /** 摘要 */
  abstract?: string;
  /** 发表年份 */
  year?: number;
}

/**
 * AMiner 特定字段
 */
export interface AMinerPaperFields {
  /** 中文标题 */
  title_zh?: string;
  /** 中文摘要 */
  abstract_zh?: string;
  /** 作者列表（AMiner 格式：对象数组） */
  authors?: Array<{
    name?: string;
    name_zh?: string;
    org?: string;
    org_zh?: string;
  }>;
  /** 关键词 */
  keywords?: string[];
  /** 中文关键词 */
  keywords_zh?: string[];
  /** 出版物信息 */
  venue?: {
    raw?: string;
    raw_zh?: string;
    t?: number | string;
  };
  /** 引用数 */
  n_citation?: number;
  /** DOI */
  doi?: string;
  /** ISSN */
  issn?: string;
  /** 卷号 */
  volume?: string;
  /** 期号 */
  issue?: string;
  /** 是否已收藏 */
  isFavorited?: boolean;
}

/**
 * EBSCO 特定字段
 */
export interface EBSCOPaperFields {
  /** 作者列表（EBSCO 格式：字符串数组） */
  authors?: string[];
  /** 关键词 */
  keywords?: string[];
  /** 发表日期（ISO 格式：YYYY-MM-DD） */
  publication_date?: string;
  /** 出版物名称 */
  publication_name?: string;
  /** 是否有全文 */
  has_fulltext?: boolean;
  /** 全文链接 */
  fulltext_link?: string;
  /** 永久链接 */
  plink?: string;
  /** 引用数 */
  n_citation?: number;
  /** 是否已收藏 */
  isFavorited?: boolean;
}

/**
 * Local（本地数据库）特定字段
 */
export interface LocalPaperFields extends EBSCOPaperFields {
  /** PDF 是否已下载 */
  pdf_downloaded?: boolean;
  /** 查看次数 */
  view_count?: number;
  /** 下载次数 */
  download_count?: number;
}

/**
 * Wanfang 特定字段
 */
export interface WanfangPaperFields {
  /** 作者列表（Wanfang 格式：字符串数组） */
  authors?: string[];
  /** 关键词 */
  keywords?: string[];
  /** 期刊名称 */
  periodical_title?: string;
  /** 期刊名称（英文） */
  periodical_title_en?: string;
  /** 发表年份 */
  publish_year?: string;
  /** DOI */
  doi?: string;
  /** ISSN */
  issn?: string;
  /** 来源数据库 */
  source_db?: string;
  /** 标题（英文） */
  title_en?: string;
  /** 摘要（英文） */
  abstract_en?: string;
  /** 是否已收藏 */
  isFavorited?: boolean;
}

/**
 * AMiner 论文项
 */
export type AMinerPaperItem = BasePaperItem & AMinerPaperFields;

/**
 * EBSCO 论文项
 */
export type EBSCOPaperItem = BasePaperItem & EBSCOPaperFields;

/**
 * Local 论文项
 */
export type LocalPaperItem = BasePaperItem & LocalPaperFields;

/**
 * Wanfang 论文项
 */
export type WanfangPaperItem = BasePaperItem & WanfangPaperFields;

/**
 * 通用论文项（联合类型）
 */
export type PaperItem = AMinerPaperItem | EBSCOPaperItem | LocalPaperItem | WanfangPaperItem;

/**
 * 论文搜索响应数据
 */
export interface PaperSearchResponse {
  /** 总结果数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  page_size: number;
  /** 总页数 */
  total_pages: number;
  /** 数据源标识 */
  source: PaperSource;
  /** 论文列表 */
  items: PaperItem[];
  /** 搜索耗时（秒，仅 EBSCO 返回） */
  search_time?: number;
  /** 分面数据（仅 EBSCO 返回） */
  facets?: Array<{
    id: string;
    label: string;
    values: Array<{
      value: string;
      count: number;
      action: string;
    }>;
  }>;
  /** 数据库信息（仅 EBSCO 返回） */
  databases?: Array<{
    Id: string;
    Label: string;
    Hits: number;
  }>;
}

/**
 * 论文搜索请求参数（基础）
 */
export interface BasePaperSearchRequest {
  /** 搜索关键词 */
  keyword: string;
  /** 数据源 */
  source?: PaperSource;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  page_size?: number;
  /** 排序方式 */
  sort?: "relevance" | "date";
}

/**
 * AMiner 搜索请求参数
 */
export interface AMinerSearchRequest extends BasePaperSearchRequest {
  source?: "aminer";
  /** 搜索类型 */
  search_type?: "title" | "keyword" | "abstract" | "author" | "org" | "venue";
  /** 排序方式（AMiner 特定） */
  order?: "year" | "n_citation";
  /** 起始年份 */
  year_from?: number;
  /** 结束年份 */
  year_to?: number;
}

/**
 * EBSCO 搜索请求参数
 */
export interface EBSCOSearchRequest extends BasePaperSearchRequest {
  source?: "ebsco";
  /** 搜索字段代码 */
  field_code?: string;
  /** 限制器 */
  limiters?: Array<Record<string, unknown>>;
  /** 扩展器 */
  expanders?: string[];
  /** 分面过滤器 */
  facet_filters?: Array<Record<string, unknown>>;
  /** 结果视图 */
  view?: "brief" | "detailed";
  /** 搜索模式 */
  search_mode?: "all" | "any" | "smart";
  /** 是否高亮 */
  highlight?: boolean;
}

/**
 * Local 搜索请求参数
 */
export interface LocalSearchRequest extends BasePaperSearchRequest {
  source?: "local";
}

/**
 * 论文搜索请求参数（联合类型）
 */
export type PaperSearchRequest =
  | AMinerSearchRequest
  | EBSCOSearchRequest
  | LocalSearchRequest;
