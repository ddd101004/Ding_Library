/**
 * FastGPT 调试 API
 * 用于诊断 FastGPT 数据同步问题
 *
 * GET /api/admin/fastgpt-debug - 获取公共数据集下的子数据集列表
 * GET /api/admin/fastgpt-debug?datasetId=xxx - 获取指定数据集的详情
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
  sendErrorResponse,
} from "@/helper/responseHelper";
import { listDatasets, getDatasetDetail } from "@/service/fastgpt/dataset";
import { listCollections } from "@/service/fastgpt/collection";

const FASTGPT_PUBLIC_DATASET_ID = process.env.FASTGPT_PUBLIC_DATASET_ID || "";

const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  _userId: string
) => {
  const { datasetId, action } = req.query;

  // 获取指定数据集的详情
  if (datasetId && typeof datasetId === "string") {
    const detail = await getDatasetDetail(datasetId);
    const collections = await listCollections({
      datasetId,
      pageSize: 100,
    });

    return sendSuccessResponse(res, "获取数据集详情成功", {
      dataset: detail,
      collections: collections.list,
      collectionsTotal: collections.total,
    });
  }

  // 列出公共数据集下的所有子数据集（论文文件夹）
  if (action === "list-folders") {
    if (!FASTGPT_PUBLIC_DATASET_ID) {
      return sendErrorResponse(res, "FASTGPT_PUBLIC_DATASET_ID 未配置");
    }

    const folders = await listDatasets({
      parentId: FASTGPT_PUBLIC_DATASET_ID,
    });

    return sendSuccessResponse(res, "获取论文文件夹列表成功", {
      publicDatasetId: FASTGPT_PUBLIC_DATASET_ID,
      foldersCount: folders.length,
      folders: folders.slice(0, 20).map((f) => ({
        id: f._id,
        name: f.name,
        intro: f.intro,
        type: f.type,
        vectorModel: f.vectorModel,
      })),
    });
  }

  // 获取公共数据集本身的详情
  if (!FASTGPT_PUBLIC_DATASET_ID) {
    return sendErrorResponse(res, "FASTGPT_PUBLIC_DATASET_ID 未配置");
  }

  const publicDataset = await getDatasetDetail(FASTGPT_PUBLIC_DATASET_ID);
  const childDatasets = await listDatasets({
    parentId: FASTGPT_PUBLIC_DATASET_ID,
  });

  return sendSuccessResponse(res, "FastGPT 配置诊断", {
    config: {
      publicDatasetId: FASTGPT_PUBLIC_DATASET_ID,
      baseUrl: process.env.FASTGPT_BASE_URL,
      vectorModel: process.env.LLM_VECTOR_MODEL,
      agentModel: process.env.LLM_MODEL,
    },
    publicDataset: publicDataset
      ? {
          id: publicDataset._id,
          name: publicDataset.name,
          intro: publicDataset.intro,
          type: publicDataset.type,
          vectorModel: publicDataset.vectorModel,
        }
      : null,
    childDatasetsCount: childDatasets.length,
    recentFolders: childDatasets.slice(0, 10).map((d) => ({
      id: d._id,
      name: d.name?.substring(0, 50),
      intro: d.intro,
      type: d.type,
    })),
  });
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  try {
    if (req.method === "GET") {
      return await handleGet(req, res, userId);
    } else {
      return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return sendErrorResponse(res, `FastGPT 诊断失败: ${errorMessage}`);
  }
};

export default withAuth(handler);
