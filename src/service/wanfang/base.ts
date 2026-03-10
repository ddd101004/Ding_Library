import axios from "axios";
import crypto from "crypto";
import logger from "@/helper/logger";
import { saveWanfangSearchLog } from "@/utils/wanfangLogger";

// ============================================
// 环境变量配置
// ============================================

const WANFANG_APP_KEY = process.env.WANFANG_APP_KEY || "";
const WANFANG_APP_SECRET = process.env.WANFANG_APP_SECRET || "";
const WANFANG_API_BASE_URL = process.env.WANFANG_API_BASE_URL || "https://api.wanfangdata.com.cn/openwanfang";

if (!WANFANG_APP_KEY || !WANFANG_APP_SECRET) {
  logger.warn(
    "万方 API 密钥未配置，请在环境变量中设置 WANFANG_APP_KEY 和 WANFANG_APP_SECRET"
  );
}

// ============================================
// 公共类型定义
// ============================================

/**
 * 万方 API 字段值类型
 * 万方返回的字段可能是字符串、数字、布尔值或列表
 */
export interface WanfangFieldValue {
  stringValue?: string;
  numberValue?: number;
  boolValue?: boolean;
  listValue?: {
    values: Array<{ stringValue?: string; numberValue?: number }>;
  };
}

/**
 * 万方 API 文档类型
 */
export interface WanfangDocument {
  resourceType?: string;
  uid?: string;
  fields: Record<string, WanfangFieldValue>;
}

/**
 * 万方 API 搜索响应类型
 */
export interface WanfangSearchResponse {
  documents: WanfangDocument[];
  numFound: string;
  format?: string;
  nextCursorMark?: string;
  msg?: string;
  highlightResults?: Record<string, unknown>;
}

/**
 * 万方 API 详情响应类型
 */
export interface WanfangDetailResponse {
  document?: WanfangDocument;
  msg?: string;
}

// ============================================
// 公共工具函数
// ============================================

/**
 * 从万方字段值中提取中文字符串（第一个值）
 */
export function extractChineseValue(field: WanfangFieldValue | undefined): string {
  if (!field) return "";

  // 直接字符串值
  if (field.stringValue !== undefined) {
    return field.stringValue;
  }

  // 数值类型转字符串
  if (field.numberValue !== undefined) {
    return String(field.numberValue);
  }

  // 列表值取第一个（中文）
  if (field.listValue?.values?.length) {
    const firstValue = field.listValue.values[0];
    if (firstValue.stringValue !== undefined) {
      return firstValue.stringValue;
    }
    if (firstValue.numberValue !== undefined) {
      return String(firstValue.numberValue);
    }
  }

  return "";
}

/**
 * 从万方字段值中提取英文字符串（第二个值）
 */
export function extractEnglishValue(field: WanfangFieldValue | undefined): string {
  if (!field) return "";

  // 列表值：如果有第二个值，返回第二个值（英文）
  if (field.listValue?.values && field.listValue.values.length >= 2) {
    const secondValue = field.listValue.values[1];
    if (secondValue.stringValue !== undefined) {
      return secondValue.stringValue;
    }
    if (secondValue.numberValue !== undefined) {
      return String(secondValue.numberValue);
    }
  }

  // 没有第二个值时返回空字符串
  return "";
}

/**
 * 从万方字段值中提取字符串数组
 */
export function extractStringArray(field: WanfangFieldValue | undefined): string[] {
  if (!field?.listValue?.values?.length) {
    return [];
  }

  return field.listValue.values
    .map((v) => v.stringValue || (v.numberValue !== undefined ? String(v.numberValue) : ""))
    .filter((s) => s !== "");
}

/**
 * 从日期字符串或编号中提取年份
 */
export function extractYear(dateStr?: string, numStr?: string): number | undefined {
  // 优先从日期字段提取
  if (dateStr) {
    const yearMatch = dateStr.match(/(\d{4})/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
  }
  // 从编号提取
  if (numStr) {
    const yearMatch = numStr.match(/(\d{4})/);
    if (yearMatch) {
      return parseInt(yearMatch[1], 10);
    }
  }
  return undefined;
}

// ============================================
// API 请求函数
// ============================================

function generateSignature(): string {
  return crypto.createHash("md5").update(WANFANG_APP_SECRET).digest("hex").toLowerCase();
}

/**
 * 万方 API 请求封装
 */
export async function wanfangFetch<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  logger.info(`万方 API 请求: POST ${endpoint}`, { body });

  const signature = generateSignature();

  try {
    const response = await axios.post<T>(
      `${WANFANG_API_BASE_URL}${endpoint}`,
      body,
      {
        headers: {
          "X-Ca-AppKey": WANFANG_APP_KEY,
          "X-Ca-Signature": signature,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    logger.info(`万方 API 响应: ${endpoint} - 状态码 ${response.status}`, {
      data: response.data,
    });

    // 保存完整的请求和响应日志到单独文件（覆盖模式）
    saveWanfangSearchLog(endpoint, body, response.data, null);

    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number; data?: unknown }; message?: string };
    const errorMsg = axiosError.response?.data
      ? JSON.stringify(axiosError.response.data)
      : axiosError.message || "Unknown error";
    logger.error(`万方 API 请求错误: ${endpoint}`, { error: errorMsg });

    // 保存完整的请求和错误日志到单独文件（覆盖模式）
    saveWanfangSearchLog(endpoint, body, null, {
      status: axiosError.response?.status || "unknown",
      message: errorMsg,
      data: axiosError.response?.data,
    });

    throw new Error(`HTTP ${axiosError.response?.status || "unknown"}: ${errorMsg}`);
  }
}

/**
 * 万方 API 错误处理
 */
export function handleWanfangError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);

  logger.error("万方 API 错误:", message);

  if (message.includes("401")) {
    throw new Error("万方 API 认证失败，请检查 AppKey 和 AppSecret");
  } else if (message.includes("403")) {
    throw new Error("万方 API 无权限访问");
  } else if (message.includes("429")) {
    throw new Error("万方 API 请求频率超限");
  } else if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503")
  ) {
    throw new Error("万方 API 服务器错误");
  } else {
    throw new Error(`万方 API 请求失败: ${message}`);
  }
}

// ============================================
// 通用搜索参数构建
// ============================================

export interface WanfangSearchOptions {
  keyword: string;
  page?: number;
  size?: number;
  search_type?: string;
  year_from?: number;
  year_to?: number;
  year_field?: string; // 年份字段名，如 PublishYear 或 PublicationDate
}

/**
 * 构建万方搜索查询字符串
 */
export function buildWanfangQuery(options: WanfangSearchOptions): string {
  const { keyword, search_type = "all", year_from, year_to, year_field = "PublishYear" } = options;

  let query = "";
  if (search_type === "title") {
    query = `Title:${keyword}`;
  } else if (search_type === "abstract") {
    query = `Abstract:${keyword}`;
  } else if (search_type === "keyword") {
    query = `Keywords:${keyword}`;
  } else {
    query = keyword;
  }

  if (year_from || year_to) {
    const from = year_from || "*";
    const to = year_to || "*";
    query += ` AND ${year_field}:[${from} TO ${to}]`;
  }

  return query;
}
