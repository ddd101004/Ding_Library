/**
 * FastGPT 集合（文件）服务
 * 封装集合的创建、上传、管理等操作
 */

import FormData from "form-data";
import { fastgptClient } from "./client";
import type {
  CreateCollectionBaseParams,
  CreateEmptyCollectionParams,
  CreateTextCollectionParams,
  CreateLinkCollectionParams,
  CreateCollectionResult,
  CollectionInfo,
  ListCollectionParams,
  ListCollectionResponse,
} from "@/type/fastgpt";
import logger from "@/helper/logger";

/**
 * 从 FastGPT API 响应中提取集合 ID
 * 兼容多种返回格式：
 * 1. data 直接是字符串（集合 ID）
 * 2. data 是对象 { collectionId: "xxx" }
 * 3. data 是对象 { _id: "xxx" }
 */
function extractCollectionId(
  data: CreateCollectionResult | string | null | undefined
): string {
  if (!data) return "";
  if (typeof data === "string") return data;
  return (
    data.collectionId || (data as unknown as { _id?: string })?._id || ""
  );
}

/**
 * 创建空集合（文件夹）
 * @param params 创建参数
 * @returns 集合ID
 */
export async function createEmptyCollection(
  params: CreateEmptyCollectionParams
): Promise<string> {
  const response = await fastgptClient.post<CreateCollectionResult>(
    "/core/dataset/collection/create",
    {
      datasetId: params.datasetId,
      parentId: params.parentId ?? null,
      name: params.name,
      intro: params.intro || "",
      type: params.type || "virtual",
      metadata: params.metadata || {},
    }
  );

  // FastGPT API 返回格式兼容处理
  const collectionId = extractCollectionId(response.data);

  logger.info("[FastGPT] Empty collection created:", {
    name: params.name,
    intro: params.intro,
    collectionId,
  });

  return collectionId;
}

/**
 * 创建纯文本集合
 * @param params 创建参数
 * @returns 创建结果
 */
export async function createTextCollection(
  params: CreateTextCollectionParams
): Promise<CreateCollectionResult> {
  const response = await fastgptClient.post<CreateCollectionResult>(
    "/core/dataset/collection/create/text",
    {
      text: params.text,
      datasetId: params.datasetId,
      parentId: params.parentId ?? null,
      name: params.name,
      trainingType: params.trainingType || "chunk",
      chunkSettingMode: params.chunkSettingMode || "auto",
      chunkSize: params.chunkSize,
      indexSize: params.indexSize,
      chunkSplitter: params.chunkSplitter,
      qaPrompt: params.qaPrompt || "",
      tags: params.tags,
      metadata: params.metadata || {},
    }
  );

  // FastGPT API 返回格式兼容处理
  const collectionId = extractCollectionId(response.data);
  const insertLen =
    typeof response.data === "object" ? response.data?.insertLen || 0 : 0;

  logger.info("[FastGPT] Text collection created:", {
    name: params.name,
    collectionId,
    insertLen,
  });

  return { collectionId, insertLen };
}

/**
 * 创建链接集合
 * @param params 创建参数
 * @returns 创建结果
 */
export async function createLinkCollection(
  params: CreateLinkCollectionParams
): Promise<CreateCollectionResult> {
  const response = await fastgptClient.post<CreateCollectionResult>(
    "/core/dataset/collection/create/link",
    {
      link: params.link,
      datasetId: params.datasetId,
      parentId: params.parentId ?? null,
      trainingType: params.trainingType || "chunk",
      chunkSettingMode: params.chunkSettingMode || "auto",
      chunkSize: params.chunkSize,
      qaPrompt: params.qaPrompt || "",
      tags: params.tags,
      metadata: params.metadata || {},
    }
  );

  // FastGPT API 返回格式兼容处理
  const collectionId = extractCollectionId(response.data);
  const insertLen =
    typeof response.data === "object" ? response.data?.insertLen || 0 : 0;

  logger.info("[FastGPT] Link collection created:", {
    link: params.link,
    collectionId,
    insertLen,
  });

  return { collectionId, insertLen };
}

/**
 * 上传本地文件创建集合
 * @param params 创建参数
 * @returns 创建结果
 */
export async function createFileCollection(params: {
  datasetId: string;
  parentId?: string | null;
  file: Buffer;
  filename: string;
  trainingType?: "chunk" | "qa";
  chunkSize?: number;
  chunkSplitter?: string;
  qaPrompt?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<CreateCollectionResult> {
  const formData = new FormData();

  // 添加文件 - 对中文文件名进行 encode 处理
  const encodedFilename = encodeURIComponent(params.filename);
  formData.append("file", params.file, {
    filename: encodedFilename,
    contentType: getMimeType(params.filename),
  });

  // 构建 data 参数
  const dataParams: Record<string, unknown> = {
    datasetId: params.datasetId,
    parentId: params.parentId ?? null,
    trainingType: params.trainingType || "chunk",
    chunkSize: params.chunkSize || 512,
    chunkSplitter: params.chunkSplitter || "",
    qaPrompt: params.qaPrompt || "",
    metadata: params.metadata || {},
  };

  if (params.tags && params.tags.length > 0) {
    dataParams.tags = params.tags;
  }

  formData.append("data", JSON.stringify(dataParams));

  const response = await fastgptClient.uploadFile<CreateCollectionResult>(
    "/core/dataset/collection/create/localFile",
    formData,
    {
      timeout: 300000, // 5分钟超时，大文件需要更长时间
    }
  );

  // FastGPT API 返回格式兼容处理
  const collectionId = extractCollectionId(response.data);
  const insertLen =
    typeof response.data === "object" ? response.data?.insertLen || 0 : 0;

  logger.info("[FastGPT] File collection created:", {
    filename: params.filename,
    collectionId,
    insertLen,
  });

  return { collectionId, insertLen };
}

/**
 * 获取集合列表
 * @param params 查询参数
 * @returns 集合列表
 */
export async function listCollections(
  params: ListCollectionParams
): Promise<ListCollectionResponse> {
  const response = await fastgptClient.post<ListCollectionResponse>(
    "/core/dataset/collection/listV2",
    {
      datasetId: params.datasetId,
      parentId: params.parentId ?? null,
      offset: params.offset || 0,
      pageSize: params.pageSize || 10,
      searchText: params.searchText || "",
    }
  );

  return response.data || { list: [], total: 0 };
}

/**
 * 获取集合详情
 * @param collectionId 集合ID
 * @returns 集合详情
 */
export async function getCollectionDetail(
  collectionId: string
): Promise<CollectionInfo | null> {
  const response = await fastgptClient.get<CollectionInfo>(
    "/core/dataset/collection/detail",
    {
      id: collectionId,
    }
  );

  return response.data || null;
}

/**
 * 更新集合信息
 * @param params 更新参数
 */
export async function updateCollection(params: {
  id: string;
  parentId?: string | null;
  name?: string;
  tags?: string[];
  forbid?: boolean;
  createTime?: string;
}): Promise<void> {
  await fastgptClient.put("/core/dataset/collection/update", params);

  logger.info("[FastGPT] Collection updated:", { id: params.id });
}

/**
 * 删除集合
 * @param collectionIds 集合ID列表
 */
export async function deleteCollections(collectionIds: string[]): Promise<void> {
  await fastgptClient.post("/core/dataset/collection/delete", {
    collectionIds,
  });

  logger.info("[FastGPT] Collections deleted:", { collectionIds });
}

/**
 * 根据文件扩展名获取 MIME 类型
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    txt: "text/plain",
    md: "text/markdown",
    html: "text/html",
    csv: "text/csv",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    json: "application/json",
  };

  return mimeTypes[ext || ""] || "application/octet-stream";
}

export { getMimeType };
