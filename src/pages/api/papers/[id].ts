import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import logger from "@/helper/logger";
import { findPaperById } from "@/db/paper";
import { validateString } from "@/utils/validateString";

/**
 * 获取论文详情
 * GET /api/papers/:id
 *
 * @requires Authentication - 需要用户登录
 * @param id - 论文ID
 * @param includeFulltext - 是否包含完整全文（默认false）
 * @returns 论文详细信息
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method !== "GET") {
    sendMethodNotAllowedResponse(res, "仅支持GET请求");
    return;
  }

  const { id } = req.query;
  const { includeFulltext = "false" } = req.query;

  // 参数校验
  const idResult = validateString(id, "论文ID", { limitKey: "paper_id" });
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "论文ID校验失败");
  }

  const paperId = id as string;

  // 是否包含全文内容
  const needFulltext = includeFulltext === "true";

  logger.info("获取论文详情", {
    id: paperId,
    includeFulltext: needFulltext,
    userId,
  });

  // 从本地数据库查询
  const paper = await findPaperById(paperId);

  if (!paper) {
    logger.warn("论文不存在", { paperId });
    return sendWarnningResponse(res, "论文不存在");
  }

  logger.info("从本地数据库获取论文详情", {
    id: paperId,
    paperId: paper.id,
  });

  // 根据语言决定标题和摘要的优先级
  // 中文论文优先显示中文，英文论文优先显示英文
  const isChinese = paper.language === 'zh';
  const displayTitle = isChinese && paper.title_zh ? paper.title_zh : paper.title;
  const displayAbstract = isChinese && paper.abstract_zh ? paper.abstract_zh : paper.abstract;

  // 检查 venue 是否是对象且有 raw_zh 属性
  const venue = paper.venue as Record<string, unknown> | null;
  const displayPublicationName = isChinese && venue?.raw_zh
    ? (venue.raw_zh as string)
    : paper.publication_name;

  // 格式化返回数据
  const result: Record<string, unknown> = {
    id: paper.id,
    title: displayTitle,
    title_zh: paper.title_zh,
    title_full: paper.title_full,
    subtitle: paper.subtitle,
    authors: paper.authors || [],
    authors_full: paper.authors_full || null,
    publicationName: displayPublicationName,
    publicationType: paper.publication_type,
    publisher: paper.publisher,
    publicationDate: paper.publication_date,
    publicationYear: paper.publication_year,
    volume: paper.volume,
    issue: paper.issue,
    startPage: paper.start_page,
    pageCount: paper.page_count,
    issn: paper.issn,
    isbn: paper.isbn,
    doi: paper.doi,
    abstract: displayAbstract,
    abstract_zh: paper.abstract_zh,
    abstract_full: paper.abstract_full,
    subjects: paper.subjects || [],
    keywords: paper.keywords || [],
    language: paper.language,
    documentType: paper.document_type,
    sourceType: paper.source_type,
    contentType: paper.content_type,
    hasFulltext: paper.has_fulltext,
    fulltextAvailability: paper.fulltext_availability,
    fulltextLink: paper.fulltext_link,
    syncTime: paper.sync_time,
    source: paper.source || "wanfang",
  };

  sendSuccessResponse(res, "获取论文详情成功", result);
};

export default withAuth(
  withErrorHandler(handleGet, { logPrefix: "论文详情", useLogger: true })
);
