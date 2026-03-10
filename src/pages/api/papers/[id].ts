import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import logger from "@/helper/logger";
import { retrieve } from "@/service/ebsco";
import {
  findPaperById,
  findPaperByEbscoId,
  incrementViewCount,
} from "@/db/paper";
import { validateString } from "@/utils/validateString";

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
  const { includeFulltext = "false", source = "auto" } = req.query;

  // 参数校验
  const idResult = validateString(id, "论文 ID", { limitKey: "paper_id" });
  if (!idResult.valid) {
    sendWarnningResponse(res, idResult.error || "论文 ID 校验失败");
    return;
  }

  const paperId = id as string;

  // 是否包含全文内容
  const needFulltext = includeFulltext === "true";

  logger.info("获取论文详情", {
    id: paperId,
    includeFulltext: needFulltext,
    source,
    userId,
  });

  let paper = null;
  let fromLocal = false;

  // 先尝试从本地数据库查询
  if (source === "auto" || source === "local") {
    // 判断ID类型：UUID或 dbId:an 格式
    if (paperId.includes(":")) {
      // dbId:an 格式
      const [dbId, an] = paperId.split(":");
      paper = await findPaperByEbscoId(dbId, an);
    } else {
      // UUID格式
      paper = await findPaperById(paperId);
    }

    if (paper) {
      fromLocal = true;
      logger.info("从本地数据库获取论文详情", { id: paperId, paperId: paper.id });

      // 增加查看次数
      await incrementViewCount(paper.id);

      // 格式化返回数据
      const result: Record<string, unknown> = {
        id: paper.id,
        dbId: paper.db_id,
        an: paper.an,
        title: paper.title,
        titleFull: paper.title_full,
        subtitle: paper.subtitle,
        authors: paper.authors || [],
        authorsFull: paper.authors_full || null,
        publicationName: paper.publication_name,
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
        abstract: paper.abstract,
        abstractFull: paper.abstract_full,
        subjects: paper.subjects || [],
        keywords: paper.keywords || [],
        language: paper.language,
        documentType: paper.document_type,
        sourceType: paper.source_type,
        contentType: paper.content_type,
        hasFulltext: paper.has_fulltext,
        fulltextAvailability: paper.fulltext_availability,
        fulltextLink: paper.fulltext_link,
        pdfLink: paper.pdf_link,
        pdfDownloaded: paper.pdf_downloaded,
        pdfFilePath: paper.pdf_file_path,
        pdfFileSize: paper.pdf_file_size?.toString(),
        plink: paper.plink,
        customLinks: paper.custom_links
          ? JSON.parse(paper.custom_links)
          : [],
        relevancyScore: paper.relevancy_score,
        viewCount: paper.view_count,
        downloadCount: paper.download_count,
        syncTime: paper.sync_time,
        source: "local",
      };

      // 如果需要全文且本地没有，则从EBSCO获取
      if (needFulltext && !paper.abstract_full && paper.has_fulltext && paper.db_id && paper.an) {
        try {
          logger.info("从EBSCO获取完整全文", {
            dbId: paper.db_id,
            an: paper.an,
          });
          const ebscoData = await retrieve(paper.db_id, paper.an, false);
          result.fullText = ebscoData.Record?.FullText?.Text?.Value || null;
          result.recordInfo = ebscoData.Record?.RecordInfo || null;
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "未知错误";
          logger.warn("从EBSCO获取全文失败", { error: errorMessage });
        }
      }

      sendSuccessResponse(res, "获取论文详情成功", result);
      return;
    }
  }

  // 如果本地没有且允许从EBSCO获取
  if (!fromLocal && (source === "auto" || source === "ebsco")) {
    // 解析ID为 dbId:an 格式
    if (!paperId.includes(":")) {
      sendWarnningResponse(res, "从EBSCO获取时需要提供 dbId:an 格式的ID");
      return;
    }

    const [dbId, an] = paperId.split(":");

    logger.info("从EBSCO API获取论文详情", { dbId, an });

    const ebscoData = await retrieve(dbId, an, true);

    if (!ebscoData || !ebscoData.Record) {
      throw new Error("从EBSCO获取论文详情失败");
    }

    const record = ebscoData.Record;

    // 提取并格式化数据
    const getItemData = (label: string) =>
      record.Items?.find((item) => item.Label === label)?.Data || "";

    const getItemsByGroup = (group: string) =>
      record.Items?.filter((item) => item.Group === group).map(
        (item) => item.Data
      ) || [];

    const result = {
      dbId: record.Header.DbId,
      dbLabel: record.Header.DbLabel,
      an: record.Header.An,
      title: getItemData("Title"),
      authors: getItemsByGroup("Au"),
      publicationName: getItemData("Source"),
      publicationType: record.Header.PubType,
      abstract: getItemsByGroup("Ab").join("\n"),
      subjects: getItemsByGroup("Su"),
      language: getItemData("Language"),
      documentType: getItemData("Document Type"),
      issn: getItemData("ISSN"),
      doi: getItemData("DOI"),
      hasFulltext: record.FullText?.Text?.Availability === 1,
      fulltextLink: record.FullText?.Links?.[0]?.Url,
      fullText: needFulltext ? record.FullText?.Text?.Value : null,
      plink: record.PLink,
      customLinks: record.CustomLinks || [],
      relevancyScore: record.Header.RelevancyScore,
      items: record.Items,
      recordInfo: record.RecordInfo,
      source: "ebsco",
    };

    sendSuccessResponse(res, "获取论文详情成功", result);
    return;
  }

  sendWarnningResponse(res, "未找到论文");
};

export default withAuth(
  withErrorHandler(handleGet, { logPrefix: "论文详情", useLogger: true })
);
