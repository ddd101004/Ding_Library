import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getScholarPapers } from "@/service/aminer/scholar";
import { findScholarById, findScholarByAminerId } from "@/db/aminer/scholar";
import {
  batchUpsertScholarPapers,
  findScholarPapersPaginated,
  hasScholarPapersCache,
  markScholarPapersEmpty,
} from "@/db/aminer/scholarPaper";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateId } from "@/utils/validateString";

/**
 * GET - 获取学者论文列表（支持分页）
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
    console.log(`[Papers] 通过数据库UUID找到学者, aminerId: ${aminerId}`);
  } else {
    // 尝试通过AMiner ID查询
    const scholarByAminer = await findScholarByAminerId(id as string);
    if (scholarByAminer) {
      aminerId = scholarByAminer.source_id;
      console.log(`[Papers] 通过AMiner ID找到学者, aminerId: ${aminerId}`);
    } else {
      console.log(`[Papers] 未在数据库找到学者, 直接使用传入ID: ${id}`);
    }
  }

  console.log(`[Papers] 最终使用的 aminerId: ${aminerId}`);

  // 检查数据库是否有缓存
  const hasCache = await hasScholarPapersCache(aminerId);

  if (!hasCache) {
    // 没有缓存，从 AMiner API 获取并保存到数据库
    console.log(`[Papers] 无缓存，从 AMiner API 获取论文列表`);
    const papers = await getScholarPapers(aminerId);

    if (!papers || papers.length === 0) {
      // 标记已查询但无数据，避免重复调用 API
      await markScholarPapersEmpty(aminerId);
      console.log(`[Papers] 学者无论文数据，已标记空缓存`);

      return sendSuccessResponse(res, "暂无论文数据", {
        total: 0,
        page: pageNum,
        size: sizeNum,
        total_pages: 0,
        items: [],
      });
    }

    // 批量保存到数据库（不分页）
    await batchUpsertScholarPapers(aminerId, papers);
    console.log(`[Papers] 已缓存 ${papers.length} 篇论文到数据库`);
  }

  // 从数据库分页查询
  const { items, total } = await findScholarPapersPaginated(
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
    items: items.map((paper) => ({
      id: paper.id,
      paper_aminer_id: paper.paper_aminer_id,
      title: paper.title || "",
      title_zh: paper.title_zh || "",
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
    withErrorHandler(handler, { logPrefix: "学者论文列表" }),
    {
      monitorType: "external_api",
      apiProvider: "aminer",
      operationName: "getScholarPapers",
      extractMetadata: (req) => ({
        scholarId: req.query.id,
        page: req.query.page,
        size: req.query.size,
      }),
      successMetric: "scholar_papers_success",
      failureMetric: "scholar_papers_error",
    }
  )
);
