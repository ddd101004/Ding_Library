/**
 * 专利相关类型定义
 */

/**
 * 专利详情响应字段（前端展示用）
 * 其他字段（app_num, pub_num, country, inventors, assignee 等）仅存入数据库
 */
export interface PatentDetailResponse {
  /** 唯一标识（数据库 UUID） */
  id: string;
  /** 专利标题 */
  title: string;
  /** 年份 */
  year?: number;
  /** 摘要 */
  abstract?: string;
  /** 预览链接 */
  preview_url?: string;
  /** 下载链接 */
  download_url?: string;
  /** 是否已收藏 */
  isFavorited: boolean;
}

/**
 * 专利列表项字段（搜索结果用）
 */
export interface PatentItem {
  /** 唯一标识（数据库 UUID） */
  id: string;
  /** 专利标题（主标题，优先中文） */
  title: string;
  /** 中文标题 */
  title_zh?: string;
  /** 英文标题 */
  title_en?: string;
  /** 摘要 */
  abstract?: string;
  /** 年份 */
  year?: number;
  /** 申请号 */
  app_num?: string;
  /** 公开号 */
  pub_num?: string;
  /** 国家 */
  country?: string;
  /** 发明人 */
  inventors?: Array<{
    name?: string;
  }>;
  /** 是否已收藏 */
  isFavorited?: boolean;
}

/**
 * 专利搜索响应数据
 */
export interface PatentSearchResponse {
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
  /** 专利列表 */
  items: PatentItem[];
}
