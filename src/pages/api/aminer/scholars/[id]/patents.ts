import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getScholarPatents } from "@/service/aminer/scholar";
import { findScholarById, findScholarByAminerId } from "@/db/aminer/scholar";
import {
  batchUpsertScholarPatents,
  findScholarPatentsPaginated,
  hasScholarPatentsCache,
  markScholarPatentsEmpty,
} from "@/db/aminer/scholarPatent";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateId } from "@/utils/validateString";

/**
 * GET - 获取学者专利列表（支持分页）
 *
 * Query 参数:
 * - page: 页码（默认 1）
 * - size: 每页数量（默认 10，最大 100）
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id, page, size } = req.query;

  // 参数校验
  const idResult = validateId(id, "学者 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "学者 ID 校验失败");
  }

  // 解析分页参数
  const pageNum = parsePageNumber(page);
  const sizeNum = parseLimitParam(size, 10);

  // 获取 AMiner ID (传入的可能是数据库UUID或AMiner ID)
  let aminerId = id as string;

  // 先尝试通过数据库UUID查询
  const scholar = await findScholarById(id as string);
  if (scholar) {
    aminerId = scholar.source_id;
    console.log(`[Patents] 通过数据库UUID找到学者, aminerId: ${aminerId}`);
  } else {
    // 尝试通过AMiner ID查询
    const scholarByAminer = await findScholarByAminerId(id as string);
    if (scholarByAminer) {
      aminerId = scholarByAminer.source_id;
      console.log(`[Patents] 通过AMiner ID找到学者, aminerId: ${aminerId}`);
    } else {
      console.log(`[Patents] 未在数据库找到学者, 直接使用传入ID: ${id}`);
    }
  }

  console.log(`[Patents] 最终使用的 aminerId: ${aminerId}`);

  // 检查数据库是否有缓存
  const hasCache = await hasScholarPatentsCache(aminerId);

  if (!hasCache) {
    // 没有缓存，从 AMiner API 获取并保存到数据库
    console.log(`[Patents] 无缓存，从 AMiner API 获取专利列表`);
    const patents = await getScholarPatents(aminerId);

    if (!patents || patents.length === 0) {
      // 标记已查询但无数据，避免重复调用 API
      await markScholarPatentsEmpty(aminerId);
      console.log(`[Patents] 学者无专利数据，已标记空缓存`);

      return sendSuccessResponse(res, "暂无专利数据", {
        total: 0,
        page: pageNum,
        size: sizeNum,
        total_pages: 0,
        items: [],
      });
    }

    // 批量保存到数据库（不分页）
    await batchUpsertScholarPatents(aminerId, patents);
    console.log(`[Patents] 已缓存 ${patents.length} 条专利到数据库`);
  }

  // 从数据库分页查询
  const { items, total } = await findScholarPatentsPaginated(
    aminerId,
    pageNum,
    sizeNum
  );

  const totalPages = Math.ceil(total / sizeNum);

  // 格式化返回数据
  const responseData = {
    total,
    page: pageNum,
    size: sizeNum,
    total_pages: totalPages,
    items: items.map((patent) => ({
      id: patent.id,
      patent_aminer_id: patent.patent_aminer_id,
      title: patent.title || "",
      title_zh: patent.title_zh || "",
    })),
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
    withErrorHandler(handler, { logPrefix: "学者专利列表" }),
    {
      monitorType: "external_api",
      apiProvider: "aminer",
      operationName: "getScholarPatents",
      extractMetadata: (req) => ({
        scholarId: req.query.id,
        page: req.query.page,
        size: req.query.size,
      }),
      successMetric: "scholar_patents_success",
      failureMetric: "scholar_patents_error",
    }
  )
);
