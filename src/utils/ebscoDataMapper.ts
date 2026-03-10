/**
 * EBSCO 数据映射工具
 * 用于将 EBSCO API 返回的原始数据转换为统一的论文数据格式
 */

import { EBSCOPaperItem } from "@/type/paper";
import {
  stripHtmlTags,
  extractEbscoAuthors,
  extractEbscoKeywords,
  extractYearFromPublication,
  extractPublicationDate,
  extractCitationCount,
} from "./htmlCleaner";

/**
 * 从 EBSCO Record 中提取指定字段的数据
 * @param items EBSCO Record.Items 数组
 * @param name 字段名称（如 "Title", "Author", "Subject"）
 * @returns 字段值（原始 HTML）
 */
function getItemData(items: any[], name: string): string {
  if (!Array.isArray(items)) return "";
  const item = items.find((i: any) => i.Name === name);
  return item?.Data || "";
}

/**
 * 从 EBSCO Record 中通过 Group 提取数据
 * @param items EBSCO Record.Items 数组
 * @param group Group 标识（如 "Ti", "Au", "Ab"）
 * @returns 字段值（原始 HTML）
 */
function getItemDataByGroup(items: any[], group: string): string {
  if (!Array.isArray(items)) return "";
  const item = items.find((i: any) => i.Group === group);
  return item?.Data || "";
}

/**
 * 将 EBSCO 原始 Record 转换为标准化的 EBSCOPaperItem
 * @param record EBSCO API 返回的单条记录
 * @returns 标准化的论文数据（包含内部字段）
 */
export function mapEbscoRecordToItem(record: any): any {
  const items = record.Items || [];

  // 提取原始字段（包含 HTML 标签）
  const rawTitle =
    getItemData(items, "Title") || getItemDataByGroup(items, "Ti") || "";
  const rawAbstract =
    getItemData(items, "Abstract") || getItemDataByGroup(items, "Ab") || "";
  const rawAuthor =
    getItemData(items, "Author") || getItemDataByGroup(items, "Au") || "";
  const rawSource =
    getItemData(items, "TitleSource") || getItemData(items, "Source") || "";
  const rawSubject = getItemData(items, "Subject");
  const rawDoi = getItemData(items, "DOI");
  const rawIssn = getItemData(items, "ISSN");

  // 清理 HTML 标签并提取结构化数据
  const title = stripHtmlTags(rawTitle);
  const abstract = stripHtmlTags(rawAbstract);
  const authors = extractEbscoAuthors(rawAuthor);
  const keywords = extractEbscoKeywords(rawSubject);
  const doi = stripHtmlTags(rawDoi);
  const issn = stripHtmlTags(rawIssn);

  // 提取引用数
  // 注意：EBSCO Discovery Service API 不提供引用数字段，此处始终返回 0
  const n_citation = extractCitationCount(items);

  // 提取年份和完整日期（仅用于数据库存储，不返回给前端）
  const rawYear = getItemData(items, "Year");
  const year = rawYear
    ? parseInt(rawYear)
    : extractYearFromPublication(rawSource);
  const publication_date = extractPublicationDate(rawSource);

  // 解析出版信息（期刊名作为 publication_name）
  const cleanSource = stripHtmlTags(rawSource);
  const publicationMatch = cleanSource.match(
    /^(.+?)\.\s*(\d{1,2}\/\d{1,2}\/\d{4})\.\s*(.+)$/
  );
  const journal = publicationMatch
    ? publicationMatch[1]
    : cleanSource.split(".")[0] || "";

  // 提取卷期信息
  const volumeIssueMatch = cleanSource.match(/Vol\.\s*(\d+),?\s*(?:Issue|No\.)\s*(\d+)/i);
  const volume = volumeIssueMatch ? volumeIssueMatch[1] : undefined;
  const issue = volumeIssueMatch ? volumeIssueMatch[2] : undefined;

  // 提取 db_id（仅用于数据库存储，不返回给前端）
  const db_id = record.Header?.DbId;

  return {
    // 基础字段
    id: record.Header?.An || "",
    source: "ebsco",
    source_id: record.Header?.An || "",
    title,
    abstract,

    // 内部字段（用于数据库存储）
    _year: year,
    _db_id: db_id,

    // 返回给前端的字段
    authors,
    keywords,
    doi,
    issn,
    volume,
    issue,
    publication_date,
    publication_name: journal || cleanSource,
    has_fulltext: record.FullText?.Text?.Availability === 1,
    fulltext_link: record.FullText?.Links?.[0]?.Url,
    n_citation: n_citation || 0,
    plink: record.PLink,
    // 保存原始 subjects 用于 tags（JSON 格式）
    subjects: keywords.length > 0 ? JSON.stringify(keywords) : undefined,
  };
}

/**
 * 批量转换 EBSCO Records 数组
 * @param records EBSCO API 返回的记录数组
 * @returns 标准化的论文数据数组
 */
export function mapEbscoRecordsToItems(records: any[]): EBSCOPaperItem[] {
  if (!Array.isArray(records)) return [];
  return records.map(mapEbscoRecordToItem);
}

/**
 * 提取 EBSCO 搜索结果的统计信息
 * @param searchResult EBSCO SearchResult 对象
 * @returns 统计信息
 */
export function extractEbscoStatistics(searchResult: any) {
  const statistics = searchResult?.Statistics || {};

  // 安全解析总数
  const totalHits =
    typeof statistics.TotalHits === "string"
      ? parseInt(statistics.TotalHits, 10)
      : statistics.TotalHits || 0;

  return {
    total: totalHits,
    search_time: statistics.TotalSearchTime,
    databases: statistics.Databases,
  };
}

/**
 * 提取 EBSCO 搜索结果的分面数据
 * @param searchResult EBSCO SearchResult 对象
 * @returns 格式化的分面数据数组
 */
export function extractEbscoFacets(searchResult: any) {
  const facetsArray = Array.isArray(searchResult?.AvailableFacets)
    ? searchResult.AvailableFacets
    : [];

  return facetsArray.map((facet: any) => {
    const facetValues = Array.isArray(facet.AvailableFacetValues)
      ? facet.AvailableFacetValues
      : [];

    return {
      id: facet.Id,
      label: facet.Label,
      values: facetValues.map((value: any) => ({
        value: value.Value,
        count: value.Count,
        action: value.AddAction,
      })),
    };
  });
}
