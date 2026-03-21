/**
 * 文件内容解析服务
 * 支持 docx, pdf, txt 等格式
 */

import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import prisma from '@/utils/prismaProxy';
import logger from '@/helper/logger';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

/**
 * 解析文件内容
 */
export async function parseFileContent(filePath: string, fileType: string): Promise<{
  success: boolean;
  content?: string;
  error?: string;
}> {
  try {
    const fullPath = join(UPLOAD_DIR, filePath);

    // 检查文件是否存在
    if (!existsSync(fullPath)) {
      // 如果在uploads目录找不到，尝试从public目录直接读取
      const publicPath = join(process.cwd(), 'public', filePath);
      if (!existsSync(publicPath)) {
        return {
          success: false,
          error: '文件不存在',
        };
      }
    }

    let content = '';

    // 根据文件类型选择解析方法
    switch (fileType.toLowerCase()) {
      case 'docx':
        content = await parseDocx(fullPath);
        break;

      case 'pdf':
        content = await parsePdf(fullPath);
        break;

      case 'txt':
        content = await parseTxt(fullPath);
        break;

      default:
        // 尝试按txt解析
        content = await parseTxt(fullPath);
        break;
    }

    return {
      success: true,
      content,
    };
  } catch (error: any) {
    logger.error('文件解析失败', { filePath, fileType, error: error.message });
    return {
      success: false,
      error: error.message || '文件解析失败',
    };
  }
}

/**
 * 解析 DOCX 文件
 */
async function parseDocx(filePath: string): Promise<string> {
  try {
    // mammoth 在 Node.js 环境中使用 path 参数
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value; // 提取纯文本
  } catch (error: any) {
    throw new Error(`DOCX解析失败: ${error.message}`);
  }
}

/**
 * 解析 PDF 文件（支持多页）
 */
async function parsePdf(filePath: string): Promise<string> {
  try {
    const dataBuffer = readFileSync(filePath);

    // 加载 PDF 文档
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(dataBuffer),
    });

    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    let fullText = '';

    // 遍历所有页面提取文本
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();

      // 提取并拼接文本项
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += pageText + '\n';
    }

    return fullText.trim();
  } catch (error: any) {
    throw new Error(`PDF解析失败: ${error.message}`);
  }
}

/**
 * 解析 TXT 文件
 */
async function parseTxt(filePath: string): Promise<string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content;
  } catch (error: any) {
    throw new Error(`TXT解析失败: ${error.message}`);
  }
}

/**
 * 更新论文解析状态
 */
export async function updatePaperParseStatus(
  paperId: string,
  status: 'parsing' | 'completed' | 'failed',
  content?: string,
  error?: string
) {
  try {
    const updateData: any = {
      parseStatus: status,
    };

    if (content !== undefined) {
      updateData.parsedContent = content;
    }

    if (error) {
      updateData.parseError = error;
    }

    const paper = await prisma.userUploadedPaper.update({
      where: { id: paperId },
      data: updateData,
    });

    logger.info('论文解析状态更新', {
      paperId,
      status,
      hasContent: !!content,
      contentLength: content?.length || 0,
    });

    return paper;
  } catch (error: any) {
    logger.error('更新论文解析状态失败', { paperId, error: error.message });
    throw error;
  }
}

/**
 * 触发文件解析（在后台执行）
 */
export async function triggerFileParsing(paperId: string) {
  try {
    // 先更新状态为解析中
    await updatePaperParseStatus(paperId, 'parsing');

    // 获取论文信息
    const paper = await prisma.userUploadedPaper.findUnique({
      where: { id: paperId },
      select: {
        filePath: true,
        fileType: true,
      },
    });

    if (!paper) {
      throw new Error('论文不存在');
    }

    // 解析文件内容
    const result = await parseFileContent(paper.filePath, paper.fileType);

    if (result.success && result.content) {
      // 解析成功，更新状态和内容
      await updatePaperParseStatus(paperId, 'completed', result.content);
      logger.info('文件解析成功', { paperId, contentLength: result.content.length });
    } else {
      // 解析失败，更新错误信息
      await updatePaperParseStatus(paperId, 'failed', undefined, result.error);
      logger.warn('文件解析失败', { paperId, error: result.error });
    }
  } catch (error: any) {
    logger.error('触发文件解析失败', { paperId, error: error.message });
    // 更新状态为失败
    await updatePaperParseStatus(paperId, 'failed', undefined, error.message);
  }
}
