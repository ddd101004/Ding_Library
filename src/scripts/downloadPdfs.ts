/**
 * 定时下载PDF文件脚本
 *
 * 功能：
 * 1. 查询未下载的论文（有全文但PDF未下载）
 * 2. 按配置的速率限制下载PDF
 * 3. 上传到腾讯云COS云端存储
 * 4. 更新数据库状态
 * 5. 记录下载日志
 */

import logger from '@/helper/logger';
import { findPapersWithoutPdf, markPdfDownloaded } from '@/db/paper';
import { getConfigValue } from '@/db/ebscoConfig';
import { uploadFile as uploadToCos } from '@/lib/cos/cosClient';
import prisma from '@/utils/prismaProxy';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import os from 'os';

/**
 * 执行PDF下载任务
 */
export async function downloadPdfs() {
  const batchNo = new Date().toISOString().replace(/[:-]/g, '').replace(/\..+/, '');
  const startTime = new Date();

  logger.info('========== 开始下载PDF文件 ==========', { batchNo });

  // 创建同步日志
  const syncLog = await prisma.ebscoSyncLog.create({
    data: {
      sync_type: 'pdfs',
      sync_batch_no: batchNo,
      status: 3, // 进行中
      start_time: startTime,
    },
  });

  let totalCount = 0;
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;
  const detailLogs: unknown[] = [];

  // 临时目录用于下载
  const tempDir = path.join(os.tmpdir(), 'lingang-library-pdfs');

  try {
    // 读取配置
    const dailyCount = await getConfigValue<number>('ebsco.download.daily_count', 100);
    const rateLimit = await getConfigValue<number>('ebsco.download.rate_limit', 5);
    // COS 存储路径前缀
    const cosPrefix = await getConfigValue<string>(
      'ebsco.download.cos_prefix',
      'ebsco-papers'
    );

    logger.info('下载配置', {
      dailyCount,
      rateLimit: `${rateLimit}秒/个`,
      cosPrefix,
      tempDir,
    });

    // 确保临时目录存在
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
      logger.info('创建临时目录', { path: tempDir });
    }

    // 更新日志
    await prisma.ebscoSyncLog.update({
      where: { id: syncLog.id },
      data: {
        target_count: dailyCount,
      },
    });

    // 查询未下载的论文
    const papers = await findPapersWithoutPdf(dailyCount);

    logger.info(`找到 ${papers.length} 篇待下载论文`, { count: papers.length });

    if (papers.length === 0) {
      logger.info('没有需要下载的PDF');

      await prisma.ebscoSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 1,
          total_count: 0,
          success_count: 0,
          fail_count: 0,
          skip_count: 0,
          end_time: new Date(),
          duration_seconds: 0,
        },
      });

      return {
        success: true,
        message: '没有需要下载的PDF',
        totalCount: 0,
        successCount: 0,
        failCount: 0,
      };
    }

    // 逐个下载
    for (const paper of papers) {
      totalCount++;

      try {
        logger.info(`下载PDF ${totalCount}/${papers.length}`, {
          paperId: paper.id,
          title: paper.title?.substring(0, 50),
        });

        // 检查是否有PDF链接
        if (!paper.pdf_link && !paper.fulltext_link) {
          logger.warn('论文没有可用的PDF链接', { paperId: paper.id });
          skipCount++;
          detailLogs.push({
            index: totalCount,
            paperId: paper.id,
            title: paper.title,
            status: 'skipped',
            reason: '没有可用的PDF链接',
          });
          continue;
        }

        const downloadUrl = paper.pdf_link || paper.fulltext_link;

        // 生成文件名（使用论文ID）
        const fileName = `${paper.id}.pdf`;
        const tempFilePath = path.join(tempDir, fileName);
        // COS 存储路径
        const cosKey = `${cosPrefix}/${fileName}`;

        // 下载文件到临时目录
        const fileSize = await downloadFile(downloadUrl!, tempFilePath);

        if (fileSize > 0) {
          // 上传到 COS
          const uploadSuccess = await uploadToCos(cosKey, tempFilePath);

          if (uploadSuccess) {
            // 更新数据库（存储 COS key 而不是本地路径）
            await markPdfDownloaded(paper.id, cosKey, BigInt(fileSize));

            successCount++;
            detailLogs.push({
              index: totalCount,
              paperId: paper.id,
              title: paper.title,
              fileSize,
              cosKey,
              status: 'success',
            });

            logger.info('PDF上传COS成功', {
              paperId: paper.id,
              fileName,
              cosKey,
              fileSize: `${(fileSize / 1024 / 1024).toFixed(2)} MB`,
            });

            // 删除临时文件
            try {
              fs.unlinkSync(tempFilePath);
            } catch (unlinkError) {
              logger.warn('删除临时文件失败', { tempFilePath, error: unlinkError });
            }
          } else {
            failCount++;
            detailLogs.push({
              index: totalCount,
              paperId: paper.id,
              title: paper.title,
              status: 'failed',
              reason: 'COS上传失败',
            });

            // 删除临时文件
            try {
              fs.unlinkSync(tempFilePath);
            } catch (unlinkError) {
              // 忽略
            }
          }
        } else {
          failCount++;
          detailLogs.push({
            index: totalCount,
            paperId: paper.id,
            title: paper.title,
            status: 'failed',
            reason: '下载失败或文件大小为0',
          });
        }

        // 速率限制：下载之间的延迟
        if (totalCount < papers.length) {
          logger.info(`等待 ${rateLimit} 秒...`);
          await sleep(rateLimit * 1000);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`下载PDF异常`, {
          error: errorMessage,
          paperId: paper.id,
        });
        failCount++;
        detailLogs.push({
          index: totalCount,
          paperId: paper.id,
          title: paper.title,
          status: 'error',
          error: errorMessage,
        });
      }
    }

    // 下载完成
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

    logger.info('========== PDF下载完成 ==========', {
      batchNo,
      totalCount,
      successCount,
      failCount,
      skipCount,
      duration: `${duration}秒`,
      averageTime: totalCount > 0 ? `${(duration / totalCount).toFixed(2)}秒/个` : 'N/A',
      status: finalStatus === 1 ? '成功' : finalStatus === 2 ? '部分成功' : '失败',
    });

    return {
      success: true,
      batchNo,
      totalCount,
      successCount,
      failCount,
      skipCount,
      duration,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('PDF下载任务异常', { error: errorMessage, stack: errorStack });

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
        error_message: errorMessage,
        detail_log: JSON.stringify(detailLogs),
      },
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * 下载文件
 * @param url 下载URL
 * @param filePath 保存路径
 * @returns 文件大小（字节）
 */
function downloadFile(url: string, filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const file = fs.createWriteStream(filePath);
    let fileSize = 0;

    const request = protocol.get(url, (response) => {
      // 处理重定向
      if (
        response.statusCode === 301 ||
        response.statusCode === 302 ||
        response.statusCode === 307 ||
        response.statusCode === 308
      ) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          logger.info('PDF链接重定向', { from: url, to: redirectUrl });
          // 递归下载重定向后的URL
          downloadFile(redirectUrl, filePath)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(filePath); // 删除失败的文件
        reject(new Error(`下载失败，状态码: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      response.on('data', (chunk) => {
        fileSize += chunk.length;
      });

      file.on('finish', () => {
        file.close();
        resolve(fileSize);
      });
    });

    request.on('error', (error) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath); // 删除失败的文件
      }
      reject(error);
    });

    file.on('error', (error) => {
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(error);
    });

    // 设置超时（5分钟）
    request.setTimeout(5 * 60 * 1000, () => {
      request.destroy();
      file.close();
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      reject(new Error('下载超时'));
    });
  });
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 如果直接运行此脚本
if (require.main === module) {
  downloadPdfs()
    .then((result) => {
      console.log('下载结果:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('下载失败:', error);
      process.exit(1);
    });
}
