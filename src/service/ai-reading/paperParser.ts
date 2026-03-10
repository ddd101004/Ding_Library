import fs from "fs";
import os from "os";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import logger from "@/helper/logger";
// pdf-parse v2 使用 ES6 类导出
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { downloadFile } from "@/lib/cos/cosClient";

// ==================== 工具函数 ====================

/** 提取错误消息 */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** 检查文件是否存在，不存在则返回错误结果 */
function checkFileExists(filePath: string): ParseResult | null {
  if (!fs.existsSync(filePath)) {
    return { success: false, error: "文件不存在" };
  }
  return null;
}

// ==================== 类型定义 ====================

/**
 * 解析结果
 */
export interface ParseResult {
  success: boolean;
  content?: string; // 解析后的文本内容
  page_count?: number; // 页数（PDF专用）
  word_count?: number; // 字数
  error?: string; // 错误信息
}

/**
 * PDF解析选项
 */
export interface PdfParseOptions {
  max_pages?: number; // 最大解析页数（0表示全部）
}

/**
 * Word解析选项
 */
export interface WordParseOptions {
  convert_image_to_text?: boolean; // 是否将图片转换为[图片]占位符
}

// ==================== PDF 解析 ====================

/**
 * 解析 PDF 文件
 *
 * @param filePath - PDF文件路径
 * @param options - 解析选项
 * @returns 解析结果
 */
export async function parsePDF(
  filePath: string,
  options: PdfParseOptions = {}
): Promise<ParseResult> {
  const notExists = checkFileExists(filePath);
  if (notExists) return notExists;

  try {
    const dataBuffer = fs.readFileSync(filePath);
    const uint8Array = new Uint8Array(dataBuffer);

    const parser = new PDFParse({ data: uint8Array });
    const info = await parser.getInfo();
    const textResult = await parser.getText({
      ...(options.max_pages && options.max_pages > 0 ? { last: options.max_pages } : {}),
    });

    const content = textResult.text.trim();
    const wordCount = content.length;

    logger.info("PDF解析成功", {
      filePath: path.basename(filePath),
      pageCount: info.total,
      wordCount,
    });

    return { success: true, content, page_count: info.total, word_count: wordCount };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error("PDF解析失败", { filePath: path.basename(filePath), error: errorMessage });
    return { success: false, error: `PDF解析失败: ${errorMessage}` };
  }
}

// ==================== Word 文档解析 ====================

/**
 * 解析 Word 文档 (.docx)
 *
 * @param filePath - Word文件路径
 * @param options - 解析选项
 * @returns 解析结果
 */
export async function parseWord(
  filePath: string,
  options: WordParseOptions = {}
): Promise<ParseResult> {
  const notExists = checkFileExists(filePath);
  if (notExists) return notExists;

  try {
    const result = await mammoth.extractRawText({ path: filePath });
    let content = result.value.trim();

    if (options.convert_image_to_text) {
      content = content.replace(/\[image:.*?\]/g, "[图片]");
    }

    const wordCount = content.length;

    if (result.messages.length > 0) {
      logger.warn("Word解析警告", {
        filePath: path.basename(filePath),
        warnings: result.messages.map((m) => m.message),
      });
    }

    logger.info("Word文档解析成功", { filePath: path.basename(filePath), wordCount });
    return { success: true, content, word_count: wordCount };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error("Word文档解析失败", { filePath: path.basename(filePath), error: errorMessage });
    return { success: false, error: `Word文档解析失败: ${errorMessage}` };
  }
}

// ==================== TXT 文本读取 ====================

/**
 * 读取 TXT 文本文件
 *
 * @param filePath - TXT文件路径
 * @param encoding - 文件编码（默认utf-8）
 * @returns 解析结果
 */
export async function parseTXT(
  filePath: string,
  encoding: BufferEncoding = "utf-8"
): Promise<ParseResult> {
  const notExists = checkFileExists(filePath);
  if (notExists) return notExists;

  try {
    const content = fs.readFileSync(filePath, encoding).trim();
    const wordCount = content.length;

    logger.info("TXT文本读取成功", { filePath: path.basename(filePath), wordCount });
    return { success: true, content, word_count: wordCount };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error("TXT文本读取失败", { filePath: path.basename(filePath), error: errorMessage });
    return { success: false, error: `TXT文本读取失败: ${errorMessage}` };
  }
}

// ==================== 统一解析接口 ====================

/**
 * 根据文件类型自动选择解析方法
 *
 * @param filePath - 文件路径
 * @param fileType - 文件类型（pdf/docx/txt）
 * @returns 解析结果
 */
export async function parseFile(
  filePath: string,
  fileType: string
): Promise<ParseResult> {
  const normalizedType = fileType.toLowerCase();

  logger.info("开始解析文件", {
    filePath: path.basename(filePath),
    fileType: normalizedType,
  });

  switch (normalizedType) {
    case "pdf":
      return await parsePDF(filePath);

    case "docx":
    case "doc":
      return await parseWord(filePath);

    case "txt":
      return await parseTXT(filePath);

    default:
      return {
        success: false,
        error: `不支持的文件类型: ${fileType}`,
      };
  }
}

// ==================== 辅助函数 ====================

/**
 * 根据文件路径获取文件类型
 *
 * @param filePath - 文件路径
 * @returns 文件类型（pdf/docx/txt）
 */
export function getFileType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace(".", "");
  return ext;
}

/**
 * 验证文件是否为支持的格式
 *
 * @param fileType - 文件类型
 * @returns 是否支持
 */
export function isSupportedFileType(fileType: string): boolean {
  const supportedTypes = ["pdf", "docx", "doc", "txt"];
  return supportedTypes.includes(fileType.toLowerCase());
}

/**
 * 提取论文摘要（从内容中）
 *
 * 尝试从论文内容中提取摘要部分
 * 通常摘要会出现在 "Abstract" 或 "摘要" 等关键词之后
 *
 * @param content - 论文全文
 * @returns 摘要内容（如果找到）
 */
export function extractAbstract(content: string): string | null {
  try {
    // 匹配英文摘要
    const abstractMatch = content.match(
      /Abstract[:\s]+(.*?)(?=\n\n|Introduction|Keywords|1\.|I\.|Ⅰ\.)/is
    );
    if (abstractMatch && abstractMatch[1]) {
      return abstractMatch[1].trim();
    }

    // 匹配中文摘要
    const zhAbstractMatch = content.match(
      /摘[\s\u3000]*要[:\s\u3000]+(.*?)(?=\n\n|关键词|引言|前言|第一章|一、)/is
    );
    if (zhAbstractMatch && zhAbstractMatch[1]) {
      return zhAbstractMatch[1].trim();
    }

    return null;
  } catch (error: unknown) {
    logger.warn("提取摘要失败", { error: getErrorMessage(error) });
    return null;
  }
}

/**
 * 提取关键词（从内容中）
 *
 * @param content - 论文全文
 * @returns 关键词数组
 */
export function extractKeywords(content: string): string[] | null {
  try {
    // 匹配英文关键词
    const keywordsMatch = content.match(
      /Keywords?[:\s]+(.*?)(?=\n\n|Introduction|1\.|I\.|Ⅰ\.)/is
    );
    if (keywordsMatch && keywordsMatch[1]) {
      const keywords = keywordsMatch[1]
        .split(/[,;，；]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      return keywords;
    }

    // 匹配中文关键词
    const zhKeywordsMatch = content.match(
      /关键词[:\s\u3000]+(.*?)(?=\n\n|引言|前言|第一章|一、)/is
    );
    if (zhKeywordsMatch && zhKeywordsMatch[1]) {
      const keywords = zhKeywordsMatch[1]
        .split(/[,;，；]/)
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      return keywords;
    }

    return null;
  } catch (error: unknown) {
    logger.warn("提取关键词失败", { error: getErrorMessage(error) });
    return null;
  }
}

/**
 * 清理文本内容
 *
 * 移除多余的空白字符、换行符等
 *
 * @param content - 原始文本
 * @returns 清理后的文本
 */
export function cleanContent(content: string): string {
  return (
    content
      // 移除多余的空行（保留段落分隔）
      .replace(/\n{3,}/g, "\n\n")
      // 移除行首行尾空白
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      // 移除多余的空格
      .replace(/ {2,}/g, " ")
      .trim()
  );
}

// ==================== 元数据提取 ====================

/**
 * 论文元数据
 */
export interface PaperMetadata {
  title: string | null;
  authors: string[] | null;
  abstract: string | null;
  keywords: string[] | null;
}

/**
 * 从文件名中提取论文元数据
 *
 * 支持的文件名格式：
 * - "标题_作者1__作者2.pdf"
 * - "标题_来源_作者1__作者2.pdf"
 * - "标题.pdf"
 *
 * @param fileName - 文件名（含扩展名）
 * @returns 提取的元数据
 */
export function extractMetadataFromFileName(fileName: string): {
  title: string | null;
  authors: string[] | null;
} {
  try {
    // 移除扩展名
    const baseName = fileName.replace(/\.[^/.]+$/, "");

    if (!baseName) {
      return { title: null, authors: null };
    }

    // 尝试按下划线分割
    const parts = baseName.split("_").filter((p) => p.trim());

    if (parts.length === 1) {
      // 只有标题
      return { title: parts[0].trim(), authors: null };
    }

    // 第一部分通常是标题
    const title = parts[0].trim();

    // 查找作者部分（通常在最后，可能用双下划线分隔多个作者）
    // 格式如: "标题_来源_作者1__作者2" 或 "标题_作者1__作者2"
    const lastPart = parts[parts.length - 1];

    // 如果最后部分包含双下划线，说明是多个作者
    let authors: string[] | null = null;

    // 检查是否有双下划线分隔的作者
    const doubleUnderscoreMatch = baseName.match(/__([^_]+(?:__[^_]+)*)/);
    if (doubleUnderscoreMatch) {
      // 提取所有作者（用双下划线分隔）
      const authorsStr = doubleUnderscoreMatch[0];
      authors = authorsStr
        .split("__")
        .filter((a) => a.trim())
        .map((a) => a.trim());
    } else if (parts.length >= 2) {
      // 没有双下划线，检查最后一个部分是否像是作者名
      // 中文名通常2-4个字，不包含特殊字符
      const possibleAuthor = lastPart.trim();
      if (/^[\u4e00-\u9fa5]{2,4}$/.test(possibleAuthor)) {
        authors = [possibleAuthor];
      }
    }

    return { title, authors };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn("从文件名提取元数据失败", { fileName, error: errorMessage });
    return { title: null, authors: null };
  }
}

/**
 * 从论文内容中提取作者
 *
 * 支持的格式：
 * - "文_作者名"
 * - "作者：xxx"
 * - "Author: xxx"
 *
 * @param content - 论文全文
 * @returns 作者数组
 */
export function extractAuthorsFromContent(content: string): string[] | null {
  try {
    // 只取前 2000 字符进行匹配（作者信息通常在开头）
    const header = content.substring(0, 2000);

    // 匹配 "文_作者名" 格式
    const zhAuthorMatch1 = header.match(/文[_\s]+([^\n\r]{2,20})/);
    if (zhAuthorMatch1 && zhAuthorMatch1[1]) {
      const authorStr = zhAuthorMatch1[1].trim();
      // 可能有多个作者，用空格或顿号分隔
      const authors = authorStr
        .split(/[、\s,，]+/)
        .filter((a) => a.length >= 2 && a.length <= 10);
      if (authors.length > 0) {
        return authors;
      }
    }

    // 匹配 "作者：xxx" 或 "作者:xxx" 格式
    const zhAuthorMatch2 = header.match(/作者[：:]\s*([^\n\r]{2,50})/);
    if (zhAuthorMatch2 && zhAuthorMatch2[1]) {
      const authorStr = zhAuthorMatch2[1].trim();
      const authors = authorStr
        .split(/[、,，\s]+/)
        .filter((a) => a.length >= 2 && a.length <= 20);
      if (authors.length > 0) {
        return authors;
      }
    }

    // 匹配英文 "Author(s): xxx" 格式
    const enAuthorMatch = header.match(/Authors?[:\s]+([^\n\r]{2,100})/i);
    if (enAuthorMatch && enAuthorMatch[1]) {
      const authorStr = enAuthorMatch[1].trim();
      const authors = authorStr
        .split(/[,;，；]+/)
        .map((a) => a.trim())
        .filter((a) => a.length >= 2 && a.length <= 50);
      if (authors.length > 0) {
        return authors;
      }
    }

    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn("从内容提取作者失败", { error: errorMessage });
    return null;
  }
}

/**
 * 从论文内容中提取标题
 *
 * 通常标题在文档开头的前几行
 *
 * @param content - 论文全文
 * @returns 标题
 */
export function extractTitleFromContent(content: string): string | null {
  try {
    // 只取前 1000 字符
    const header = content.substring(0, 1000);

    // 按行分割，过滤空行
    const lines = header
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 跳过页码、日期等短行，找到第一个像标题的行
    for (const line of lines) {
      // 跳过太短的行（可能是页码、日期）
      if (line.length < 5) continue;

      // 跳过纯数字行
      if (/^\d+$/.test(line)) continue;

      // 跳过日期格式
      if (/^\d{4}[\/\-年]\d{1,2}[\/\-月]/.test(line)) continue;

      // 跳过页码格式
      if (/^第?\d+页?$/.test(line)) continue;

      // 跳过制表符分隔的行（可能是排版信息）
      if ((line.match(/\t/g) || []).length > 3) continue;

      // 跳过 "Enterprise 企业" 等栏目标签
      if (/^[A-Za-z]+\s+[\u4e00-\u9fa5]{2,4}$/.test(line)) continue;

      // 找到合适的标题行
      if (line.length >= 5 && line.length <= 100) {
        return line;
      }
    }

    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn("从内容提取标题失败", { error: errorMessage });
    return null;
  }
}

/**
 * 综合提取论文元数据
 *
 * 优先从内容提取，如果失败则从文件名提取
 *
 * @param content - 论文全文（可为空）
 * @param fileName - 文件名
 * @returns 论文元数据
 */
export function extractPaperMetadata(
  content: string | null,
  fileName: string
): PaperMetadata {
  // 从文件名提取
  const fromFileName = extractMetadataFromFileName(fileName);

  // 从内容提取
  let fromContent: {
    title: string | null;
    authors: string[] | null;
    abstract: string | null;
    keywords: string[] | null;
  } = {
    title: null,
    authors: null,
    abstract: null,
    keywords: null,
  };

  if (content) {
    fromContent = {
      title: extractTitleFromContent(content),
      authors: extractAuthorsFromContent(content),
      abstract: extractAbstract(content),
      keywords: extractKeywords(content),
    };
  }

  // 合并结果：优先使用内容提取的结果，回退到文件名
  return {
    title: fromContent.title || fromFileName.title,
    authors:
      fromContent.authors && fromContent.authors.length > 0
        ? fromContent.authors
        : fromFileName.authors,
    abstract: fromContent.abstract,
    keywords: fromContent.keywords,
  };
}

// ==================== COS 文件解析 ====================

/**
 * 从 COS 下载文件并解析
 *
 * 下载到系统临时目录，解析完成后自动删除
 *
 * @param cosKey - COS 对象 key
 * @param fileType - 文件类型（pdf/docx/txt）
 * @returns 解析结果
 */
export async function parseFileFromCos(
  cosKey: string,
  fileType: string
): Promise<ParseResult> {
  const tempDir = os.tmpdir();
  const tempFileName = `paper_${uuidv4()}.${fileType}`;
  const tempFilePath = path.join(tempDir, tempFileName);

  logger.info("开始从 COS 下载文件进行解析", { cosKey, fileType, tempFilePath });

  try {
    const downloaded = await downloadFile(cosKey, tempFilePath);
    if (!downloaded) {
      return { success: false, error: "从 COS 下载文件失败" };
    }

    if (!fs.existsSync(tempFilePath)) {
      return { success: false, error: "下载的文件不存在" };
    }

    const result = await parseFile(tempFilePath, fileType);

    logger.info("COS 文件解析完成", {
      cosKey,
      success: result.success,
      pageCount: result.page_count,
      wordCount: result.word_count,
    });

    return result;
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error("从 COS 解析文件失败", { cosKey, fileType, error: errorMessage });
    return { success: false, error: `解析失败: ${errorMessage}` };
  } finally {
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
        logger.info("已清理临时文件", { tempFilePath });
      }
    } catch (cleanupError: unknown) {
      logger.warn("清理临时文件失败", { tempFilePath, error: getErrorMessage(cleanupError) });
    }
  }
}
