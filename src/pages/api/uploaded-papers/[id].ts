/**
 * 用户上传论文详情 API
 *
 * GET /api/uploaded-papers/:id - 获取单个用户上传的论文详情
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import prisma from "@/utils/prismaProxy";

/**
 * GET - 获取用户上传论文详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  id: string
) => {
  try {
    // 查询用户上传的论文
    const paper = await prisma.userUploadedPaper.findFirst({
      where: {
        id,
        userId: userId,
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        fileName: true,
        fileSize: true,
        fileType: true,
        mimeType: true,
        parseStatus: true,
        parsedContent: true,
        createTime: true,
        updateTime: true,
      },
    });

    if (!paper) {
      return sendWarnningResponse(res, "论文不存在或无权访问");
    }

    // 转换为统一格式
    const transformedPaper = {
      id: paper.id,
      title: paper.title,
      source: "uploaded",
      file_path: paper.filePath,
      file_name: paper.fileName,
      file_size: Number(paper.fileSize),
      file_type: paper.fileType,
      mime_type: paper.mimeType,
      parse_status: paper.parseStatus,
      parsed_content: paper.parsedContent,
      created_at: paper.createTime,
      updated_at: paper.updateTime,
      hasFulltext: !!paper.parsedContent,
    };

    return sendSuccessResponse(res, "获取成功", transformedPaper);
  } catch (error: any) {
    console.error("获取用户上传论文详情失败:", error);
    throw error;
  }
};

/**
 * 用户上传论文详情 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  if (!id || typeof id !== "string") {
    return sendWarnningResponse(res, "论文ID不能为空");
  }

  if (req.method === "GET") {
    return await handleGet(req, res, userId, id);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 GET 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "用户上传论文详情" })
);
