import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getScholarDetail, getScholarFigure } from "@/service/aminer/scholar";
import {
  findScholarByAminerId,
  findScholarById,
  upsertScholar,
} from "@/db/aminer/scholar";
import { createBrowseHistory } from "@/db/aminer/browseHistory";
import { checkFavorite } from "@/db/aminer/favorite";
import { validateId } from "@/utils/validateString";

/**
 * 学者详情 API
 * GET /api/aminer/scholars/:id
 *
 * 默认获取完整信息(包含结构化教育/工作经历)
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "学者 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "学者 ID 校验失败");
  }

  // 先尝试从数据库查询
  let scholar = await findScholarById(id as string);

  // 如果通过数据库ID未找到,尝试通过AMiner ID查询
  if (!scholar) {
    scholar = await findScholarByAminerId(id as string);
  }

  // 检查是否需要从 AMiner API 获取/更新数据
  // 条件: 数据库中不存在 或 关键字段(bio/position)为空
  const needFetchFromApi = !scholar || (!scholar.bio && !scholar.position);

  if (needFetchFromApi) {
    const aminerId = scholar?.source_id || (id as string);
    console.log(`调用 AMiner API 获取学者详情: ${aminerId}`);
    const aminerScholar = await getScholarDetail(aminerId);

    if (!aminerScholar) {
      if (!scholar) {
        return sendWarnningResponse(res, "未找到该学者");
      }
      // 如果有缓存数据但API调用失败,继续使用缓存
    } else {
      // 存入/更新数据库
      scholar = await upsertScholar({
        aminer_id: aminerScholar.id,
        name: aminerScholar.name,
        name_zh: aminerScholar.name_zh,
        orgs: aminerScholar.orgs || [],
        org_zhs: aminerScholar.org_zhs || [],
        position: aminerScholar.position,
        position_zh: aminerScholar.position_zh,
        bio: aminerScholar.bio,
        bio_zh: aminerScholar.bio_zh,
        edu: aminerScholar.edu,
        edu_zh: aminerScholar.edu_zh,
        interests: aminerScholar.interests || [],
        honor: aminerScholar.honor || [],
        n_citation: aminerScholar.n_citation || 0,
      });
    }
  }

  // 确保 scholar 存在
  if (!scholar) {
    return sendWarnningResponse(res, "未找到该学者");
  }

  // 默认获取完整详情,如果数据库中没有结构化数据则调用学者画像接口
  if (!scholar.edus) {
    try {
      const figureData = await getScholarFigure(scholar.source_id);

      if (figureData) {
        // 更新数据库,补充结构化数据
        scholar = await upsertScholar({
          aminer_id: scholar.source_id,
          name: scholar.name,
          name_zh: scholar.name_zh,
          orgs: scholar.orgs || [],
          org_zhs: scholar.org_zhs || [],
          position: scholar.position,
          position_zh: scholar.position_zh,
          bio: scholar.bio,
          bio_zh: scholar.bio_zh,
          edu: scholar.edu,
          edu_zh: scholar.edu_zh,
          interests: scholar.interests || [],
          honor: scholar.honor || [],
          n_citation: scholar.n_citation || 0,
          // 学者画像结构化数据
          edus: figureData.edus || [],
          works: figureData.works || [],
          ai_domain: figureData.ai_domain || [],
          ai_interests: figureData.ai_interests || [],
        });
      }
    } catch (err) {
      console.error("获取学者画像失败:", err);
      // 降级:继续使用基础信息
    }
  }

  // 检查收藏状态（userId 来自鉴权中间件）
  const isFavorited = await checkFavorite({
    user_id: userId,
    favorite_type: "scholar",
    scholar_id: scholar.id,
  });

  // 记录浏览历史
  await createBrowseHistory({
    user_id: userId,
    browse_type: "scholar",
    scholar_id: scholar.id,
  }).catch((err) => console.error("记录浏览历史失败:", err));

  // 格式化返回数据(null 转为空字符串/空数组)
  const responseData = {
    id: scholar.id,
    aminer_id: scholar.source_id || "",
    name: scholar.name || "",
    name_zh: scholar.name_zh || "",
    orgs: scholar.orgs || [],
    org_zhs: scholar.org_zhs || [],
    position: scholar.position || "",
    position_zh: scholar.position_zh || "",
    bio: scholar.bio || "",
    bio_zh: scholar.bio_zh || "",
    edu: scholar.edu || "",
    edu_zh: scholar.edu_zh || "",
    // 学者画像结构化数据
    edus: scholar.edus || [],
    works: scholar.works || [],
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
    withErrorHandler(handler, { logPrefix: "学者详情" }),
    {
      monitorType: "external_api",
      apiProvider: "aminer",
      operationName: "getScholarDetail",
      extractMetadata: (req) => ({
        scholarId: req.query.id,
      }),
      successMetric: "scholar_detail_success",
      failureMetric: "scholar_detail_error",
    }
  )
);
