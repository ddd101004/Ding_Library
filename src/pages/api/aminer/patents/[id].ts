import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getWanfangPatentDetail } from "@/service/wanfang/patent";
import {
  findPatentBySourceId,
  findPatentById,
  upsertPatent,
} from "@/db/aminer/patent";
import { createBrowseHistory } from "@/db/aminer/browseHistory";
import { checkFavorite } from "@/db/aminer/favorite";
import { validateId } from "@/utils/validateString";

/**
 * 专利详情 API
 * GET /api/aminer/patents/:id
 *
 * 数据源已切换为万方
 */

/**
 * GET - 获取专利详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "专利 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "专利 ID 校验失败");
  }

  // 先尝试从数据库查询（通过数据库 UUID）
  let patent = await findPatentById(id as string);

  // 如果通过数据库 ID 未找到，尝试通过万方 ID 查询
  if (!patent) {
    patent = await findPatentBySourceId("wanfang", id as string);
  }

  // 如果数据库中不存在，调用万方 API
  if (!patent) {
    console.log(`专利不在数据库中，调用万方 API 获取: ${id}`);

    const wanfangPatent = await getWanfangPatentDetail(id as string);

    if (!wanfangPatent) {
      return sendWarnningResponse(res, "未找到该专利");
    }

    // 存入数据库
    patent = await upsertPatent({
      source_id: wanfangPatent.id,
      title: wanfangPatent.title || "",
      title_zh: wanfangPatent.title,
      title_en: wanfangPatent.title_en,
      abstract: wanfangPatent.abstract,
      year: wanfangPatent.year,
      app_num: wanfangPatent.app_num,
      pub_num: wanfangPatent.pub_num,
      country: wanfangPatent.country,
      inventors: wanfangPatent.creators || [],
      ipc: wanfangPatent.ipc,
      app_date: wanfangPatent.app_date,
      pub_date: wanfangPatent.pub_date,
    }, "wanfang");
  }

  // 检查收藏状态
  const isFavorited = await checkFavorite({
    user_id: userId,
    favorite_type: "patent",
    patent_id: patent.id,
  });

  // 记录浏览历史
  await createBrowseHistory({
    user_id: userId,
    browse_type: "patent",
    patent_id: patent.id,
  }).catch((err) => console.error("记录浏览历史失败:", err));

  // 格式化返回数据
  const responseData = {
    id: patent.id,
    title: patent.title,
    year: patent.year,
    abstract: patent.abstract,
    preview_url: patent.preview_url,
    download_url: patent.download_url,
    isFavorited,
  };

  return sendSuccessResponse(res, "获取成功", responseData);
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET请求");
  }
};

export default withAuth(
  withAuthMonitoring(
    withErrorHandler(handler, { logPrefix: "专利详情" }),
    {
      monitorType: "external_api",
      apiProvider: "wanfang",
      operationName: "getPatentDetail",
      extractMetadata: (req) => ({
        patentId: req.query.id,
      }),
      successMetric: "patent_detail_success",
      failureMetric: "patent_detail_error",
    }
  )
);
