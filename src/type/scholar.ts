/**
 * 学者相关类型定义
 */

// ========== 学者画像 - 结构化数据类型 ==========

/**
 * 结构化教育经历
 */
export interface ScholarEdu {
  /** 学校名称 */
  school?: string;
  /** 学校名称(中文) */
  school_zh?: string;
  /** 学位 */
  degree?: string;
  /** 学位(中文) */
  degree_zh?: string;
  /** 专业 */
  major?: string;
  /** 专业(中文) */
  major_zh?: string;
  /** 开始日期 */
  start_date?: string;
  /** 结束日期 */
  end_date?: string;
}

/**
 * 结构化工作经历
 */
export interface ScholarWork {
  /** 机构名称 */
  org?: string;
  /** 机构名称(中文) */
  org_zh?: string;
  /** 职位 */
  position?: string;
  /** 职位(中文) */
  position_zh?: string;
  /** 开始日期 */
  start_date?: string;
  /** 结束日期 */
  end_date?: string;
}

/**
 * AI研究领域
 */
export interface ScholarDomain {
  /** 领域名称 */
  name?: string;
  /** 领域名称(中文) */
  name_zh?: string;
  /** 权重 */
  weight?: number;
}

/**
 * AI研究兴趣
 */
export interface ScholarInterest {
  /** 兴趣名称 */
  name?: string;
  /** 兴趣名称(中文) */
  name_zh?: string;
  /** 权重 */
  weight?: number;
}

// ========== 学者基础类型 ==========

/**
 * 学者基础字段(列表项)
 */
export interface ScholarItem {
  /** 唯一标识（数据库 UUID） */
  id: string;
  /** 姓名 */
  name: string;
  /** 中文姓名 */
  name_zh?: string;
  /** 机构 */
  org?: string;
  /** 中文机构 */
  org_zh?: string;
  /** 引用数 */
  n_citation?: number;
  /** 是否已收藏 */
  isFavorited?: boolean;
}

/**
 * 学者详情(完整信息)
 */
export interface ScholarDetail extends ScholarItem {
  /** AMiner ID */
  aminer_id?: string;
  /** 机构列表 */
  orgs?: string[];
  /** 中文机构列表 */
  org_zhs?: string[];
  /** 职位 */
  position?: string;
  /** 中文职位 */
  position_zh?: string;
  /** 个人简介 */
  bio?: string;
  /** 中文个人简介 */
  bio_zh?: string;
  /** 教育经历(文本) */
  edu?: string;
  /** 中文教育经历(文本) */
  edu_zh?: string;
  /** 研究兴趣 */
  interests?: string[];
  /** 荣誉列表 */
  honor?: any[];
  /** H指数 */
  h_index?: number;
  // 学者画像 - 结构化数据
  /** 结构化教育经历 */
  edus?: ScholarEdu[];
  /** 结构化工作经历 */
  works?: ScholarWork[];
  /** AI研究领域 */
  ai_domain?: ScholarDomain[];
  /** AI研究兴趣 */
  ai_interests?: ScholarInterest[];
}

/**
 * 学者搜索响应数据
 */
export interface ScholarSearchResponse {
  /** 总结果数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  page_size: number;
  /** 总页数 */
  total_pages: number;
  /** 数据源标识 */
  source: "aminer";
  /** 学者列表 */
  items: ScholarItem[];
}
