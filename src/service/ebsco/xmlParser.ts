/**
 * EBSCO XML响应解析工具
 *
 * EBSCO API 返回 XML 格式，需要转换为 JavaScript 对象
 */

import { parseString } from "xml2js";
import logger from "@/helper/logger";

/**
 * 解析 XML 响应为 JavaScript 对象
 * @param xmlText XML 文本
 * @returns 解析后的对象
 */
export async function parseXmlResponse<T = any>(xmlText: string): Promise<T> {
  return new Promise((resolve, reject) => {
    parseString(
      xmlText,
      {
        explicitArray: false, // 不将单个元素包装为数组
        mergeAttrs: true, // 将属性合并到对象中
        normalize: true, // 规范化文本内容
        trim: true, // 去除空白
      },
      (err, result) => {
        if (err) {
          logger.error("XML 解析失败", {
            error: err.message,
            xmlPreview: xmlText.substring(0, 200),
          });
          reject(new Error(`XML 解析失败: ${err.message}`));
        } else {
          resolve(result as T);
        }
      }
    );
  });
}

/**
 * 从 XML 中提取单个字段值
 * @param xmlText XML 文本
 * @param tagName 标签名（大小写不敏感）
 * @returns 字段值，未找到返回 null
 */
export function extractXmlField(
  xmlText: string,
  tagName: string
): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>(.*?)<\/${tagName}>`, "is");
  const match = xmlText.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * 检查 XML 是否包含错误信息
 * @param xmlText XML 文本
 * @returns 错误信息对象，无错误返回 null
 */
export function extractXmlError(
  xmlText: string
): { code: string; message: string } | null {
  const errorNumberMatch = xmlText.match(/<ErrorNumber>(.*?)<\/ErrorNumber>/i);
  const errorDescMatch = xmlText.match(
    /<ErrorDescription>(.*?)<\/ErrorDescription>/i
  );

  if (errorNumberMatch || errorDescMatch) {
    return {
      code: errorNumberMatch?.[1]?.trim() || "UNKNOWN",
      message: errorDescMatch?.[1]?.trim() || "Unknown error",
    };
  }

  return null;
}

/**
 * 确保值为数组
 * xml2js 使用 explicitArray: false 时，单个元素不会包装为数组
 * @param value 可能是数组或单个对象
 * @returns 数组形式
 */
export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * 从 EBSCO 嵌套结构中提取数组
 *
 * EBSCO XML 解析后的结构通常是:
 * - Records: { Record: [...] } → 需要提取 Record 数组
 * - Items: { Item: [...] } → 需要提取 Item 数组
 * - AvailableFacets: { AvailableFacet: [...] } → 需要提取 AvailableFacet 数组
 *
 * @param container 容器对象 (如 Records, Items, AvailableFacets)
 * @param childKey 子元素键名 (如 'Record', 'Item', 'AvailableFacet')
 * @returns 提取的数组
 */
export function extractNestedArray<T>(
  container: any,
  childKey: string
): T[] {
  if (!container) {
    return [];
  }

  // 如果容器本身就是数组，直接返回
  if (Array.isArray(container)) {
    return container;
  }

  // 从嵌套对象中提取子元素
  const child = container[childKey];
  return ensureArray<T>(child);
}

/**
 * 规范化 EBSCO 搜索结果的数据结构
 * @param searchResult 原始搜索结果
 * @returns 规范化后的结果
 */
export function normalizeSearchResult(searchResult: any): any {
  if (!searchResult) {
    return null;
  }

  return {
    Statistics: searchResult.Statistics,
    Data: {
      RecordFormat: searchResult.Data?.RecordFormat,
      Records: extractNestedArray(searchResult.Data?.Records, 'Record'),
    },
    AvailableFacets: extractNestedArray(
      searchResult.AvailableFacets,
      'AvailableFacet'
    ),
    AvailableCriteria: searchResult.AvailableCriteria,
  };
}

/**
 * 规范化 EBSCO 记录的 Items 结构
 * @param record 原始记录
 * @returns 规范化后的记录
 */
export function normalizeRecord(record: any): any {
  if (!record) {
    return null;
  }

  return {
    ...record,
    Items: extractNestedArray(record.Items, 'Item'),
  };
}

/**
 * 规范化分面值数组
 * @param facet 原始分面对象
 * @returns 规范化后的分面
 */
export function normalizeFacet(facet: any): any {
  if (!facet) {
    return null;
  }

  return {
    ...facet,
    AvailableFacetValues: extractNestedArray(
      facet.AvailableFacetValues,
      'AvailableFacetValue'
    ),
  };
}
