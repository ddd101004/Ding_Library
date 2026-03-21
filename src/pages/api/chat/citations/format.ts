import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { formatCitation } from "@/db/messageCitation";
import { findPaperById } from "@/db/paper";
import { validateId, validateString } from "@/utils/validateString";

/**
 * GET - 格式化引用
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { paper_id, format } = req.query;

  // 参数校验
  const paperIdResult = validateId(paper_id, "论文 ID");
  if (!paperIdResult.valid) {
    return sendWarnningResponse(res, paperIdResult.error || "论文 ID 校验失败");
  }

  // 格式校验
  if (format) {
    const formatResult = validateString(format, "格式", { limitKey: "citation_format" });
    if (!formatResult.valid) {
      return sendWarnningResponse(res, formatResult.error || "格式校验失败");
    }
  }

  // 获取论文信息
  const paper = await findPaperById(paper_id as string);

  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }

  const formatType = (format as string) || "APA";

  // 转换authors为string格式（formatCitation函数需要JSON字符串）
  const paperForFormat = {
    title: paper.title,
    title_zh: paper.title_zh,
    authors: paper.authors ? JSON.stringify(paper.authors) : null,
    publication_name: paper.publication_name,
    publication_year: paper.publication_year,
    doi: paper.doi,
    volume: paper.volume,
    issue: paper.issue,
    start_page: paper.start_page,
    page_count: paper.page_count,
  };

  // 格式化引用（APA格式）
  const formatted_text = formatCitation(paperForFormat, formatType);

  // 生成其他格式用于下载
  const download_formats = {
    bibtex: formatCitation(paperForFormat, "BIBTEX"),
    ris: formatCitation(paperForFormat, "RIS"),
  };

  return sendSuccessResponse(res, "格式化成功", {
    format: formatType,
    formatted_text,
    download_formats,
  });
};

/**
 * 引用格式化 API
 */
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
  withErrorHandler(handler, { logPrefix: "引用格式化" })
);
