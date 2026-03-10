import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import logger from "@/helper/logger";
import { findPaperById, incrementDownloadCount } from "@/db/paper";
import fs from "fs";
import path from "path";
import { validateString } from "@/utils/validateString";

const handleDownload = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method !== "GET") {
    sendMethodNotAllowedResponse(res, "仅支持GET请求");
    return;
  }

  const { id } = req.query;
  const { preview = "false" } = req.query;

  // 参数校验
  const idResult = validateString(id, "论文 ID", { limitKey: "paper_id" });
  if (!idResult.valid) {
    sendWarnningResponse(res, idResult.error || "论文 ID 校验失败");
    return;
  }

  const paperId = id as string;
  const isPreview = preview === "true";

  logger.info("下载论文PDF", { id: paperId, isPreview });

  // 查询论文信息
  const paper = await findPaperById(paperId);

  if (!paper) {
    sendWarnningResponse(res, "论文不存在");
    return;
  }

  // 检查是否有PDF文件
  if (!paper.pdf_downloaded || !paper.pdf_file_path) {
    // 如果有PDF链接但未下载，返回链接让前端跳转
    if (paper.pdf_link) {
      res.status(302).setHeader("Location", paper.pdf_link);
      res.end();
      return;
    }

    sendWarnningResponse(res, "PDF文件不可用");
    return;
  }

  // 构建文件路径
  const filePath = path.join(process.cwd(), "public", paper.pdf_file_path);

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    logger.error("PDF文件不存在", { filePath, paperId });
    throw new Error("PDF文件不存在");
  }

  // 读取文件
  const fileBuffer = fs.readFileSync(filePath);

  // 设置响应头
  const fileName = `${paper.title.substring(0, 50)}.pdf`;
  const encodedFileName = encodeURIComponent(fileName);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Length", fileBuffer.length);

  if (isPreview) {
    // 预览模式
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodedFileName}"`
    );
  } else {
    // 下载模式
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${encodedFileName}"`
    );

    // 增加下载次数
    await incrementDownloadCount(paperId);
  }

  // 发送文件
  res.status(200).send(fileBuffer);

  logger.info("PDF下载成功", {
    id: paperId,
    title: paper.title,
    fileSize: fileBuffer.length,
    isPreview,
  });
};

export default withAuth(
  withErrorHandler(handleDownload, { logPrefix: "PDF下载", useLogger: true })
);
