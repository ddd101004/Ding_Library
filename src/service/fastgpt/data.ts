/**
 * FastGPT 数据服务
 * 封装数据的增删改查和搜索操作
 */

import { fastgptClient } from "./client";
import type {
  PushDataParams,
  DataInfo,
  ListDataParams,
  ListDataResponse,
  SearchTestParams,
  SearchResultItem,
  DataItem,
} from "@/type/fastgpt";
import logger from "@/helper/logger";

/**
 * 为集合批量添加数据
 * 注意：每次最多推送 200 组数据
 * @param params 添加参数
 * @returns 插入结果
 */
export async function pushData(params: PushDataParams): Promise<{
  insertLen: number;
}> {
  // 检查数据数量限制
  if (params.data.length > 200) {
    throw new Error("每次最多推送 200 组数据");
  }

  const response = await fastgptClient.post<{ insertLen: number }>(
    "/core/dataset/data/pushData",
    {
      collectionId: params.collectionId,
      trainingType: params.trainingType || "chunk",
      prompt: params.prompt,
      billId: params.billId,
      data: params.data,
    }
  );

  logger.info("[FastGPT] Data pushed:", {
    collectionId: params.collectionId,
    dataCount: params.data.length,
    insertLen: response.data?.insertLen,
  });

  return response.data || { insertLen: 0 };
}

/**
 * 批量添加数据（自动分批）
 * 当数据量超过200时自动分批处理
 * @param params 添加参数
 * @returns 总插入数量
 */
export async function pushDataBatch(params: {
  collectionId: string;
  trainingType?: "chunk" | "qa";
  prompt?: string;
  billId?: string;
  data: DataItem[];
}): Promise<number> {
  const BATCH_SIZE = 200;
  let totalInserted = 0;

  for (let i = 0; i < params.data.length; i += BATCH_SIZE) {
    const batch = params.data.slice(i, i + BATCH_SIZE);
    const result = await pushData({
      collectionId: params.collectionId,
      trainingType: params.trainingType,
      prompt: params.prompt,
      billId: params.billId,
      data: batch,
    });
    totalInserted += result.insertLen;

    logger.debug("[FastGPT] Batch pushed:", {
      batchIndex: Math.floor(i / BATCH_SIZE) + 1,
      totalBatches: Math.ceil(params.data.length / BATCH_SIZE),
      batchInsertLen: result.insertLen,
    });
  }

  return totalInserted;
}

/**
 * 获取集合的数据列表
 * @param params 查询参数
 * @returns 数据列表
 */
export async function listData(
  params: ListDataParams
): Promise<ListDataResponse> {
  const response = await fastgptClient.post<ListDataResponse>(
    "/core/dataset/data/v2/list",
    {
      collectionId: params.collectionId,
      offset: params.offset || 0,
      pageSize: params.pageSize || 10,
      searchText: params.searchText || "",
    }
  );

  return response.data || { list: [], total: 0 };
}

/**
 * 获取单条数据详情
 * @param dataId 数据ID
 * @returns 数据详情
 */
export async function getDataDetail(dataId: string): Promise<DataInfo | null> {
  const response = await fastgptClient.get<DataInfo>(
    "/core/dataset/data/detail",
    {
      id: dataId,
    }
  );

  return response.data || null;
}

/**
 * 更新单条数据
 * @param params 更新参数
 */
export async function updateData(params: {
  dataId: string;
  q?: string;
  a?: string;
  indexes?: Array<{
    dataId?: string;
    type?: string;
    text: string;
  }>;
}): Promise<void> {
  await fastgptClient.put("/core/dataset/data/update", params);

  logger.info("[FastGPT] Data updated:", { dataId: params.dataId });
}

/**
 * 删除单条数据
 * @param dataId 数据ID
 */
export async function deleteData(dataId: string): Promise<void> {
  await fastgptClient.delete("/core/dataset/data/delete", {
    id: dataId,
  });

  logger.info("[FastGPT] Data deleted:", { dataId });
}

/**
 * 知识库搜索测试
 * @param params 搜索参数
 * @returns 搜索结果列表
 */
export async function searchDataset(
  params: SearchTestParams
): Promise<SearchResultItem[]> {
  // FastGPT API 实际返回的是对象，包含 list 字段
  interface SearchResponse {
    list: SearchResultItem[];
    duration: string;
    searchMode: string;
    limit: number;
    similarity: number;
    usingReRank: boolean;
    usingSimilarityFilter: boolean;
  }

  const response = await fastgptClient.post<SearchResponse>(
    "/core/dataset/searchTest",
    {
      datasetId: params.datasetId,
      text: params.text,
      limit: params.limit || 5000,
      similarity: params.similarity || 0,
      searchMode: params.searchMode || "embedding",
      usingReRank: params.usingReRank || false,
      datasetSearchUsingExtensionQuery:
        params.datasetSearchUsingExtensionQuery || false,
      datasetSearchExtensionModel: params.datasetSearchExtensionModel,
      datasetSearchExtensionBg: params.datasetSearchExtensionBg,
    }
  );

  // 从 response.data.list 获取搜索结果
  const results = Array.isArray(response.data?.list) ? response.data.list : [];

  logger.info("[FastGPT] Dataset search:", {
    datasetId: params.datasetId,
    query: params.text,
    resultCount: results.length,
    duration: response.data?.duration,
  });

  return results;
}
