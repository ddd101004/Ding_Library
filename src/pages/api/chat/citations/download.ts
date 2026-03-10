import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { formatCitation } from "@/db/messageCitation";
import { findPaperById } from "@/db/aminer/paper";
import { validateId, validateString } from "@/utils/validateString";

/**
 * GET - 下载引用文件
 * 支持格式：BibTeX (.bib), RIS (.ris)
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

  const formatType = (format as string)?.toUpperCase() || "BIBTEX";

  // 只支持 BibTeX 和 RIS 格式下载
  if (!["BIBTEX", "RIS"].includes(formatType)) {
    return sendWarnningResponse(res, "不支持的下载格式，仅支持 BIBTEX 和 RIS");
  }

  // 获取论文信息
  const paper = await findPaperById(paper_id as string);

  if (!paper) {
    return sendWarnningResponse(res, "论文不存在");
  }

  // 转换authors为string格式（formatCitation函数需要JSON字符串）
  const paperForFormat = {
    title: paper.title,
    authors: paper.authors ? JSON.stringify(paper.authors) : null,
    publication_name: paper.publication_name,
    publication_year: paper.publication_year,
    doi: paper.doi,
    volume: paper.volume,
    issue: paper.issue,
    start_page: paper.start_page,
  };

  // 格式化引用
  const content = formatCitation(paperForFormat, formatType);

  // 生成文件名（使用第一作者 + 年份）
  let firstAuthor = "Unknown";
  if (paper.authors) {
    try {
      const authorsArray =
        typeof paper.authors === "string"
          ? JSON.parse(paper.authors)
          : paper.authors;
      if (Array.isArray(authorsArray) && authorsArray.length > 0) {
        firstAuthor = authorsArray[0]
          .replace(/[^a-zA-Z0-9]/g, "")
          .slice(0, 20);
      }
    } catch (e) {
      // 解析失败，使用默认值
    }
  }

  const year = paper.publication_year || "unknown";
  const extension = formatType === "BIBTEX" ? "bib" : "ris";
  const filename = `${firstAuthor}${year}.${extension}`;

  // 设置响应头，触发下载
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");

  // TODO: 后台记录引用统计（可选）
  // await recordCitationUsage({ user_id: userId, paper_id, format: formatType });

  // 返回文件内容
  return res.status(200).send(content);
};

/**
 * 引用文件下载 API
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
  withErrorHandler(handler, { logPrefix: "引用文件下载" })
);
