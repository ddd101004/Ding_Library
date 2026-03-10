/**
 * 全文传递服务常量定义
 *
 * 定义全文传递接口所需的学科类别和文章类型选项
 * 数据来源：https://zy.wisdomlibrary.cn 全文传递服务页面
 */

// ==================== 学科类别 ====================

/**
 * 学科类别选项
 * 用于全文传递接口的 subject_type_id 参数
 */
export const SUBJECT_CATEGORIES = [
  { label: "生命科学和生物学", value: "生命科学和生物学" },
  { label: "医药科学", value: "医药科学" },
  { label: "化学", value: "化学" },
  { label: "农业科学", value: "农业科学" },
  { label: "工程技术", value: "工程技术" },
  { label: "数学和物理", value: "数学和物理" },
  { label: "天文和地求学", value: "天文和地求学" },
  { label: "交通和运输", value: "交通和运输" },
  { label: "航空和航天", value: "航空和航天" },
  { label: "环境科学", value: "环境科学" },
  { label: "建筑技术", value: "建筑技术" },
  { label: "其他", value: "其他" },
] as const;

/**
 * 学科类别值类型
 */
export type SubjectCategory = (typeof SUBJECT_CATEGORIES)[number]["value"];

// ==================== 文章类型 ====================

/**
 * 文章类型选项
 * 用于全文传递接口的 doctype_id 参数
 */
export const ARTICLE_TYPES = [
  { label: "图书", value: "图书" },
  { label: "期刊", value: "期刊" },
  { label: "专利", value: "专利" },
] as const;

/**
 * 文章类型值类型
 */
export type ArticleType = (typeof ARTICLE_TYPES)[number]["value"];

/**
 * 默认学科类别
 */
export const DEFAULT_SUBJECT_CATEGORY: SubjectCategory = "其他";

/**
 * 默认文章类型
 */
export const DEFAULT_ARTICLE_TYPE: ArticleType = "期刊";
