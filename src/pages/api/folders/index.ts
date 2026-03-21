import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { createFolder, getFoldersByUserId } from "@/db/paperFolder";
import { validateString } from "@/utils/validateString";

/**
 * 生成封面图 URL
 * @param coverImage 封面图路径
 * @returns 完整的访问 URL
 */
function getCoverImageUrl(coverImage: string | null): string | null {
  if (!coverImage) return null;

  // 本地存储路径
  if (coverImage.startsWith('covers/') || coverImage.startsWith('avatars/')) {
    return `/api/uploads/${coverImage}`;
  }

  // 完整 URL（COS 或其他）
  if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
    return coverImage;
  }

  // 旧的 COS 路径格式
  return `https://library-cos.centum-cloud.com/${coverImage}`;
}

/**
 * POST - 创建文件夹
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { folder_name, description, cover_image } = req.body;

  // 参数校验
  const nameResult = validateString(folder_name, "文件夹名称", {
    limitKey: "folder_name",
  });
  if (!nameResult.valid) {
    return sendWarnningResponse(res, nameResult.error || "文件夹名称校验失败");
  }

  if (description) {
    const descResult = validateString(description, "描述", {
      limitKey: "description",
      required: false,
    });
    if (!descResult.valid) {
      return sendWarnningResponse(res, descResult.error || "描述校验失败");
    }
  }

  // 验证 cover_image 格式（如果提供）
  if (cover_image) {
    const coverResult = validateString(cover_image, "封面图", {
      max: 500,
      required: false,
    });
    if (!coverResult.valid) {
      return sendWarnningResponse(res, coverResult.error || "封面图校验失败");
    }
    if (!cover_image.startsWith("covers/")) {
      return sendWarnningResponse(res, "无效的封面图 key");
    }
  }

  const folder = await createFolder({
    user_id: userId,
    folder_name,
    description,
    cover_image,
  });

  if (!folder) {
    throw new Error("创建文件夹失败");
  }

  // 如果有封面图，生成 URL
  const cover_image_url = getCoverImageUrl(folder.cover_image);

  sendSuccessResponse(res, "文件夹创建成功", {
    folder_id: folder.folder_id,
    folder_name: folder.folder_name,
    description: folder.description,
    cover_image: folder.cover_image,
    cover_image_url,
    create_time: folder.create_time,
  });
};

/**
 * GET - 获取文件夹列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const folders = await getFoldersByUserId(userId);

  // 为每个文件夹生成封面图 URL
  const foldersWithCoverUrl = folders.map((folder) => ({
    ...folder,
    cover_image_url: getCoverImageUrl(folder.cover_image),
  }));

  sendSuccessResponse(res, "获取成功", {
    folders: foldersWithCoverUrl,
  });
};

/**
 * 文件夹管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "文件夹管理" })
);
