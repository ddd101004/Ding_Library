/**
 * FastGPT 公共数据集同步服务
 * 用于将论文元数据同步到 FastGPT 公共知识库
 *
 * 重要说明：
 * - 使用 Dataset API (type: folder) 创建论文文件夹
 * - 使用 Collection API 在论文文件夹内创建元数据和全文
 */

import logger from "@/helper/logger";
import {
  createTextCollection,
  listCollections,
  createFileCollection,
} from "./collection";
import { createDataset, findDatasetByIntro } from "./dataset";
import prisma from "@/utils/prismaProxy";
import type { Paper } from "@prisma/client";
import fs from "fs";
import path from "path";
import os from "os";


/**
 * 从本地存储复制文件到目标路径
 * @param sourcePath 源文件路径（本地相对路径或完整 URL）
 * @param targetPath 目标文件路径
 * @returns 是否成功
 */
async function copyLocalFile(
  sourcePath: string,
  targetPath: string
): Promise<boolean> {
  try {
    // 判断是否为本地路径
    if (sourcePath.startsWith('papers/') || sourcePath.startsWith('avatars/') || sourcePath.startsWith('covers/')) {
      // 本地存储路径
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const fullSourcePath = path.join(uploadsDir, sourcePath);

      // 检查源文件是否存在
      if (!fs.existsSync(fullSourcePath)) {
        logger.error("[本地文件] 源文件不存在", { sourcePath: fullSourcePath });
        return false;
      }

      // 确保目标目录存在
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // 复制文件
      fs.copyFileSync(fullSourcePath, targetPath);
      return true;
    }

    // 如果是完整 URL（COS 或其他），尝试下载
    if (sourcePath.startsWith('http://') || sourcePath.startsWith('https://')) {
      // 注意：这里需要使用 fetch 或 axios 下载文件
      // 由于 COS 客户端已移除，暂不支持从 URL 下载
      logger.error("[本地文件] 不支持从 URL 下载文件", { sourcePath });
      return false;
    }

    // 旧的 COS 路径格式（无 https:// 前缀）
    logger.error("[本地文件] 不支持的 COS 路径格式", { sourcePath });
    return false;
  } catch (error) {
    logger.error("[本地文件] 复制文件失败", { sourcePath, targetPath, error });
    return false;
  }
}

// ==================== 配置与工具函数 ====================

const FASTGPT_PUBLIC_DATASET_ID = process.env.FASTGPT_PUBLIC_DATASET_ID || "";

/** 提取错误消息 */
const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** 延迟执行 */
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** 检查公共数据集 ID 是否配置 */
function checkDatasetId(): boolean {
  if (!FASTGPT_PUBLIC_DATASET_ID) {
    logger.warn("[FastGPT] FASTGPT_PUBLIC_DATASET_ID 未配置，跳过同步");
    return false;
  }
  return true;
}

/** 更新论文同步状态 */
async function updatePaperSyncStatus(
  paperId: string,
  data: {
    fastgpt_collection_id?: string;
    fastgpt_sync_source?: FastgptSyncSource;
    fastgpt_sync_time?: Date;
    fastgpt_has_fulltext?: boolean;
  }
): Promise<void> {
  await prisma.paper.update({ where: { id: paperId }, data });
}

/**
 * FastGPT 同步来源类型
 */
export type FastgptSyncSource = "cron_task" | "user_search" | "chat_related";

/**
 * 论文元数据格式化结果
 */
interface PaperMetadataText {
  /** 集合名称（论文标题） */
  name: string;
  /** 格式化后的文本内容 */
  text: string;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  collectionId?: string;
  error?: string;
}

/**
 * 批量同步结果
 */
export interface BatchSyncResult {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  details: Array<{
    paperId: string;
    title: string;
    status: "success" | "failed" | "skipped";
    collectionId?: string;
    error?: string;
  }>;
}

// ==================== 类型定义 ====================

/**
 * 生成论文文件夹名称
 * 仅使用论文标题，sourceId 存储在 intro 字段中用于搜索匹配
 *
 * @param paper 论文数据
 * @returns 文件夹名称
 */
function generatePaperFolderName(paper: Paper): string {
  return (paper.title || "未命名论文").substring(0, 100); // 限制标题长度
}

/**
 * 生成论文文件夹描述
 * 存储 sourceId，用于 searchText 精确搜索匹配
 *
 * @param paper 论文数据
 * @returns 文件夹描述（sourceId）
 */
function generatePaperFolderIntro(paper: Paper): string {
  return paper.source_id || paper.id;
}

/**
 * 在 FastGPT 中查找是否已存在该论文的文件夹
 * 通过 searchKey 搜索 intro 字段中的 sourceId 进行精确匹配
 *
 * 存储结构：
 * 公共数据集 (根目录)
 * └── 论文文件夹 (Dataset, type: folder, name: 论文标题, intro: sourceId)
 *     ├── 元数据 (Collection, type: text)
 *     └── 全文 (Collection, type: file)
 *
 * @param paper 论文数据
 * @returns 已存在的论文文件夹 ID，如果不存在则返回 null
 */
async function findExistingPaperFolder(paper: Paper): Promise<string | null> {
  const sourceId = paper.source_id || paper.id;

  // 使用 Dataset API 在公共数据集下搜索论文文件夹
  const folderId = await findDatasetByIntro(
    FASTGPT_PUBLIC_DATASET_ID,
    sourceId
  );

  if (folderId) {
    logger.info("[FastGPT] 找到已存在的论文文件夹", {
      paperId: paper.id,
      folderId,
      sourceId,
    });
  }

  return folderId;
}

/** 构建带标题的段落 */
function buildSection(title: string, items: string[]): string {
  return items.length > 0 ? `\n## ${title}\n${items.join("\n")}` : "";
}

/** 解析 subjects 字段 */
function parseSubjects(subjects: unknown): string {
  if (!subjects) return "";
  try {
    const parsed = typeof subjects === "string" ? JSON.parse(subjects) : subjects;
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.join("、") : String(subjects);
  } catch {
    return String(subjects);
  }
}

/** 将论文数据格式化为 FastGPT 知识库文本 */
function formatPaperToText(paper: Paper): PaperMetadataText {
  const parts: string[] = [];

  // 标题
  if (paper.title) {
    parts.push(`# ${paper.title}`);
    if (paper.title_full && paper.title_full !== paper.title) {
      parts.push(`完整标题：${paper.title_full}`);
    }
  }

  // 作者
  if (paper.authors) {
    const authors = Array.isArray(paper.authors) ? paper.authors.join(", ") : String(paper.authors);
    if (authors) parts.push(`\n## 作者\n${authors}`);
  }

  // 出版信息
  parts.push(buildSection("出版信息", [
    paper.publication_name && `期刊/出版物：${paper.publication_name}`,
    paper.publication_year && `出版年份：${paper.publication_year}`,
    paper.publication_date && `出版日期：${new Date(paper.publication_date).toLocaleDateString("zh-CN")}`,
    paper.publication_type && `出版类型：${paper.publication_type}`,
  ].filter((item): item is string => typeof item === "string")));

  // 摘要
  if (paper.abstract) parts.push(`\n## 摘要\n${paper.abstract}`);

  // 关键词
  const subjectsText = parseSubjects(paper.subjects);
  if (subjectsText) parts.push(`\n## 关键词\n${subjectsText}`);

  // 标识符
  parts.push(buildSection("标识符", [
    paper.doi && `DOI：${paper.doi}`,
    paper.issn && `ISSN：${paper.issn}`,
    paper.source_id && `来源ID：${paper.source_id}`,
  ].filter((item): item is string => typeof item === "string")));

  // 其他信息
  parts.push(buildSection("其他信息", [
    paper.language && `语言：${paper.language}`,
    paper.document_type && `文档类型：${paper.document_type}`,
    paper.source && `数据来源：${paper.source}`,
  ].filter((item): item is string => typeof item === "string")));

  return { name: paper.title || "未命名论文", text: parts.filter(Boolean).join("\n") };
}

/**
 * 同步单篇论文到 FastGPT 公共数据集
 *
 * 存储结构：
 * 公共数据集
 * └── 论文文件夹 (Dataset, type: folder)
 *     ├── 元数据 (Collection, type: text)
 *     └── 全文 (Collection, type: file) - 后续补充
 *
 * 包含两层去重机制：
 * 1. 数据库字段检查（fastgpt_collection_id）
 * 2. FastGPT 远程查询去重（findExistingPaperFolder）
 *
 * @param paper 论文数据
 * @param syncSource 同步来源（可选，传入时会更新 Paper 表的同步状态）
 * @returns 同步结果
 */
export async function syncPaperToDataset(
  paper: Paper,
  syncSource?: FastgptSyncSource
): Promise<SyncResult> {
  if (!checkDatasetId()) {
    return { success: false, error: "FASTGPT_PUBLIC_DATASET_ID 未配置" };
  }

  // 第1层去重：检查数据库字段（已同步的直接跳过）
  if (paper.fastgpt_collection_id) {
    logger.info("[FastGPT] 论文已同步（数据库记录），跳过", {
      paperId: paper.id,
      collectionId: paper.fastgpt_collection_id,
    });
    return {
      success: true,
      collectionId: paper.fastgpt_collection_id,
    };
  }

  try {
    // 第2层去重：使用 Dataset API 查询 FastGPT 是否已存在该论文的文件夹
    const existingFolderId = await findExistingPaperFolder(paper);
    if (existingFolderId) {
      logger.info("[FastGPT] 论文文件夹已存在于 FastGPT（远程查询），更新本地记录", {
        paperId: paper.id,
        folderId: existingFolderId,
      });

      if (syncSource) {
        await updatePaperSyncStatus(paper.id, {
          fastgpt_collection_id: existingFolderId,
          fastgpt_sync_source: syncSource,
          fastgpt_sync_time: new Date(),
        });
      }

      return { success: true, collectionId: existingFolderId };
    }

    // 格式化论文文本
    const { text } = formatPaperToText(paper);

    // 生成文件夹名称和描述
    const folderName = generatePaperFolderName(paper);
    const folderIntro = generatePaperFolderIntro(paper);

    // 步骤1：使用 Dataset API 创建论文数据集
    const folderId = await createDataset({
      parentId: FASTGPT_PUBLIC_DATASET_ID,
      type: "dataset",
      name: folderName,
      intro: folderIntro, // 使用 intro 字段存储 sourceId 用于去重匹配
    });

    logger.info("[FastGPT] 论文数据集创建成功", {
      paperId: paper.id,
      folderId,
      title: folderName.substring(0, 50),
      intro: folderIntro,
    });

    // 步骤2：在论文文件夹（Dataset）下创建元数据集合（Collection）
    // 注意：datasetId 指向论文文件夹，因为 Collection 属于这个 Dataset
    const metadataCollectionName = `${folderName}_元数据`;
    const metadataResult = await createTextCollection({
      datasetId: folderId, // Collection 属于论文文件夹 Dataset
      parentId: null, // 直接在 Dataset 根目录下，无父级 Collection
      name: metadataCollectionName,
      text,
      trainingType: "chunk",
      chunkSettingMode: "auto",
      metadata: {
        paperId: paper.id,
        type: "metadata", // 标记为元数据
      },
    });

    logger.info("[FastGPT] 论文元数据集合创建成功", {
      paperId: paper.id,
      folderId,
      metadataCollectionId: metadataResult.collectionId,
    });

    // 更新 Paper 表的同步状态（存储文件夹ID）
    if (syncSource && folderId) {
      await updatePaperSyncStatus(paper.id, {
        fastgpt_collection_id: folderId,
        fastgpt_sync_source: syncSource,
        fastgpt_sync_time: new Date(),
        fastgpt_has_fulltext: false,
      });
    }

    logger.info("[FastGPT] 论文同步成功", {
      paperId: paper.id,
      title: folderName.substring(0, 50),
      folderId,
      metadataCollectionId: metadataResult.collectionId,
      syncSource,
    });

    return { success: true, collectionId: folderId };
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error("[FastGPT] 论文同步失败", {
      paperId: paper.id,
      title: paper.title?.substring(0, 50),
      error: errorMessage,
    });
    return { success: false, error: errorMessage };
  }
}

/**
 * 批量同步论文到 FastGPT 公共数据集
 * @param papers 论文列表
 * @param options 配置项
 * @returns 批量同步结果
 */
export async function syncPapersToDataset(
  papers: Paper[],
  options: {
    /** 每条记录之间的延迟（毫秒） */
    delayMs?: number;
    /** 是否跳过已同步的论文（根据 metadata 判断） */
    skipExisting?: boolean;
    /** 同步来源 */
    syncSource?: FastgptSyncSource;
  } = {}
): Promise<BatchSyncResult> {
  const {
    delayMs = 500,
    skipExisting = false,
    syncSource = "cron_task",
  } = options;

  if (!checkDatasetId()) {
    return {
      total: papers.length,
      success: 0,
      failed: 0,
      skipped: papers.length,
      details: papers.map((p) => ({
        paperId: p.id,
        title: p.title || "",
        status: "skipped" as const,
        error: "FASTGPT_PUBLIC_DATASET_ID 未配置",
      })),
    };
  }

  const result: BatchSyncResult = {
    total: papers.length,
    success: 0,
    failed: 0,
    skipped: 0,
    details: [],
  };

  // 如果需要跳过已存在的，先获取现有集合列表
  let existingCollections: Set<string> = new Set();
  if (skipExisting) {
    try {
      const collections = await listCollections({
        datasetId: FASTGPT_PUBLIC_DATASET_ID,
        pageSize: 1000,
      });
      // 从 metadata 中提取 paperId
      existingCollections = new Set(
        collections.list
          .filter((c) => c.metadata?.paperId)
          .map((c) => String(c.metadata?.paperId))
      );
      logger.info("[FastGPT] 已获取现有集合列表", {
        count: existingCollections.size,
      });
    } catch (error) {
      logger.warn("[FastGPT] 获取现有集合列表失败，继续同步", { error });
    }
  }

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];

    // 检查是否已存在
    if (skipExisting && existingCollections.has(paper.id)) {
      result.skipped++;
      result.details.push({
        paperId: paper.id,
        title: paper.title || "",
        status: "skipped",
        error: "论文已存在于知识库",
      });
      continue;
    }

    // 同步论文
    const syncResult = await syncPaperToDataset(paper, syncSource);

    if (syncResult.success) {
      result.success++;
      result.details.push({
        paperId: paper.id,
        title: paper.title || "",
        status: "success",
        collectionId: syncResult.collectionId,
      });
    } else {
      result.failed++;
      result.details.push({
        paperId: paper.id,
        title: paper.title || "",
        status: "failed",
        error: syncResult.error,
      });
    }

    // 添加延迟，避免请求过快
    if (delayMs > 0 && i < papers.length - 1) {
      await delay(delayMs);
    }
  }

  logger.info("[FastGPT] 批量同步完成", {
    total: result.total,
    success: result.success,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

/**
 * 获取公共数据集 ID
 */
export function getPublicDatasetId(): string {
  return FASTGPT_PUBLIC_DATASET_ID;
}

/**
 * 检查公共数据集是否可用
 */
export function isPublicDatasetConfigured(): boolean {
  return !!FASTGPT_PUBLIC_DATASET_ID;
}

/**
 * 异步批量同步论文到 FastGPT（根据论文 ID 列表）
 * 非阻塞调用，适用于搜索 API 等需要快速响应的场景
 *
 * @param paperIds 论文 ID 列表（数据库 UUID）
 * @param syncSource 同步来源（默认 user_search）
 */
export function syncPapersToDatasetByIds(
  paperIds: string[],
  syncSource: FastgptSyncSource = "user_search"
): void {
  // 如果未配置数据集 ID，直接返回
  if (!FASTGPT_PUBLIC_DATASET_ID || paperIds.length === 0) {
    return;
  }

  // Fire-and-forget：异步执行，不阻塞主流程
  (async () => {
    try {
      // 查询论文完整数据（排除已同步的）
      const papers = await prisma.paper.findMany({
        where: {
          id: { in: paperIds },
          fastgpt_collection_id: null, // 只同步未同步的
        },
      });

      if (papers.length === 0) {
        return;
      }

      logger.info("[FastGPT] 开始异步同步论文到公共数据集", {
        count: papers.length,
        syncSource,
      });

      // 逐个同步（带延迟，避免请求过快）
      let successCount = 0;
      let failCount = 0;

      for (const paper of papers) {
        try {
          const result = await syncPaperToDataset(paper, syncSource);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
          await delay(200);
        } catch (error: unknown) {
          failCount++;
          logger.warn("[FastGPT] 论文同步失败（异步）", {
            paperId: paper.id,
            error: getErrorMessage(error),
          });
        }
      }

      logger.info("[FastGPT] 异步同步论文完成", {
        total: papers.length,
        success: successCount,
        failed: failCount,
        syncSource,
      });
    } catch (error: unknown) {
      logger.error("[FastGPT] 异步同步论文异常", {
        error: getErrorMessage(error),
        paperCount: paperIds.length,
      });
    }
  })().catch((err) => {
    logger.error("[FastGPT] 异步同步论文未捕获异常", { error: err });
  });
}

/**
 * 异步同步单篇论文到 FastGPT（非阻塞）
 * 适用于对话中检索到的单篇论文
 *
 * @param paper 论文数据
 * @param syncSource 同步来源（默认 chat_related）
 */
export function syncPaperToDatasetAsync(
  paper: Paper,
  syncSource: FastgptSyncSource = "chat_related"
): void {
  if (!FASTGPT_PUBLIC_DATASET_ID) {
    return;
  }

  // 已同步的跳过
  if (paper.fastgpt_collection_id) {
    return;
  }

  // Fire-and-forget
  syncPaperToDataset(paper, syncSource).catch((error: unknown) => {
    logger.warn("[FastGPT] 论文异步同步失败", {
      paperId: paper.id,
      error: getErrorMessage(error),
    });
  });
}

/**
 * 全文补全结果
 */
export interface FulltextUpdateResult {
  success: boolean;
  fulltextCollectionId?: string;
  error?: string;
}

/**
 * 为已同步的论文补全全文内容
 *
 * 存储结构：
 * 公共数据集
 * └── 论文文件夹 (virtual collection) ← fastgpt_collection_id 指向这里
 *     ├── 元数据 (text collection)
 *     └── 全文 (file collection) ← 本函数创建
 *
 * 当论文通过全文传递等方式获取到 PDF 全文后，调用此函数将全文上传到 FastGPT。
 * 使用 createFileCollection 直接上传 PDF 文件，由 FastGPT 自动解析和分块。
 * 全文 Collection 作为论文文件夹的子集合存在。
 *
 * @param paperId 论文 ID（数据库 UUID）
 * @returns 更新结果
 */
export async function updatePaperFulltextInDataset(
  paperId: string
): Promise<FulltextUpdateResult> {
  if (!checkDatasetId()) {
    return { success: false, error: "FASTGPT_PUBLIC_DATASET_ID 未配置" };
  }

  try {
    // 1. 查询论文信息
    const paper = await prisma.paper.findUnique({
      where: { id: paperId },
    });

    if (!paper) {
      return { success: false, error: "论文不存在" };
    }

    // 2. 检查是否满足补全条件
    if (!paper.fastgpt_collection_id) {
      return { success: false, error: "论文尚未同步到 FastGPT" };
    }

    if (paper.fastgpt_has_fulltext) {
      logger.info("[FastGPT] 论文全文已同步，跳过", {
        paperId: paper.id,
        folderId: paper.fastgpt_collection_id,
      });
      return {
        success: true,
        fulltextCollectionId: paper.fastgpt_collection_id,
      };
    }

    if (!paper.pdf_downloaded || !paper.pdf_file_path) {
      return { success: false, error: "论文 PDF 尚未下载" };
    }

    // 3. 从本地存储复制 PDF 到临时目录
    const tempDir = os.tmpdir();
    const tempFileName = `paper_${paper.id}_${Date.now()}.pdf`;
    const tempFilePath = path.join(tempDir, tempFileName);

    logger.info("[FastGPT] 开始下载论文 PDF", {
      paperId: paper.id,
      cosKey: paper.pdf_file_path,
    });

    const downloadSuccess = await copyLocalFile(
      paper.pdf_file_path,
      tempFilePath
    );
    if (!downloadSuccess) {
      return { success: false, error: "从本地存储复制 PDF 失败" };
    }

    try {
      // 4. 读取文件内容
      const fileBuffer = fs.readFileSync(tempFilePath);
      const filename = paper.title
        ? `${paper.title
            .substring(0, 50)
            .replace(/[/\\?%*:|"<>]/g, "_")}_全文.pdf`
        : "全文.pdf";

      // 5. 上传 PDF 到 FastGPT（作为论文文件夹 Dataset 下的 Collection）
      // 注意：datasetId 指向论文文件夹，因为 Collection 属于这个 Dataset
      // Collection 名称包含论文标题，便于识别
      const fulltextCollectionName = `${(paper.title || "未命名论文").substring(
        0,
        50
      )}_全文`;
      const result = await createFileCollection({
        datasetId: paper.fastgpt_collection_id, // Collection 属于论文文件夹 Dataset
        parentId: null, // 直接在 Dataset 根目录下，无父级 Collection
        file: fileBuffer,
        filename: fulltextCollectionName,
        trainingType: "chunk",
        chunkSize: 512,
        metadata: {
          paperId: paper.id,
          type: "fulltext", // 标记为全文
          source: paper.source,
          originalFilename: filename,
          uploadTime: new Date().toISOString(),
        },
      });

      // 6. 更新论文的全文同步状态
      await updatePaperSyncStatus(paper.id, { fastgpt_has_fulltext: true });

      logger.info("[FastGPT] 论文全文补全成功", {
        paperId: paper.id,
        title: paper.title?.substring(0, 50),
        folderId: paper.fastgpt_collection_id,
        fulltextCollectionId: result.collectionId,
      });

      return { success: true, fulltextCollectionId: result.collectionId };
    } finally {
      // 7. 清理临时文件
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch {
        // 忽略删除失败
      }
    }
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    logger.error("[FastGPT] 论文全文补全失败", { paperId, error: errorMessage });
    return { success: false, error: errorMessage };
  }
}

/**
 * 批量补全论文全文
 *
 * @param limit 处理数量限制
 * @param delayMs 每条记录之间的延迟（毫秒）
 * @returns 批量处理结果
 */
export async function batchUpdatePaperFulltext(
  limit: number = 50,
  delayMs: number = 1000
): Promise<{
  total: number;
  success: number;
  failed: number;
  details: Array<{ paperId: string; success: boolean; error?: string }>;
}> {
  if (!checkDatasetId()) {
    return { total: 0, success: 0, failed: 0, details: [] };
  }

  // 查询已同步但未包含全文的论文
  const papers = await prisma.paper.findMany({
    where: {
      fastgpt_collection_id: { not: null },
      fastgpt_has_fulltext: false,
      pdf_downloaded: true,
      pdf_file_path: { not: null },
      deleted_status: 0,
    },
    take: limit,
    orderBy: {
      pdf_download_time: "desc",
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (papers.length === 0) {
    logger.info("[FastGPT] 没有需要补全全文的论文");
    return { total: 0, success: 0, failed: 0, details: [] };
  }

  logger.info("[FastGPT] 开始批量补全论文全文", { count: papers.length });

  const result = {
    total: papers.length,
    success: 0,
    failed: 0,
    details: [] as Array<{ paperId: string; success: boolean; error?: string }>,
  };

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];

    const updateResult = await updatePaperFulltextInDataset(paper.id);

    result.details.push({
      paperId: paper.id,
      success: updateResult.success,
      error: updateResult.error,
    });

    if (updateResult.success) {
      result.success++;
    } else {
      result.failed++;
    }

    // 添加延迟，避免请求过快
    if (delayMs > 0 && i < papers.length - 1) {
      await delay(delayMs);
    }
  }

  logger.info("[FastGPT] 批量补全论文全文完成", {
    total: result.total,
    success: result.success,
    failed: result.failed,
  });

  return result;
}
