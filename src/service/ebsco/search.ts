/**
 * EBSCO搜索服务
 *
 * 处理EBSCO API的搜索功能
 * 支持关键词搜索、高级搜索、分面过滤等
 */

import logger from '@/helper/logger';
import { ebscoGet } from './ebscoClient';
import { normalizeSearchResult, normalizeRecord, normalizeFacet } from './xmlParser';
import type { SearchRequest, SearchResponse } from './types';

/**
 * 执行搜索
 * @param params 搜索参数
 */
export async function search(params: SearchRequest): Promise<SearchResponse> {
  // 构建查询参数
  const queryParams = buildSearchParams(params);

  logger.info('开始EBSCO搜索', {
    query: params.query,
    page: params.page,
    resultsPerPage: params.resultsPerPage,
  });

  // 使用统一客户端发送请求
  const response = await ebscoGet<any>(
    '/edsapi/rest/search',
    queryParams,
    { operationName: 'search' }
  );

  // EBSCO 返回的 XML 解析后是 { SearchResponseMessageGet: { SearchResult: {...} } }
  // 提取 SearchResult
  const rawSearchResult = response.data.SearchResponseMessageGet?.SearchResult || response.data.SearchResult;

  if (!rawSearchResult) {
    logger.error('EBSCO响应缺少SearchResult', {
      topLevelKeys: Object.keys(response.data),
      rawData: JSON.stringify(response.data).substring(0, 500)
    });
    throw new Error('EBSCO响应格式错误: 缺少SearchResult');
  }

  // 规范化数据结构（处理 xml2js 的嵌套数组问题）
  const searchResult = normalizeSearchResult(rawSearchResult);

  // 规范化每条记录的 Items 字段
  if (searchResult.Data?.Records) {
    searchResult.Data.Records = searchResult.Data.Records.map((record: any) => normalizeRecord(record));
  }

  // 规范化分面数据
  if (searchResult.AvailableFacets) {
    searchResult.AvailableFacets = searchResult.AvailableFacets.map((facet: any) => normalizeFacet(facet));
  }

  logger.info('EBSCO搜索成功', {
    query: params.query,
    totalHits: searchResult.Statistics?.TotalHits || 0,
    recordCount: searchResult.Data?.Records?.length || 0,
    responseTime: `${response.responseTime}ms`,
  });

  // 返回标准化的 SearchResponse 格式
  return { SearchResult: searchResult };
}

/**
 * 构建搜索查询参数
 * @param params 搜索参数
 */
function buildSearchParams(params: SearchRequest): Record<string, string | number> {
  const queryParams: Record<string, string | number> = {};

  // 查询关键词
  // 注意: EBSCO API 参数名格式是 query-1, query-2 (带连字符)
  if (params.query) {
    const fieldCode = params.fieldCode || '';
    const query = fieldCode ? `${fieldCode}:${params.query}` : params.query;
    queryParams['query-1'] = `AND,${query}`;
  } else {
    // 默认搜索所有
    queryParams['query-1'] = 'AND,*';
  }

  // 分页参数
  queryParams.pagenumber = params.page !== undefined ? params.page : 1;
  queryParams.resultsperpage = params.resultsPerPage !== undefined ? params.resultsPerPage : 20;

  // 排序
  queryParams.sort = params.sort || 'relevance';

  // 视图模式
  queryParams.view = params.view || 'brief';

  // 搜索模式
  queryParams.searchmode = params.searchMode || 'all';

  // 高亮
  queryParams.highlight = params.highlight !== undefined ? (params.highlight ? 'y' : 'n') : 'y';

  // 是否包含分面
  queryParams.includefacets = params.includeFacets !== undefined ? (params.includeFacets ? 'y' : 'n') : 'y';

  // 注意：limiters, expanders, facetFilters 等数组参数暂不支持
  // 需要使用 advancedSearch 或直接调用 ebscoClient

  return queryParams;
}

/**
 * 简单搜索
 * 简化版的搜索接口，只需提供关键词
 * @param query 搜索关键词
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function simpleSearch(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return search({
    query,
    page,
    resultsPerPage: pageSize,
    view: 'brief',
    includeFacets: true,
    highlight: true,
  });
}

/**
 * 搜索全文论文
 * 只返回有全文的结果
 * @param query 搜索关键词
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function searchFullText(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return search({
    query,
    page,
    resultsPerPage: pageSize,
    view: 'detailed',
    includeFacets: true,
    highlight: true,
    limiters: {
      FT: 'y', // 只返回全文
    },
    expanders: ['fulltext'], // 扩展全文搜索
  });
}

/**
 * 搜索同行评审论文
 * 只返回经过同行评审的学术论文
 * @param query 搜索关键词
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function searchPeerReviewed(
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return search({
    query,
    page,
    resultsPerPage: pageSize,
    view: 'brief',
    includeFacets: true,
    highlight: true,
    limiters: {
      RV: 'y', // 同行评审
    },
  });
}

/**
 * 按作者搜索
 * @param author 作者名
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function searchByAuthor(
  author: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return search({
    query: author,
    fieldCode: 'AU', // 作者字段
    page,
    resultsPerPage: pageSize,
    view: 'brief',
    includeFacets: true,
  });
}

/**
 * 按标题搜索
 * @param title 标题
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function searchByTitle(
  title: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return search({
    query: title,
    fieldCode: 'TI', // 标题字段
    page,
    resultsPerPage: pageSize,
    view: 'brief',
    includeFacets: true,
  });
}

/**
 * 按主题搜索
 * @param subject 主题
 * @param page 页码
 * @param pageSize 每页数量
 */
export async function searchBySubject(
  subject: string,
  page: number = 1,
  pageSize: number = 20
): Promise<SearchResponse> {
  return search({
    query: subject,
    fieldCode: 'SU', // 主题字段
    page,
    resultsPerPage: pageSize,
    view: 'brief',
    includeFacets: true,
  });
}

/**
 * 高级搜索
 * 支持多个搜索条件的组合
 * @param queries 搜索条件数组，每个条件包含字段、关键词和布尔运算符
 * @param page 页码
 * @param pageSize 每页数量
 */
export interface AdvancedQuery {
  field?: string; // 字段代码
  term: string; // 搜索词
  operator?: 'AND' | 'OR' | 'NOT'; // 布尔运算符
}

export async function advancedSearch(
  queries: AdvancedQuery[],
  page: number = 1,
  pageSize: number = 20,
  limiters?: Record<string, string>,
  facetFilters?: any[]
): Promise<SearchResponse> {
  // 构建查询参数
  const queryParams: Record<string, string | number> = {
    pagenumber: page,
    resultsperpage: pageSize,
    view: 'detailed',
    includefacets: 'y',
    highlight: 'y',
  };

  // 添加多个查询条件
  // 注意: EBSCO API 参数名格式是 query-1, query-2 (带连字符)
  queries.forEach((q, index) => {
    const operator = q.operator || 'AND';
    const field = q.field ? `${q.field}:` : '';
    queryParams[`query-${index + 1}`] = `${operator},${field}${q.term}`;
  });

  logger.info('开始EBSCO高级搜索', { queryCount: queries.length });

  // 注意：limiters 和 facetFilters 为数组参数，当前简化实现不支持
  // 如需完整支持，请直接使用 ebscoClient 并手动构建 URLSearchParams

  const response = await ebscoGet<any>(
    '/edsapi/rest/search',
    queryParams,
    { operationName: 'advancedSearch' }
  );

  // 提取并规范化搜索结果
  const rawSearchResult = response.data.SearchResponseMessageGet?.SearchResult || response.data.SearchResult;

  if (!rawSearchResult) {
    throw new Error('EBSCO高级搜索响应格式错误: 缺少SearchResult');
  }

  // 规范化数据结构
  const searchResult = normalizeSearchResult(rawSearchResult);

  // 规范化每条记录的 Items 字段
  if (searchResult.Data?.Records) {
    searchResult.Data.Records = searchResult.Data.Records.map((record: any) => normalizeRecord(record));
  }

  // 规范化分面数据
  if (searchResult.AvailableFacets) {
    searchResult.AvailableFacets = searchResult.AvailableFacets.map((facet: any) => normalizeFacet(facet));
  }

  logger.info('EBSCO高级搜索成功', {
    totalHits: searchResult.Statistics?.TotalHits || 0,
    recordCount: searchResult.Data?.Records?.length || 0,
  });

  return { SearchResult: searchResult };
}
