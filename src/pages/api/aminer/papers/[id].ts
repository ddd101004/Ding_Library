import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { getPaperDetail } from "@/service/aminer/paper";
import {
  findPaperByAminerId,
  findPaperById,
  upsertPaper,
} from "@/db/aminer/paper";
import { updatePaper } from "@/db/paper";
import { retrieve } from "@/service/ebsco/retrieve";
import { mapEbscoRecordToItem } from "@/utils/ebscoDataMapper";
import { createBrowseHistory } from "@/db/aminer/browseHistory";
import { checkFavorite } from "@/db/aminer/favorite";
import logger from "@/helper/logger";
import { validateId } from "@/utils/validateString";

/**
 * 论文详情 API
 * GET /api/aminer/papers/:id
 */
/**
 * GET - 获取论文详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

    // 参数校验
    const idResult = validateId(id, "论文 ID");
    if (!idResult.valid) {
      return sendWarnningResponse(res, idResult.error || "论文 ID 校验失败");
    }

    // 先尝试从数据库查询
    let paper = await findPaperById(id as string);

    // 如果通过数据库ID未找到,尝试通过AMiner ID查询
    if (!paper) {
      paper = await findPaperByAminerId(id as string);
    }

    // 如果数据库中不存在,调用 AMiner API
    if (!paper) {
      logger.info("论文不在数据库中，调用 AMiner API 获取", { paperId: id });
      const aminerPaper = await getPaperDetail(id as string);

      if (!aminerPaper) {
        return sendWarnningResponse(res, "未找到该论文");
      }

      // 存入数据库
      paper = await upsertPaper({
        aminer_id: aminerPaper.id,
        title: aminerPaper.title,
        title_zh: aminerPaper.title_zh,
        abstract: aminerPaper.abstract,
        abstract_zh: aminerPaper.abstract_zh,
        doi: aminerPaper.doi,
        year: aminerPaper.year,
        language: aminerPaper.title_zh ? "zh" : "en",
        keywords: aminerPaper.keywords,
        keywords_zh: aminerPaper.keywords_zh,
        venue: aminerPaper.venue,
        authors: aminerPaper.authors,
        issn: aminerPaper.issn,
        issue: aminerPaper.issue,
        volume: aminerPaper.volume,
        n_citation: aminerPaper.n_citation || 0,
      });
    }

    // 如果是 EBSCO 论文且摘要为空，尝试从 EBSCO API 获取详情
    if (paper.source === "ebsco" && !paper.abstract && paper.db_id && paper.source_id) {
      try {
        logger.info("EBSCO 论文摘要为空，调用 retrieve API 获取详情", {
          paperId: paper.id,
          dbId: paper.db_id,
          an: paper.source_id,
        });

        const ebscoDetail = await retrieve(paper.db_id, paper.source_id, false);
        if (ebscoDetail?.Record) {
          const mappedData = mapEbscoRecordToItem(ebscoDetail.Record);
          
          // 更新数据库中的摘要和其他字段
          if (mappedData.abstract) {
            const updated = await updatePaper(paper.id, {
              abstract: mappedData.abstract,
              keywords: Array.isArray(mappedData.keywords) ? mappedData.keywords : undefined,
              doi: mappedData.doi || undefined,
            });
            
            if (updated) {
              paper = updated;
              logger.info("EBSCO 论文详情已更新", { paperId: paper.id });
            }
          }
        }
      } catch (error) {
        logger.warn("获取 EBSCO 论文详情失败，使用已有数据", {
          paperId: paper.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }

    // 检查收藏状态（userId 来自鉴权中间件）
    const isFavorited = await checkFavorite({
      user_id: userId,
      favorite_type: "paper",
      paper_id: paper.id, // 使用数据库UUID
    });

    // 记录浏览历史
    await createBrowseHistory({
      user_id: userId,
      browse_type: "paper",
      paper_id: paper.id, // 使用数据库UUID
    }).catch((err) =>
      logger.error("记录浏览历史失败", {
        error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
      })
    );

    // 格式化返回数据（只返回前端需要的字段）
    const responseData = {
      id: paper.id,
      source: paper.source, // 数据来源: aminer, ebsco, wanfang, wanfang_en
      source_id: paper.source_id, // 来源系统的唯一ID
      title: paper.title,
      title_zh: paper.title_zh,
      abstract: paper.abstract,
      abstract_zh: paper.abstract_zh,
      year: paper.publication_year,
      n_citation: paper.n_citation || 0,
      // 期刊/出版物名称：优先使用 venue，其次使用 publication_name
      venue: paper.venue || paper.publication_name,
      authors: paper.authors,
      language: paper.language,
      // 论文链接：优先使用 plink（EBSCO），其次使用 doi 构造链接
      url: paper.plink || (paper.doi ? `https://doi.org/${paper.doi}` : null),
      isFavorited,
      // 判断是否为外文发现：检查 title 是否包含英文字母且 title_zh 为中文
      isForeignDiscovery: paper.source === "wanfang" &&
        /[\u4e00-\u9fa5]/.test(paper.title_zh || "") &&
        !/[\u4e00-\u9fa5]/.test(paper.title || ""),
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
    withErrorHandler(handler, { logPrefix: "论文详情" }),
    {
      monitorType: "external_api",
      apiProvider: "aminer",
      operationName: "getPaperDetail",
      extractMetadata: (req) => ({
        paperId: req.query.id,
      }),
      successMetric: "paper_detail_success",
      failureMetric: "paper_detail_error",
    }
  )
);
