/**
 * 文件处理工具函数
 *
 * 提供统一的文件类型、大小、MIME 类型等校验和转换功能
 */

// ==================== 常量定义 ====================

/**
 * 支持的文件类型列表
 */
export const SUPPORTED_FILE_TYPES = ["pdf", "docx", "doc", "txt"] as const;

/**
 * 文件类型对应的 MIME 类型映射
 */
export const MIME_TYPE_MAP: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  txt: "text/plain",
};

// ==================== 类型定义 ====================

export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

/**
 * 文件校验结果
 */
export interface FileValidationResult {
  valid: boolean;
  error?: string;
  file_type?: string;
}

/**
 * 文件校验参数
 */
export interface ValidateFileParams {
  file_name: string;
  file_size: number;
  file_type?: string;
  max_size?: number;
}

// ==================== 工具函数 ====================

/**
 * 根据文件类型获取 MIME 类型
 *
 * @param fileType - 文件类型（pdf/docx/doc/txt）
 * @returns MIME 类型字符串
 */
export function getMimeType(fileType: string): string {
  return MIME_TYPE_MAP[fileType.toLowerCase()] || "application/octet-stream";
}

/**
 * 从文件名获取文件扩展名
 *
 * @param fileName - 文件名
 * @returns 文件扩展名（小写）
 */
export function getFileTypeFromName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ext;
}

/**
 * 验证文件类型是否支持
 *
 * @param fileType - 文件类型
 * @returns 是否支持
 */
export function isSupportedFileType(fileType: string): boolean {
  return SUPPORTED_FILE_TYPES.includes(
    fileType.toLowerCase() as SupportedFileType
  );
}

/**
 * 验证文件大小是否在限制内
 *
 * @param fileSize - 文件大小（字节）
 * @param maxSize - 最大限制（字节）
 * @returns 是否有效
 */
export function isFileSizeValid(fileSize: number, maxSize: number): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * 格式化文件大小为可读字符串
 *
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的字符串（如 "2.5 MB"）
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

/**
 * 统一的文件校验函数
 *
 * 校验文件名、文件大小、文件类型是否有效
 *
 * @param params - 校验参数
 * @returns 校验结果
 */
export function validateFile(params: ValidateFileParams): FileValidationResult {
  const { file_name, file_size, file_type, max_size } = params;

  // 校验文件名
  if (!file_name || typeof file_name !== "string" || file_name.trim() === "") {
    return { valid: false, error: "文件名不能为空" };
  }

  // 校验文件大小
  if (!file_size || typeof file_size !== "number" || file_size <= 0) {
    return { valid: false, error: "文件大小无效" };
  }

  // 获取文件类型（优先使用传入的类型，否则从文件名提取）
  const actualFileType = file_type || getFileTypeFromName(file_name);

  if (!actualFileType) {
    return { valid: false, error: "无法识别文件类型" };
  }

  // 校验文件类型
  if (!isSupportedFileType(actualFileType)) {
    return {
      valid: false,
      error: "不支持的文件类型，仅支持 PDF、Word、TXT 格式",
    };
  }

  // 校验文件大小限制
  if (max_size && !isFileSizeValid(file_size, max_size)) {
    const maxSizeStr = formatFileSize(max_size);
    return { valid: false, error: `文件大小超过限制（最大 ${maxSizeStr}）` };
  }

  return { valid: true, file_type: actualFileType };
}
