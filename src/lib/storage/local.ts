/**
 * 本地文件系统存储服务
 *
 * 用于将文件存储到本地文件系统，替代云存储方案
 * 适用于中小规模文件存储场景
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "@/helper/logger";

// ==================== 配置 ====================

// 上传目录配置
const UPLOAD_CONFIG = {
  BASE_DIR: path.join(process.cwd(), "uploads"),
  PAPERS_DIR: "papers",
  COVERS_DIR: "covers",
  AVATARS_DIR: "avatars",
};

// 文件大小限制
const FILE_SIZE_LIMITS = {
  PAPER: 100 * 1024 * 1024, // 100MB
  COVER: 2 * 1024 * 1024, // 2MB
  AVATAR: 2 * 1024 * 1024, // 2MB
};

// 允许的文件类型
const ALLOWED_FILE_TYPES = {
  PAPER: [".pdf", ".doc", ".docx", ".txt"],
  COVER: [".jpg", ".jpeg", ".png"],
  AVATAR: [".jpg", ".jpeg", ".png", ".gif", ".webp"],
};

// ==================== 类型定义 ====================

export interface UploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export interface FileInfo {
  exists: boolean;
  size?: number;
  mimeType?: string;
}

// ==================== 工具函数 ====================

/**
 * 确保目录存在，不存在则创建
 */
function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.info("创建上传目录", { dirPath });
  }
}

/**
 * 生成随机文件名
 */
function generateFileName(originalName: string, userId: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const ext = path.extname(originalName);
  return `${timestamp}_${random}_${userId.substring(0, 8)}${ext}`;
}

/**
 * 验证文件类型
 */
function validateFileType(fileName: string, allowedTypes: string[]): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return allowedTypes.includes(ext);
}

/**
 * 验证文件大小
 */
function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize;
}

/**
 * 获取 MIME 类型
 */
function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };
  return mimeMap[ext] || "application/octet-stream";
}

// ==================== 核心方法 ====================

/**
 * 保存文件到本地
 *
 * @param fileBuffer - 文件二进制数据
 * @param originalName - 原始文件名
 * @param userId - 用户 ID
 * @param type - 文件类型 (paper/cover/avatar)
 * @returns UploadResult - 上传结果
 */
export async function saveFile(
  fileBuffer: Buffer,
  originalName: string,
  userId: string,
  type: "paper" | "cover" | "avatar"
): Promise<UploadResult> {
  try {
    // 配置
    const config = {
      paper: {
        dir: UPLOAD_CONFIG.PAPERS_DIR,
        maxSize: FILE_SIZE_LIMITS.PAPER,
        allowedTypes: ALLOWED_FILE_TYPES.PAPER,
      },
      cover: {
        dir: UPLOAD_CONFIG.COVERS_DIR,
        maxSize: FILE_SIZE_LIMITS.COVER,
        allowedTypes: ALLOWED_FILE_TYPES.COVER,
      },
      avatar: {
        dir: UPLOAD_CONFIG.AVATARS_DIR,
        maxSize: FILE_SIZE_LIMITS.AVATAR,
        allowedTypes: ALLOWED_FILE_TYPES.AVATAR,
      },
    }[type];

    // 验证文件类型
    if (!validateFileType(originalName, config.allowedTypes)) {
      return {
        success: false,
        error: `不支持的文件类型，仅支持 ${config.allowedTypes.join("、")}`,
      };
    }

    // 验证文件大小
    if (!validateFileSize(fileBuffer.length, config.maxSize)) {
      const maxSizeMB = config.maxSize / 1024 / 1024;
      return {
        success: false,
        error: `文件大小不能超过 ${maxSizeMB}MB`,
      };
    }

    // 生成文件路径
    const fileName = generateFileName(originalName, userId);
    const relativePath = path.join(config.dir, userId, fileName);
    const fullPath = path.join(UPLOAD_CONFIG.BASE_DIR, relativePath);

    // 确保目录存在
    const dirPath = path.dirname(fullPath);
    ensureDir(dirPath);

    // 写入文件
    fs.writeFileSync(fullPath, fileBuffer);

    logger.info("文件保存成功", {
      type,
      userId,
      fileName,
      filePath: relativePath,
      fileSize: fileBuffer.length,
    });

    return {
      success: true,
      filePath: relativePath.replace(/\\/g, "/"), // 统一使用正斜杠
      fileName: originalName,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("文件保存失败", { type, userId, error: errorMessage });
    return {
      success: false,
      error: "文件保存失败",
    };
  }
}

/**
 * 检查文件是否存在
 *
 * @param filePath - 相对文件路径
 * @returns FileInfo - 文件信息
 */
export function checkFileExists(filePath: string): FileInfo {
  const fullPath = path.join(UPLOAD_CONFIG.BASE_DIR, filePath);

  if (!fs.existsSync(fullPath)) {
    return { exists: false };
  }

  try {
    const stats = fs.statSync(fullPath);
    return {
      exists: true,
      size: stats.size,
      mimeType: getMimeType(filePath),
    };
  } catch (error) {
    logger.error("检查文件失败", { filePath, error });
    return { exists: false };
  }
}

/**
 * 删除文件
 *
 * @param filePath - 相对文件路径
 * @returns boolean - 是否删除成功
 */
export function deleteFile(filePath: string): boolean {
  try {
    const fullPath = path.join(UPLOAD_CONFIG.BASE_DIR, filePath);

    if (!fs.existsSync(fullPath)) {
      logger.warn("文件不存在，无需删除", { filePath });
      return true;
    }

    fs.unlinkSync(fullPath);
    logger.info("文件删除成功", { filePath });
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("文件删除失败", { filePath, error: errorMessage });
    return false;
  }
}

/**
 * 获取文件完整路径
 *
 * @param filePath - 相对文件路径
 * @returns string - 完整路径
 */
export function getFullPath(filePath: string): string {
  return path.join(UPLOAD_CONFIG.BASE_DIR, filePath);
}

/**
 * 获取文件访问 URL
 *
 * @param filePath - 相对文件路径
 * @returns string - 访问 URL
 */
export function getFileUrl(filePath: string): string {
  return `/uploads/${filePath.replace(/\\/g, "/")}`;
}

// ==================== 导出配置 ====================

export const LOCAL_STORAGE_CONFIG = {
  BASE_DIR: UPLOAD_CONFIG.BASE_DIR,
  FILE_SIZE_LIMITS,
  ALLOWED_FILE_TYPES,
};
