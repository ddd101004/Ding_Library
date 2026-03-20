/**
 * 文件上传工具函数
 *
 * 用于前端上传文件到本地服务器
 */

import { apiPost } from "@/api/request";

export interface UploadPaperOptions {
  file: File;
  title?: string;
  authors?: string;
  abstract?: string;
  keywords?: string;
}

export interface UploadPaperResult {
  paper_id: string;
  file_path: string;
  file_url: string;
  file_name: string;
  file_size: number;
}

export interface UploadCoverResult {
  file_path: string;
  file_url: string;
  file_name: string;
  file_size: number;
}

/**
 * 上传论文文件
 *
 * @param options - 上传选项
 * @returns Promise<UploadPaperResult>
 */
export async function uploadPaper(
  options: UploadPaperOptions
): Promise<UploadPaperResult> {
  const { file, title, authors, abstract, keywords } = options;

  // 创建 FormData
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (authors) formData.append("authors", authors);
  if (abstract) formData.append("abstract", abstract);
  if (keywords) formData.append("keywords", keywords);

  // 发送请求
  const response = await apiPost<UploadPaperResult>(
    "/api/upload/paper",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

/**
 * 上传封面图
 *
 * @param file - 图片文件
 * @returns Promise<UploadCoverResult>
 */
export async function uploadCover(file: File): Promise<UploadCoverResult> {
  // 创建 FormData
  const formData = new FormData();
  formData.append("file", file);

  // 发送请求
  const response = await apiPost<UploadCoverResult>(
    "/api/upload/cover",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

/**
 * 验证文件类型
 *
 * @param file - 文件对象
 * @param allowedTypes - 允许的类型数组
 * @returns boolean
 */
export function validateFileType(
  file: File,
  allowedTypes: string[]
): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return allowedTypes.includes(ext);
}

/**
 * 验证文件大小
 *
 * @param file - 文件对象
 * @param maxSizeInMB - 最大大小（MB）
 * @returns boolean
 */
export function validateFileSize(file: File, maxSizeInMB: number): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

/**
 * 格式化文件大小显示
 *
 * @param bytes - 字节数
 * @returns string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}
