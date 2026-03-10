/**
 * 腾讯云 COS 客户端封装
 *
 * 提供文件上传签名、下载、删除等功能
 * 用于论文文件的云端存储
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const COS = require("cos-nodejs-sdk-v5");
import crypto from "crypto";
import logger from "@/helper/logger";
import { COS_URL_EXPIRES } from "@/constants";

// ==================== 配置 ====================

const COS_CONFIG = {
  SecretId: process.env.TENCENTCLOUD_COS_SECRET_ID || "",
  SecretKey: process.env.TENCENTCLOUD_COS_SECRET_KEY || "",
  Bucket: process.env.TENCENTCLOUD_COS_BUCKET || "",
  Region: process.env.TENCENTCLOUD_COS_REGION || "",
  Domain: process.env.TENCENTCLOUD_COS_DOMAIN || "",
  InternalDomain: process.env.TENCENTCLOUD_COS_INTERNAL_DOMAIN || "",
};

// 图片 MIME 类型映射
const IMAGE_MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

// 图片上传配置类型
interface ImageUploadConfig {
  prefix: string;
  allowedTypes: readonly string[];
  maxSize: number;
  urlExpires: number;
}

// 头像配置
const AVATAR_CONFIG: ImageUploadConfig = {
  prefix: "avatars",
  allowedTypes: ["jpg", "jpeg", "png", "gif", "webp"] as const,
  maxSize: 2 * 1024 * 1024,
  urlExpires: 7 * 24 * 60 * 60,
};

// 封面图配置
const COVER_IMAGE_CONFIG: ImageUploadConfig = {
  prefix: "covers",
  allowedTypes: ["jpg", "jpeg", "png"] as const,
  maxSize: 2 * 1024 * 1024,
  urlExpires: 7 * 24 * 60 * 60,
};

// 验证配置
const validateConfig = () => {
  const required = ["SecretId", "SecretKey", "Bucket", "Region"];
  const missing = required.filter(
    (key) => !COS_CONFIG[key as keyof typeof COS_CONFIG]
  );
  if (missing.length > 0) {
    throw new Error(`COS 配置缺失: ${missing.join(", ")}`);
  }
};

// COS 客户端实例（延迟初始化）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cosClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getCosClient = (): any => {
  if (!cosClient) {
    validateConfig();
    cosClient = new COS({
      SecretId: COS_CONFIG.SecretId,
      SecretKey: COS_CONFIG.SecretKey,
    });
  }
  return cosClient;
};

// ==================== 类型定义 ====================

export interface GenerateSignatureParams {
  file_name: string;
  file_size: number;
  file_type: string;
  user_id: string;
  expires?: number;
}

export interface SignatureResult {
  cos_key: string;
  signed_url: string;
  expires_at: string;
  bucket: string;
  region: string;
}

export interface CosFileInfo {
  exists: boolean;
  size?: number;
  last_modified?: string;
  content_type?: string;
}

export interface ImageSignatureParams {
  user_id: string;
  file_type: string;
  file_size: number;
}

export interface ImageSignatureResult {
  cos_key: string;
  signed_url: string;
  expires_at: string;
  method: string;
  headers: { "Content-Type": string };
}

// ==================== 通用 COS 操作封装 ====================

/**
 * 通用 COS 回调 Promise 封装
 */
function cosPromise<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operation: (callback: (err: any, data: any) => void) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transform: (data: any) => T,
  errorMsg: string,
  logContext: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    operation((err: any, data: any) => {
      if (err) {
        logger.error(errorMsg, { ...logContext, error: err.message });
        reject(new Error(`${errorMsg}: ${err.message}`));
        return;
      }
      resolve(transform(data));
    });
  });
}

/**
 * 通用 COS 操作（返回布尔值）
 */
function cosOperation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  operation: (callback: (err: any) => void) => void,
  successMsg: string,
  errorMsg: string,
  logContext: Record<string, unknown>
): Promise<boolean> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    operation((err: any) => {
      if (err) {
        logger.error(errorMsg, { ...logContext, error: err.message });
        resolve(false);
        return;
      }
      logger.info(successMsg, logContext);
      resolve(true);
    });
  });
}

// ==================== 核心方法 ====================

/**
 * 生成前端直传签名 URL
 */
export async function generateUploadSignature(
  params: GenerateSignatureParams
): Promise<SignatureResult> {
  const { file_type, user_id, expires = 1800 } = params;
  validateConfig();

  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  const ext = file_type.toLowerCase();
  const cosKey = `papers/${user_id}/${timestamp}_${random}.${ext}`;

  const cos = getCosClient();

  return cosPromise(
    (cb) =>
      cos.getObjectUrl(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Method: "PUT",
          Expires: expires,
          Sign: true,
          Domain: COS_CONFIG.Domain,
        },
        cb
      ),
    (data) => {
      const expiresAt = new Date(Date.now() + expires * 1000).toISOString();
      logger.info("生成 COS 上传签名成功", { cosKey, userId: user_id, expiresAt });
      return {
        cos_key: cosKey,
        signed_url: data.Url,
        expires_at: expiresAt,
        bucket: COS_CONFIG.Bucket,
        region: COS_CONFIG.Region,
      };
    },
    "生成 COS 上传签名失败",
    { cosKey, userId: user_id }
  );
}

/**
 * 检查 COS 文件是否存在
 */
export async function checkFileExists(cosKey: string): Promise<CosFileInfo> {
  const cos = getCosClient();

  return new Promise((resolve) => {
    cos.headObject(
      {
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Key: cosKey,
        Domain: COS_CONFIG.Domain,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any, data: any) => {
        if (err) {
          if (err.statusCode === 404) {
            logger.warn("COS 文件不存在", { cosKey });
          } else {
            logger.error("检查 COS 文件失败", {
              error: err.message,
              statusCode: err.statusCode,
              cosKey,
            });
          }
          resolve({ exists: false });
          return;
        }
        resolve({
          exists: true,
          size: parseInt(data.headers?.["content-length"] || "0", 10),
          last_modified: data.headers?.["last-modified"],
          content_type: data.headers?.["content-type"],
        });
      }
    );
  });
}

/**
 * 下载 COS 文件到本地
 */
export async function downloadFile(
  cosKey: string,
  localPath: string
): Promise<boolean> {
  const cos = getCosClient();
  const useInternalDomain = !!COS_CONFIG.InternalDomain;

  return cosOperation(
    (cb) =>
      cos.getObject(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Output: localPath,
          ...(useInternalDomain && { Domain: COS_CONFIG.InternalDomain }),
        },
        cb
      ),
    "下载 COS 文件成功",
    "下载 COS 文件失败",
    { cosKey, localPath, useInternalDomain }
  );
}

/**
 * 上传文件到 COS
 */
export async function uploadFile(
  cosKey: string,
  filePath: string
): Promise<boolean> {
  const cos = getCosClient();

  return cosOperation(
    (cb) =>
      cos.putObject(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Body: require("fs").createReadStream(filePath),
        },
        cb
      ),
    "上传 COS 文件成功",
    "上传 COS 文件失败",
    { cosKey, filePath }
  );
}

/**
 * 上传 Buffer 数据到 COS
 */
export async function uploadBuffer(
  cosKey: string,
  buffer: Buffer,
  contentType?: string
): Promise<boolean> {
  const cos = getCosClient();

  return cosOperation(
    (cb) =>
      cos.putObject(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Body: buffer,
          ...(contentType && { ContentType: contentType }),
        },
        cb
      ),
    "上传 COS Buffer 成功",
    "上传 COS Buffer 失败",
    { cosKey, bufferSize: buffer.length }
  );
}

/**
 * 删除 COS 文件
 */
export async function deleteFile(cosKey: string): Promise<boolean> {
  const cos = getCosClient();

  return cosOperation(
    (cb) =>
      cos.deleteObject(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
        },
        cb
      ),
    "删除 COS 文件成功",
    "删除 COS 文件失败",
    { cosKey }
  );
}

/**
 * 获取文件的签名访问 URL
 */
export function getFileUrl(
  cosKey: string,
  expires: number = COS_URL_EXPIRES
): string {
  const cos = getCosClient();
  return cos.getObjectUrl({
    Bucket: COS_CONFIG.Bucket,
    Region: COS_CONFIG.Region,
    Key: cosKey,
    Method: "GET",
    Expires: expires,
    Sign: true,
    Domain: COS_CONFIG.Domain,
  }) as string;
}

/**
 * 获取带签名的临时访问 URL（异步）
 */
export async function getSignedUrl(
  cosKey: string,
  expires: number = COS_URL_EXPIRES
): Promise<string> {
  const cos = getCosClient();

  return cosPromise(
    (cb) =>
      cos.getObjectUrl(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Method: "GET",
          Expires: expires,
          Sign: true,
          Domain: COS_CONFIG.Domain,
        },
        cb
      ),
    (data) => data.Url,
    "生成 COS 签名 URL 失败",
    { cosKey }
  );
}

// ==================== 通用图片上传方法 ====================

/**
 * 验证图片文件
 */
function validateImageFile(
  config: ImageUploadConfig,
  file_type: string,
  file_size: number
): { valid: boolean; error?: string } {
  const ext = file_type.toLowerCase().replace(".", "");

  if (!config.allowedTypes.includes(ext)) {
    return {
      valid: false,
      error: `不支持的图片格式，仅支持 ${config.allowedTypes.join("、").toUpperCase()}`,
    };
  }

  if (file_size > config.maxSize) {
    const maxSizeMB = config.maxSize / 1024 / 1024;
    return { valid: false, error: `图片大小不能超过 ${maxSizeMB}MB` };
  }

  return { valid: true };
}

/**
 * 生成图片上传签名（通用）
 */
async function generateImageUploadSignature(
  config: ImageUploadConfig,
  params: ImageSignatureParams,
  logPrefix: string
): Promise<ImageSignatureResult> {
  const { user_id, file_type, file_size } = params;
  validateConfig();

  const validation = validateImageFile(config, file_type, file_size);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cos = getCosClient();
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  const ext = file_type.toLowerCase().replace(".", "");
  const cosKey = `${config.prefix}/${user_id}/${timestamp}_${random}.${ext}`;
  const contentType = IMAGE_MIME_MAP[ext] || "image/jpeg";
  const expires = 1800;

  return cosPromise(
    (cb) =>
      cos.getObjectUrl(
        {
          Bucket: COS_CONFIG.Bucket,
          Region: COS_CONFIG.Region,
          Key: cosKey,
          Method: "PUT",
          Expires: expires,
          Sign: true,
          Domain: COS_CONFIG.Domain,
        },
        cb
      ),
    (data) => {
      const expiresAt = new Date(Date.now() + expires * 1000).toISOString();
      logger.info(`生成${logPrefix}上传签名成功`, { cosKey, userId: user_id, expiresAt });
      return {
        cos_key: cosKey,
        signed_url: data.Url,
        expires_at: expiresAt,
        method: "PUT",
        headers: { "Content-Type": contentType },
      };
    },
    `生成${logPrefix}上传签名失败`,
    { cosKey, userId: user_id }
  );
}

/**
 * 获取图片签名 URL（通用）
 */
function getImageSignedUrl(config: ImageUploadConfig, cosKey: string): string {
  if (!cosKey) return "";
  return getFileUrl(cosKey, config.urlExpires);
}

// ==================== 头像相关方法 ====================

export function validateAvatarFile(
  file_type: string,
  file_size: number
): { valid: boolean; error?: string } {
  return validateImageFile(AVATAR_CONFIG, file_type, file_size);
}

export async function generateAvatarUploadSignature(
  params: ImageSignatureParams
): Promise<ImageSignatureResult> {
  return generateImageUploadSignature(AVATAR_CONFIG, params, "头像");
}

export function getAvatarSignedUrl(cosKey: string): string {
  return getImageSignedUrl(AVATAR_CONFIG, cosKey);
}

export async function deleteAvatar(cosKey: string): Promise<boolean> {
  return cosKey ? deleteFile(cosKey) : true;
}

export const AVATAR_CONSTANTS = {
  ALLOWED_TYPES: AVATAR_CONFIG.allowedTypes,
  MAX_SIZE: AVATAR_CONFIG.maxSize,
  URL_EXPIRES: AVATAR_CONFIG.urlExpires,
};

// ==================== 封面图相关方法 ====================

export function validateCoverImageFile(
  file_type: string,
  file_size: number
): { valid: boolean; error?: string } {
  return validateImageFile(COVER_IMAGE_CONFIG, file_type, file_size);
}

export async function generateCoverImageUploadSignature(
  params: ImageSignatureParams
): Promise<ImageSignatureResult> {
  return generateImageUploadSignature(COVER_IMAGE_CONFIG, params, "封面图");
}

export function getCoverImageSignedUrl(cosKey: string): string {
  return getImageSignedUrl(COVER_IMAGE_CONFIG, cosKey);
}

export async function deleteCoverImage(cosKey: string): Promise<boolean> {
  return cosKey ? deleteFile(cosKey) : true;
}

export const COVER_IMAGE_CONSTANTS = {
  ALLOWED_TYPES: COVER_IMAGE_CONFIG.allowedTypes,
  MAX_SIZE: COVER_IMAGE_CONFIG.maxSize,
  URL_EXPIRES: COVER_IMAGE_CONFIG.urlExpires,
};
