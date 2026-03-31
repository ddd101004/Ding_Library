/**
 * 用户上传论文管理 API
 *
 * POST /api/uploaded-papers - 上传论文文件
 */

import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import formidable from "formidable";
import { promises as fs } from "fs";
import path from "path";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import prisma from "@/utils/prismaProxy";
import { validateString, validateId } from "@/utils/validateString";
import { triggerFileParsing } from "@/service/parser/fileParser";

// 禁用 Next.js 的默认 body parser，以便处理文件上传
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * POST - 上传论文文件
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  // 解析表单数据
  const form = formidable({
    uploadDir: path.join(process.cwd(), "public", "uploads", "papers"),
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    filename: (name, ext, part) => {
      // 生成唯一文件名
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      return `${timestamp}_${randomStr}${ext}`;
    },
  });

  try {
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];
    const title = fields.title?.[0] || file?.originalFilename || "未命名论文";

    if (!file) {
      return sendWarnningResponse(res, "请选择要上传的文件");
    }

    // 验证文件类型
    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
      "text/plain",
    ];

    if (!allowedTypes.includes(file.mimetype || "")) {
      // 删除已上传的文件
      if (file.filepath) {
        await fs.unlink(file.filepath);
      }
      return sendWarnningResponse(res, "不支持的文件类型，仅支持 PDF、DOCX、TXT 格式");
    }

    // 提取文件扩展名
    const fileExt = path.extname(file.originalFilename || "").substring(1);
    const fileType = fileExt.toLowerCase();

    // 构建相对路径（用于数据库存储）
    const relativeFilePath = path.join("papers", path.basename(file.filepath));

    // 创建用户上传论文记录
    const paper = await prisma.userUploadedPaper.create({
      data: {
        userId: userId,
        title: title,
        fileName: file.originalFilename || "unknown",
        fileSize: BigInt(file.size),
        fileType: fileType,
        mimeType: file.mimetype || "application/octet-stream",
        filePath: relativeFilePath,
        parseStatus: "pending",
      },
    });

    // 异步触发文件解析（不阻塞响应）
    setImmediate(async () => {
      try {
        await triggerFileParsing(paper.id);
      } catch (error) {
        console.error("文件解析触发失败:", error);
      }
    });

    return sendSuccessResponse(res, "上传成功", {
      id: paper.id,
      title: paper.title,
      file_name: paper.fileName,
      file_size: Number(paper.fileSize),
      file_type: paper.fileType,
      parse_status: "parsing", // 返回解析中状态
      cos_key: paper.id, // 兼容旧字段
    });
  } catch (error: any) {
    console.error("文件上传失败:", error);

    if (error.code === "LIMIT_FILE_SIZE") {
      return sendWarnningResponse(res, "文件大小超过限制，最大支持 50MB");
    }

    throw error;
  }
};

/**
 * 用户上传论文管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持 POST 请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "用户上传论文管理" })
);
