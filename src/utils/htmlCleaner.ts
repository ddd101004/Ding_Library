/**
 * HTML 标签清理工具
 * 用于清理 EBSCO 返回的包含 HTML 标签的数据
 */

/**
 * 移除所有 HTML 标签
 * @param html 包含 HTML 的字符串
 * @returns 纯文本
 */
export function stripHtmlTags(html: string | undefined | null): string {
  if (!html) return "";

  return html
    .replace(/<[^>]+>/g, "") // 移除所有 HTML 标签
    .replace(/&nbsp;/g, " ") // 替换 &nbsp; 为空格
    .replace(/&amp;/g, "&") // 替换 &amp; 为 &
    .replace(/&lt;/g, "<") // 替换 &lt; 为 <
    .replace(/&gt;/g, ">") // 替换 &gt; 为 >
    .replace(/&quot;/g, '"') // 替换 &quot; 为 "
    .replace(/&#39;/g, "'") // 替换 &#39; 为 '
    .replace(/\s+/g, " ") // 合并多个空格为一个
    .trim();
}

/**
 * 从 EBSCO 的 Author 字段中提取作者名称
 * 示例输入：
 * "<searchLink fieldCode=\"AR\" term=\"%22Yusuf%2C+Rahmi%22\">Yusuf, Rahmi</searchLink><relatesTo>Aff4</relatesTo><br />"
 *
 * @param authorHtml EBSCO 返回的 Author 字段（包含 HTML）
 * @returns 作者名称数组
 */
export function extractEbscoAuthors(authorHtml: string | undefined | null): string[] {
  if (!authorHtml) return [];

  // 方法1：使用正则提取 <searchLink> 标签中的内容
  const authorPattern = /<searchLink[^>]*>([^<]+)<\/searchLink>/g;
  const rawAuthors: string[] = [];
  let match;

  while ((match = authorPattern.exec(authorHtml)) !== null) {
    const authorName = match[1].trim();
    if (authorName) {
      rawAuthors.push(authorName);
    }
  }

  // 方法2：如果方法1没有结果，尝试移除所有标签后按分号分割
  if (rawAuthors.length === 0) {
    const cleanText = stripHtmlTags(authorHtml);
    return cleanText
      .split(/[;；,，]/)
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  // 对提取的每个作者项进一步按分号分割（处理中文论文格式）
  const authors: string[] = [];
  for (const author of rawAuthors) {
    if (author.includes(';') || author.includes('；')) {
      const split = author.split(/[;；]/).map(n => n.trim()).filter(n => n.length > 0);
      authors.push(...split);
    } else {
      authors.push(author);
    }
  }

  return authors;
}

/**
 * 从 EBSCO 的出版信息中提取年份
 * 示例输入：
 * "<i>Protein Evolution: Methods and Protocols</i>. 11/01/2025. 2979:213-223"
 *
 * @param publicationInfo 出版信息字符串
 * @returns 年份（数字）或 undefined
 */
export function extractYearFromPublication(publicationInfo: string | undefined | null): number | undefined {
  if (!publicationInfo) return undefined;

  // 匹配常见年份格式：YYYY 或 MM/DD/YYYY
  const yearPatterns = [
    /\b(\d{4})\b/, // 匹配独立的 4 位数字
    /\d{1,2}\/\d{1,2}\/(\d{4})/, // 匹配 MM/DD/YYYY 格式
  ];

  for (const pattern of yearPatterns) {
    const match = publicationInfo.match(pattern);
    if (match) {
      const year = parseInt(match[1] || match[0]);
      if (year >= 1900 && year <= new Date().getFullYear() + 5) {
        return year;
      }
    }
  }

  return undefined;
}

/**
 * 从 EBSCO 的出版信息中提取完整发表日期
 * 示例输入：
 * "<i>Protein Evolution: Methods and Protocols</i>. 11/01/2025. 2979:213-223"
 *
 * @param publicationInfo 出版信息字符串
 * @returns 日期字符串（ISO 格式：YYYY-MM-DD）或 undefined
 */
export function extractPublicationDate(publicationInfo: string | undefined | null): string | undefined {
  if (!publicationInfo) return undefined;

  // 匹配 MM/DD/YYYY 格式
  const datePattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})/;
  const match = publicationInfo.match(datePattern);

  if (match) {
    const month = match[1].padStart(2, '0');
    const day = match[2].padStart(2, '0');
    const year = match[3];

    // 验证日期有效性
    const yearNum = parseInt(year);
    if (yearNum >= 1900 && yearNum <= new Date().getFullYear() + 5) {
      return `${year}-${month}-${day}`;
    }
  }

  return undefined;
}

/**
 * 从 EBSCO 的 Subject 字段中提取关键词
 * 示例输入：
 * "<searchLink>Sensor kinase</searchLink><br /><searchLink>Atomistic molecular dynamics simulation</searchLink>"
 *
 * @param subjectHtml EBSCO 返回的 Subject 字段（包含 HTML）
 * @returns 关键词数组
 */
export function extractEbscoKeywords(subjectHtml: string | undefined | null): string[] {
  if (!subjectHtml) return [];

  // 提取 <searchLink> 标签中的内容
  const keywordPattern = /<searchLink[^>]*>([^<]+)<\/searchLink>/g;
  const keywords: string[] = [];
  let match;

  while ((match = keywordPattern.exec(subjectHtml)) !== null) {
    const keyword = stripHtmlTags(match[1]).trim();
    if (keyword) {
      keywords.push(keyword);
    }
  }

  // 如果没有匹配到，尝试直接清理标签
  if (keywords.length === 0) {
    const cleanText = stripHtmlTags(subjectHtml);
    return cleanText
      .split(/[;,\n]/) // 按分号、逗号或换行分割
      .map(kw => kw.trim())
      .filter(kw => kw.length > 0);
  }

  return keywords;
}

/**
 * 从 EBSCO 的 _raw_items 中提取特定字段的值
 * @param rawItems _raw_items 数组
 * @param fieldName 字段名称（如 "Title", "Author", "Subject"）
 * @returns 字段值（已清理 HTML）
 */
export function getEbscoItemValue(
  rawItems: any[] | undefined,
  fieldName: string
): string {
  if (!rawItems || !Array.isArray(rawItems)) return "";

  const item = rawItems.find((item: any) => item.Name === fieldName);
  return stripHtmlTags(item?.Data);
}

/**
 * 从 EBSCO Items 中提取 DOI
 * @param items Items 数组
 * @returns DOI 字符串或空字符串
 */
export function extractDOI(items: any[] | undefined): string {
  if (!items || !Array.isArray(items)) return "";

  const doiItem = items.find((item: any) => item.Name === "DOI");
  if (!doiItem?.Data) return "";

  // 清理 HTML 标签后提取 DOI
  const cleanDOI = stripHtmlTags(doiItem.Data);

  // 匹配常见 DOI 格式
  const doiMatch = cleanDOI.match(/10\.\d{4,}\/[^\s]+/);
  return doiMatch ? doiMatch[0] : cleanDOI;
}

/**
 * 从 EBSCO Items 中提取引用数
 *
 * 重要说明：EBSCO Discovery Service API 不提供引用数（citation count）字段。
 * 根据官方 API 文档（API Reference Guide: Sample Responses），Items 数组仅包含：
 * Title, Author, TitleSource, Subject, SubjectGeographic, Abstract, TypeDocument,
 * SubjectCompany, FullTextWordCount, ISSN, AN, PublisherInfo, SubjectBISAC 等字段。
 *
 * 此函数保留作为接口兼容，但始终返回 0。
 * 如需引用数数据，建议从其他数据源获取（如 Semantic Scholar、OpenCitations 等）。
 *
 * @param _items Items 数组（未使用，保留参数以维持接口兼容性）
 * @returns 始终返回 0，因为 EBSCO API 不提供此数据
 */
export function extractCitationCount(_items: any[] | undefined): number {
  // EBSCO Discovery Service API 不提供引用数字段
  // 此函数保留作为接口兼容，始终返回 0
  return 0;
}
