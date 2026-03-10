/**
 * 定时同步论文数据脚本
 *
 * 功能：
 * 1. 从EBSCO API搜索并获取论文数据
 * 2. 批量保存到本地数据库
 * 3. 同步论文元数据到FastGPT公共知识库
 * 4. 记录同步日志
 * 5. 支持配置化（同步数量、搜索条件）
 */

import logger from '@/helper/logger';
import { search, retrieve } from '@/service/ebsco';
import { upsertPaper, getPapersStatistics } from '@/db/paper';
import { getConfigValue } from '@/db/ebscoConfig';
import { syncPaperToDataset, isPublicDatasetConfigured } from '@/service/fastgpt/publicDataset';
import prisma from '@/utils/prismaProxy';
import { Prisma } from '@prisma/client';

/**
 * 执行同步任务
 */
export async function syncPapers() {
  const batchNo = new Date().toISOString().replace(/[:-]/g, '').replace(/\..+/, '');
  const startTime = new Date();

  logger.info('========== 开始同步论文数据 ==========', { batchNo });

  // 检查 FastGPT 公共数据集是否配置
  const fastgptEnabled = isPublicDatasetConfigured();
  if (fastgptEnabled) {
    logger.info('FastGPT 公共数据集已配置，将同步论文元数据');
  } else {
    logger.warn('FastGPT 公共数据集未配置，跳过知识库同步');
  }

  // 创建同步日志
  const syncLog = await prisma.ebscoSyncLog.create({
    data: {
      sync_type: 'papers',
      sync_batch_no: batchNo,
      status: 3, // 进行中
      start_time: startTime,
    },
  });

  let totalCount = 0;
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  let fastgptSuccessCount = 0;
  let fastgptFailCount = 0;
  const detailLogs: unknown[] = [];

  try {
    // 读取配置
    const dailyCount = await getConfigValue<number>('ebsco.sync.daily_count', 100);
    const defaultQuery = await getConfigValue<string>('ebsco.sync.default_query', '*');
    const searchLimiters = await getConfigValue<any>('ebsco.search.limiters', { FT: 'y' });
    const searchExpanders = await getConfigValue<any>('ebsco.search.expanders', [
      'fulltext',
    ]);

    logger.info('同步配置', {
      dailyCount,
      defaultQuery,
      limiters: searchLimiters,
      expanders: searchExpanders,
    });

    // 更新日志：添加目标数量和查询条件
    await prisma.ebscoSyncLog.update({
      where: { id: syncLog.id },
      data: {
        target_count: dailyCount,
        search_query: defaultQuery,
      },
    });

    // 执行搜索
    const resultsPerPage = 20;
    const totalPages = Math.ceil(dailyCount / resultsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      try {
        logger.info(`正在搜索第 ${page}/${totalPages} 页`, { page, totalPages });

        const searchResult = await search({
          query: defaultQuery,
          page,
          resultsPerPage,
          view: 'brief',
          limiters: searchLimiters,
          expanders: searchExpanders,
          includeFacets: false,
        });

        if (!searchResult?.SearchResult?.Data?.Records) {
          logger.warn('搜索结果为空', { page });
          continue;
        }

        const records = searchResult.SearchResult.Data.Records;
        logger.info(`获取到 ${records.length} 条记录`, { page, count: records.length });

        // 处理每条记录
        for (const record of records) {
          totalCount++;

          try {
            const dbId = record.Header.DbId;
            const an = record.Header.An;

            logger.info(`处理论文 ${totalCount}/${dailyCount}`, { dbId, an });

            // 获取完整详情
            const detailResult = await retrieve(dbId, an, false);

            if (!detailResult?.Record) {
              logger.warn('获取详情失败', { dbId, an });
              failCount++;
              detailLogs.push({
                index: totalCount,
                dbId,
                an,
                status: 'failed',
                reason: '获取详情失败',
              });
              continue;
            }

            // 转换数据格式
            const paperData = transformToPaperData(detailResult.Record);

            // Upsert到数据库
            const paper = await upsertPaper(dbId, an, paperData);

            if (paper) {
              successCount++;

              // 同步到 FastGPT 公共数据集
              let fastgptStatus = 'skipped';
              let fastgptCollectionId: string | undefined;
              if (fastgptEnabled) {
                try {
                  const syncResult = await syncPaperToDataset(paper, "cron_task");
                  if (syncResult.success) {
                    fastgptSuccessCount++;
                    fastgptStatus = 'success';
                    fastgptCollectionId = syncResult.collectionId;
                  } else {
                    fastgptFailCount++;
                    fastgptStatus = 'failed';
                    logger.warn('FastGPT 同步失败', {
                      paperId: paper.id,
                      error: syncResult.error
                    });
                  }
                } catch (fastgptError: unknown) {
                  fastgptFailCount++;
                  fastgptStatus = 'error';
                  const errorMsg = fastgptError instanceof Error ? fastgptError.message : String(fastgptError);
                  logger.error('FastGPT 同步异常', {
                    paperId: paper.id,
                    error: errorMsg
                  });
                }
              }

              detailLogs.push({
                index: totalCount,
                dbId,
                an,
                title: paperData.title,
                status: 'success',
                fastgptStatus,
                fastgptCollectionId,
              });
              logger.info(`保存成功`, { paperId: paper.id, title: paper.title, fastgptStatus });
            } else {
              failCount++;
              detailLogs.push({
                index: totalCount,
                dbId,
                an,
                status: 'failed',
                reason: '数据库保存失败',
              });
            }

            // 达到目标数量后停止
            if (totalCount >= dailyCount) {
              logger.info('已达到目标同步数量', { totalCount, dailyCount });
              break;
            }

            // 添加延迟，避免请求过快
            await sleep(1000);
          } catch (error: any) {
            logger.error(`处理单条记录异常`, {
              error: error.message,
              dbId: record.Header?.DbId,
              an: record.Header?.An,
            });
            failCount++;
            detailLogs.push({
              index: totalCount,
              status: 'error',
              error: error.message,
            });
          }
        }

        // 达到目标数量后停止
        if (totalCount >= dailyCount) {
          break;
        }
      } catch (error: any) {
        logger.error(`搜索第 ${page} 页异常`, { error: error.message, page });
        failCount += resultsPerPage;
      }
    }

    // 同步完成
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    const finalStatus = failCount === 0 ? 1 : failCount < totalCount ? 2 : 0;

    await prisma.ebscoSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: finalStatus,
        total_count: totalCount,
        success_count: successCount,
        fail_count: failCount,
        skip_count: skipCount,
        end_time: endTime,
        duration_seconds: duration,
        detail_log: JSON.stringify(detailLogs),
      },
    });

    // 获取统计信息
    const stats = await getPapersStatistics();

    logger.info('========== 同步完成 ==========', {
      batchNo,
      totalCount,
      successCount,
      failCount,
      skipCount,
      fastgptSuccessCount,
      fastgptFailCount,
      duration: `${duration}秒`,
      status: finalStatus === 1 ? '成功' : finalStatus === 2 ? '部分成功' : '失败',
      databaseStats: stats,
    });

    return {
      success: true,
      batchNo,
      totalCount,
      successCount,
      failCount,
      skipCount,
      fastgptSuccessCount,
      fastgptFailCount,
      duration,
    };
  } catch (error: any) {
    logger.error('同步任务异常', { error: error.message, stack: error.stack });

    // 更新日志为失败
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

    await prisma.ebscoSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 0,
        total_count: totalCount,
        success_count: successCount,
        fail_count: failCount,
        skip_count: skipCount,
        end_time: endTime,
        duration_seconds: duration,
        error_message: error.message,
        detail_log: JSON.stringify(detailLogs),
      },
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 将EBSCO记录转换为Paper数据格式
 */
function transformToPaperData(record: any): Prisma.PaperCreateInput {
  // 辅助函数：获取Item数据
  const getItemData = (label: string) =>
    record.Items?.find((item: any) => item.Label === label)?.Data || '';

  const getItemsByGroup = (group: string) =>
    record.Items?.filter((item: any) => item.Group === group).map((item: any) => item.Data) ||
    [];

  // 提取作者
  const authors = getItemsByGroup('Au');

  // 提取主题词
  const subjects = getItemsByGroup('Su');

  // 提取出版日期
  let publicationDate = null;
  let publicationYear = null;
  if (record.RecordInfo?.BibRecord?.BibEntity?.Dates) {
    const dates = record.RecordInfo.BibRecord.BibEntity.Dates;
    if (dates.length > 0) {
      const date = dates[0];
      if (date.Y) {
        publicationYear = parseInt(date.Y);
        const month = date.M ? String(date.M).padStart(2, '0') : '01';
        const day = date.D ? String(date.D).padStart(2, '0') : '01';
        publicationDate = new Date(`${date.Y}-${month}-${day}`);
      }
    }
  }

  return {
    source: 'ebsco', // 数据来源
    source_id: `${record.Header.DbId}:${record.Header.An}`, // 来源系统ID
    db_id: record.Header.DbId,
    an: record.Header.An,
    title: getItemData('Title') || 'Untitled',
    title_full: getItemData('Title') || undefined,
    authors: authors.length > 0 ? authors : undefined,
    publication_name: getItemData('Source') || undefined,
    publication_type: record.Header.PubType || undefined,
    publication_date: publicationDate || undefined,
    publication_year: publicationYear || undefined,
    abstract: getItemsByGroup('Ab').join('\n') || undefined,
    subjects: subjects.length > 0 ? JSON.stringify(subjects) : undefined,
    language: getItemData('Language') || undefined,
    document_type: getItemData('Document Type') || undefined,
    issn: getItemData('ISSN') || undefined,
    doi: getItemData('DOI') || undefined,
    has_fulltext: record.FullText?.Text?.Availability === 1,
    fulltext_availability: record.FullText?.Text?.Availability || undefined,
    fulltext_link: record.FullText?.Links?.[0]?.Url || undefined,
    pdf_link: record.FullText?.Links?.find((link: any) => link.Type === 'pdflink')?.Url || undefined,
    plink: record.PLink || undefined,
    custom_links: record.CustomLinks ? JSON.stringify(record.CustomLinks) : undefined,
    relevancy_score: record.Header.RelevancyScore || undefined,
    record_info: JSON.stringify(record.RecordInfo || {}),
    items: JSON.stringify(record.Items || []),
  };
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 如果直接运行此脚本
if (require.main === module) {
  syncPapers()
    .then((result) => {
      console.log('同步结果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('同步失败:', error);
      process.exit(1);
    });
}
