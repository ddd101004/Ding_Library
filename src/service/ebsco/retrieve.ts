/**
 * EBSCO详情获取服务
 *
 * 获取单篇论文的完整详细信息
 * 包括全文、完整元数据等
 */

import logger from '@/helper/logger';
import { ebscoGet } from './ebscoClient';
import { normalizeRecord } from './xmlParser';
import type { RetrieveRequest, RetrieveResponse } from './types';

/**
 * 获取论文详情
 * @param dbid 数据库ID
 * @param an 访问号(Accession Number)
 * @param highlight 是否高亮搜索词
 */
export async function retrieve(
  dbid: string,
  an: string,
  highlight: boolean = true
): Promise<RetrieveResponse> {
  logger.info('开始获取EBSCO论文详情', { dbid, an, highlight });

  // 使用统一客户端发送请求
  const response = await ebscoGet<any>(
    '/edsapi/rest/retrieve',
    {
      dbid,
      an,
      highlight: highlight ? 'y' : 'n',
    },
    { operationName: 'retrieve' }
  );

  // EBSCO 返回的 XML 解析后是 { RetrieveResponseMessage: { Record: {...} } }
  // 提取 Record
  const rawRecord = response.data.RetrieveResponseMessage?.Record || response.data.Record;

  if (!rawRecord) {
    logger.error('EBSCO响应缺少Record', {
      topLevelKeys: Object.keys(response.data),
      rawData: JSON.stringify(response.data).substring(0, 500)
    });
    throw new Error('EBSCO响应格式错误: 缺少Record');
  }

  // 规范化记录的 Items 结构
  const record = normalizeRecord(rawRecord);

  logger.info('获取EBSCO论文详情成功', {
    dbid,
    an,
    hasFullText: !!record.FullText,
    itemCount: record.Items?.length || 0,
    responseTime: `${response.responseTime}ms`,
  });

  // 返回标准化的 RetrieveResponse 格式
  return { Record: record };
}

/**
 * 批量获取论文详情
 * @param records 论文记录数组，包含dbid和an
 * @param highlight 是否高亮
 */
export async function batchRetrieve(
  records: Array<{ dbid: string; an: string }>,
  highlight: boolean = true
): Promise<RetrieveResponse[]> {
  logger.info('开始批量获取EBSCO论文详情', { count: records.length });

  // 并发获取所有详情（ebscoClient 会自动处理 token）
  const promises = records.map((record) =>
    retrieve(record.dbid, record.an, highlight)
  );

  const results = await Promise.allSettled(promises);

  // 统计成功和失败数量
  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  logger.info('批量获取EBSCO论文详情完成', {
    total: records.length,
    successful,
    failed,
  });

  // 返回成功的结果
  return results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => (r as PromiseFulfilledResult<RetrieveResponse>).value);
}

/**
 * 获取论文全文
 * 只返回全文内容部分
 * @param dbid 数据库ID
 * @param an 访问号
 */
export async function retrieveFullText(
  dbid: string,
  an: string
): Promise<string | null> {
  try {
    const data = await retrieve(dbid, an, false);

    // 提取全文内容
    const fullText = data.Record?.FullText?.Text?.Value;

    if (!fullText) {
      logger.warn('论文无全文内容', { dbid, an });
      return null;
    }

    logger.info('成功获取论文全文', {
      dbid,
      an,
      textLength: fullText.length,
    });

    return fullText;
  } catch (error: any) {
    logger.error('获取论文全文异常', {
      error: error.message,
      dbid,
      an,
    });
    throw error;
  }
}

/**
 * 检查论文是否有全文
 * @param dbid 数据库ID
 * @param an 访问号
 */
export async function hasFullText(
  dbid: string,
  an: string
): Promise<boolean> {
  try {
    const data = await retrieve(dbid, an, false);
    return data.Record?.FullText?.Text?.Availability === 1;
  } catch (error: any) {
    logger.error('检查论文全文可用性异常', {
      error: error.message,
      dbid,
      an,
    });
    return false;
  }
}
