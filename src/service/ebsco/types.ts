/**
 * EBSCO API 类型定义
 *
 * 定义EBSCO Discovery Service API的请求和响应类型
 */

// ==================== 认证相关 ====================

/** 认证请求参数 */
export interface AuthRequest {
  UserId: string;
  Password: string;
}

/** 认证响应 */
export interface AuthResponse {
  AuthToken: string;
  AuthTimeout: number; // 超时时间（秒）
}

// ==================== 会话相关 ====================

/** 创建会话响应 */
export interface CreateSessionResponse {
  SessionToken: string;
}

// ==================== 搜索相关 ====================

/** 搜索请求参数 */
export interface SearchRequest {
  query?: string;                  // 搜索关键词
  fieldCode?: string;              // 字段代码: AU, TI, SU等
  page?: number;                   // 页码
  resultsPerPage?: number;         // 每页结果数
  sort?: string;                   // 排序方式
  searchMode?: 'any' | 'bool' | 'all' | 'smart';
  view?: 'title' | 'brief' | 'detailed';
  highlight?: boolean;             // 是否高亮
  includeFacets?: boolean;         // 是否包含分面
  limiters?: Record<string, string>;     // 限制器
  expanders?: string[];            // 扩展器
  facetFilters?: FacetFilter[];    // 分面过滤
  actions?: string[];              // 操作
}

/** 分面过滤 */
export interface FacetFilter {
  filterId: number;
  facetId: string;
  value: string;
}

/** 搜索响应 */
export interface SearchResponse {
  SearchResult: {
    Statistics: {
      TotalHits: number;
      TotalSearchTime: number;
      Databases: Database[];
    };
    Data: {
      RecordFormat: string;
      Records: SearchRecord[];
    };
    AvailableFacets?: AvailableFacet[];
  };
}

/** 数据库信息 */
export interface Database {
  Id: string;
  Label: string;
  Status: number;
  Hits: number;
}

/** 搜索结果记录 */
export interface SearchRecord {
  ResultId: number;
  Header: {
    DbId: string;
    DbLabel: string;
    An: string;
    RelevancyScore?: number;
    PubType: string;
    PubTypeId: string;
  };
  PLink: string;
  FullText?: {
    Text?: {
      Availability: number;
      Value?: string;
    };
    Links?: FullTextLink[];
  };
  CustomLinks?: CustomLink[];
  Items: RecordItem[];
  RecordInfo?: any;
}

/** 全文链接 */
export interface FullTextLink {
  Type: string;
  Url: string;
}

/** 自定义链接 */
export interface CustomLink {
  Url: string;
  Name: string;
  Category: string;
  Text: string;
  Icon?: string;
  MouseOverText?: string;
}

/** 记录条目 */
export interface RecordItem {
  Label: string;
  Group: string;
  Data: string;
}

/** 可用分面 */
export interface AvailableFacet {
  Id: string;
  Label: string;
  AvailableFacetValues: AvailableFacetValue[];
}

/** 分面值 */
export interface AvailableFacetValue {
  Value: string;
  Count: number;
  AddAction: string;
}

// ==================== 详情获取相关 ====================

/** 详情请求参数 */
export interface RetrieveRequest {
  dbid: string;           // 数据库ID
  an: string;             // 访问号
  highlight?: boolean;    // 是否高亮
}

/** 详情响应 */
export interface RetrieveResponse {
  Record: SearchRecord;
}

// ==================== Info相关 ====================

/** Info响应 */
export interface InfoResponse {
  AvailableSearchCriteria: {
    AvailableSorts: Sort[];
    AvailableSearchFields: SearchField[];
    AvailableLimiters: Limiter[];
    AvailableExpanders: Expander[];
  };
  ViewResultSettings: {
    ResultsPerPage: number;
    ResultListView: string;
  };
}

/** 排序选项 */
export interface Sort {
  Id: string;
  Label: string;
}

/** 搜索字段 */
export interface SearchField {
  FieldCode: string;
  Label: string;
}

/** 限制器 */
export interface Limiter {
  Id: string;
  Label: string;
  Type: string;
  Values?: LimiterValue[];
}

/** 限制器值 */
export interface LimiterValue {
  Value: string;
  Action: string;
}

/** 扩展器 */
export interface Expander {
  Id: string;
  Label: string;
}

// ==================== 错误响应 ====================

/** EBSCO错误响应 */
export interface EbscoErrorResponse {
  ErrorNumber?: string;
  ErrorDescription?: string;
  DetailedErrorDescription?: string;
}

// ==================== 缓存相关 ====================

/** Token缓存项 */
export interface TokenCache {
  token: string;
  expiresAt: number; // 过期时间戳
}

/** Session缓存项 */
export interface SessionCache {
  sessionToken: string;
  authToken?: string;
  createdAt: number;
  lastUsed: number;
}
