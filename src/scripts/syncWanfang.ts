/**
 * 定时同步万方论文数据脚本（通用）
 */

import logger from "@/helper/logger";
import { searchWanfangPapers } from "@/service/wanfang/paper";
import { batchUpsertWanfangPapers } from "@/db/wanfang/paper";
import {
  syncPaperToDataset,
  isPublicDatasetConfigured,
} from "@/service/fastgpt/publicDataset";
import prisma from "@/utils/prismaProxy";

interface SyncWanfangPapersOptions {
  syncType: "wanfang_papers" | "wanfang_en_papers";
  keyword: string;
  filters?: { field: string; value: string }[];
  sourceLabel: string;
}

export async function syncWanfangPapers(options: SyncWanfangPapersOptions) {
  const { syncType, keyword, filters, sourceLabel } = options;
  const batchNo = new Date()
    .toISOString()
    .replace(/[:-]/g, "")
    .replace(/\..+/, "");
  const startTime = new Date();

  logger.info(
    `========== 开始同步万方${syncType.includes("en") ? "外文" : "中文"}论文数据 ==========`,
    { batchNo },
  );

  const fastgptEnabled = isPublicDatasetConfigured();
  if (fastgptEnabled) {
    logger.info("FastGPT 公共数据集已配置，将同步论文元数据");
  } else {
    logger.warn("FastGPT 公共数据集未配置，跳过知识库同步");
  }

  const syncLog = await prisma.ebscoSyncLog.create({
    data: {
      sync_type: syncType,
      sync_batch_no: batchNo,
      status: 3,
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

  const dailyCount = 100;
  const resultsPerPage = 20;

  try {
    logger.info("同步配置", {
      dailyCount,
      keyword,
      source: sourceLabel,
    });

    await prisma.ebscoSyncLog.update({
      where: { id: syncLog.id },
      data: {
        target_count: dailyCount,
        search_query: keyword,
      },
    });

    const totalPages = Math.ceil(dailyCount / resultsPerPage);

    for (let page = 1; page <= totalPages; page++) {
      try {
        logger.info(
          `正在搜索万方${syncType.includes("en") ? "外文" : "中文"}论文第 ${page}/${totalPages} 页`,
          {
            page,
            totalPages,
          },
        );

        const wanfangResults = await searchWanfangPapers({
          keyword,
          page,
          size: resultsPerPage,
          filters,
        });

        if (!wanfangResults || wanfangResults.length === 0) {
          logger.warn("搜索结果为空", { page });
          continue;
        }

        logger.info(`获取到 ${wanfangResults.length} 条记录`, {
          page,
          count: wanfangResults.length,
        });

        await batchUpsertWanfangPapers(wanfangResults);

        for (const paper of wanfangResults) {
          totalCount++;

          try {
            logger.info(`处理论文 ${totalCount}/${dailyCount}`, {
              paperId: paper.id,
              title: paper.title,
            });

            const dbPaper = await prisma.paper.findUnique({
              where: {
                source_source_id: {
                  source: "wanfang",
                  source_id: paper.id,
                },
              },
            });

            if (!dbPaper) {
              logger.warn("数据库中未找到论文", { paperId: paper.id });
              skipCount++;
              detailLogs.push({
                index: totalCount,
                paperId: paper.id,
                title: paper.title,
                status: "skipped",
                reason: "数据库中未找到",
              });
              continue;
            }

            successCount++;

            let fastgptStatus = "skipped";
            let fastgptCollectionId: string | undefined;
            if (fastgptEnabled) {
              try {
                const syncResult = await syncPaperToDataset(
                  dbPaper,
                  "cron_task",
                );
                if (syncResult.success) {
                  fastgptSuccessCount++;
                  fastgptStatus = "success";
                  fastgptCollectionId = syncResult.collectionId;
                } else {
                  fastgptFailCount++;
                  fastgptStatus = "failed";
                  logger.warn("FastGPT 同步失败", {
                    paperId: dbPaper.id,
                    error: syncResult.error,
                  });
                }
              } catch (fastgptError: unknown) {
                fastgptFailCount++;
                fastgptStatus = "error";
                const errorMsg =
                  fastgptError instanceof Error
                    ? fastgptError.message
                    : String(fastgptError);
                logger.error("FastGPT 同步异常", {
                  paperId: dbPaper.id,
                  error: errorMsg,
                });
              }
            }

            detailLogs.push({
              index: totalCount,
              paperId: paper.id,
              title: paper.title,
              dbId: dbPaper.id,
              status: "success",
              fastgptStatus,
              fastgptCollectionId,
            });

            logger.info(`保存成功`, {
              paperId: dbPaper.id,
              title: paper.title,
              fastgptStatus,
            });

            if (totalCount >= dailyCount) {
              logger.info("已达到目标同步数量", { totalCount, dailyCount });
              break;
            }

            await sleep(500);
          } catch (error: any) {
            logger.error(`处理单条记录异常`, {
              error: error.message,
              paperId: paper.id,
            });
            failCount++;
            detailLogs.push({
              index: totalCount,
              paperId: paper.id,
              status: "error",
              error: error.message,
            });
          }
        }

        if (totalCount >= dailyCount) {
          break;
        }
      } catch (error: any) {
        logger.error(`搜索第 ${page} 页异常`, { error: error.message, page });
        failCount += resultsPerPage;
      }
    }

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

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

    const wanfangStats = await prisma.paper.groupBy({
      by: ["language"],
      where: {
        source: "wanfang",
      },
      _count: true,
    });

    logger.info("========== 同步完成 ==========", {
      batchNo,
      source: sourceLabel,
      totalCount,
      successCount,
      failCount,
      skipCount,
      fastgptSuccessCount,
      fastgptFailCount,
      duration: `${duration}秒`,
      status:
        finalStatus === 1 ? "成功" : finalStatus === 2 ? "部分成功" : "失败",
      databaseStats: wanfangStats,
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
    logger.error("同步任务异常", { error: error.message, stack: error.stack });

    const endTime = new Date();
    const duration = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

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

export async function syncWanfangZhPapers() {
  return syncWanfangPapers({
    syncType: "wanfang_papers",
    keyword: "人工智能",
    sourceLabel: "wanfang (中文)",
  });
}

export async function syncWanfangEnPapers() {
  return syncWanfangPapers({
    syncType: "wanfang_en_papers",
    keyword: "AI",
    filters: [{ field: "SourceDB", value: "NSTL" }],
    sourceLabel: "wanfang_en (NSTL)",
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  syncWanfangZhPapers()
    .then((result) => {
      console.log("同步结果:", result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error("同步失败:", error);
      process.exit(1);
    });
}
