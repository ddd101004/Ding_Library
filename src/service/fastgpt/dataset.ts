/**
 * FastGPT 知识库服务
 * 封装知识库 CRUD 操作
 *
 * 重要说明：
 * - Dataset（type: folder）用于创建论文文件夹
 * - Collection 用于在论文文件夹内创建元数据和全文
 * - intro 字段用于存储 sourceId 以支持搜索去重
 */

import { fastgptClient } from "./client";
import type {
  CreateDatasetParams,
  CreateDatasetResult,
  DatasetInfo,
  DatasetListItem,
  ListDatasetsParams,
} from "@/type/fastgpt";
import logger from "@/helper/logger";

/**
 * 创建知识库
 * @param params 创建参数
 * @returns 知识库ID
 */
export async function createDataset(
  params: CreateDatasetParams
): Promise<string> {
  const requestBody = {
    parentId: params.parentId ?? null,
    type: params.type || "dataset",
    name: params.name,
    intro: params.intro || "",
    avatar: params.avatar || "",
  };

  const response = await fastgptClient.post<CreateDatasetResult>(
    "/core/dataset/create",
    requestBody
  );

  // FastGPT API 返回格式兼容处理：
  // 1. data 可能直接是字符串（知识库 ID）
  // 2. data 可能是对象 { id: "xxx" } 或 { _id: "xxx" }
  let datasetId = "";
  if (typeof response.data === "string") {
    datasetId = response.data;
  } else if (response.data) {
    datasetId =
      response.data.id ||
      (response.data as unknown as { _id?: string })?._id ||
      "";
  }

  if (!datasetId) {
    logger.error("[FastGPT] Dataset creation returned empty ID", {
      response: response.data,
      params: requestBody,
    });
    throw new Error("FastGPT 创建知识库失败：返回 ID 为空");
  }

  logger.info("[FastGPT] Dataset created:", {
    name: params.name,
    id: datasetId,
  });

  return datasetId;
}

/**
 * 获取知识库列表
 * 支持通过 searchKey 搜索 name 和 intro 字段
 *
 * @param params 查询参数，支持 parentId、type、searchKey
 * @returns 知识库列表
 */
export async function listDatasets(
  params?: ListDatasetsParams
): Promise<DatasetListItem[]> {
  const response = await fastgptClient.post<DatasetListItem[]>(
    "/core/dataset/list",
    {
      parentId: params?.parentId ?? "",
      type: params?.type,
      searchKey: params?.searchKey || "",
    }
  );

  return response.data || [];
}

/**
 * 获取知识库详情
 * @param datasetId 知识库ID
 * @returns 知识库详情
 */
export async function getDatasetDetail(
  datasetId: string
): Promise<DatasetInfo | null> {
  const response = await fastgptClient.get<DatasetInfo>(
    "/core/dataset/detail",
    {
      id: datasetId,
    }
  );

  return response.data || null;
}

/**
 * 更新知识库
 * @param datasetId 知识库ID
 * @param params 更新参数
 */
export async function updateDataset(
  datasetId: string,
  params: Partial<Pick<DatasetInfo, "name" | "intro" | "avatar">>
): Promise<void> {
  await fastgptClient.put("/core/dataset/update", {
    id: datasetId,
    ...params,
  });

  logger.info("[FastGPT] Dataset updated:", { datasetId, params });
}

/**
 * 删除知识库
 * @param datasetId 知识库ID
 */
export async function deleteDataset(datasetId: string): Promise<void> {
  await fastgptClient.delete("/core/dataset/delete", {
    id: datasetId,
  });

  logger.info("[FastGPT] Dataset deleted:", { datasetId });
}

/**
 * 在指定父级下查找具有特定 intro 的文件夹
 *
 * 用于论文去重：通过 searchKey 搜索 intro 字段中的 sourceId
 *
 * @param parentId 父级 ID（公共数据集 ID）
 * @param sourceId 论文来源 ID（存储在 intro 字段）
 * @returns 找到的文件夹 ID，如果不存在则返回 null
 */
export async function findDatasetByIntro(
  parentId: string,
  sourceId: string
): Promise<string | null> {
  try {
    const datasets = await listDatasets({
      parentId,
      searchKey: sourceId,
    });

    if (!datasets || datasets.length === 0) {
      return null;
    }

    // 遍历搜索结果，通过 intro 字段精确匹配
    for (const dataset of datasets) {
      if (dataset.intro === sourceId) {
        logger.info("[FastGPT] Found existing paper folder by intro:", {
          folderId: dataset._id,
          sourceId,
          name: dataset.name,
        });
        return dataset._id;
      }
    }

    return null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn("[FastGPT] Failed to find dataset by intro:", {
      parentId,
      sourceId,
      error: errorMessage,
    });
    return null;
  }
}
