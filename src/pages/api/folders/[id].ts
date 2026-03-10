import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  getFolderById,
  updateFolder,
  deleteFolder,
  verifyFolderOwner,
} from "@/db/paperFolder";
import { validateString, validateId } from "@/utils/validateString";
import {
  getCoverImageSignedUrl,
  deleteCoverImage,
} from "@/lib/cos/cosClient";
import { Prisma } from "@prisma/client";

/**
 * GET - 获取文件夹详情
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  folder_id: string
) => {
  const folder = await getFolderById(folder_id);

  if (!folder) {
    return sendWarnningResponse(res, "文件夹不存在");
  }

  // 生成封面图的签名 URL
  const cover_image_url = folder.cover_image
    ? getCoverImageSignedUrl(folder.cover_image)
    : null;

  return sendSuccessResponse(res, "获取成功", {
    folder_id: folder.folder_id,
    folder_name: folder.folder_name,
    description: folder.description,
    color: folder.color,
    cover_image: folder.cover_image,
    cover_image_url,
    sort_order: folder.sort_order,
    create_time: folder.create_time,
    update_time: folder.update_time,
  });
};

/**
 * PATCH - 更新文件夹
 */
const handlePatch = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  folder_id: string
) => {
  const { folder_name, description, color, cover_image, sort_order } = req.body;

  // 参数校验
  if (folder_name !== undefined) {
    const nameResult = validateString(folder_name, "文件夹名称", {
      limitKey: "folder_name",
      required: false,
    });
    if (!nameResult.valid) {
      return sendWarnningResponse(res, nameResult.error || "文件夹名称校验失败");
    }
  }

  if (description !== undefined) {
    const descResult = validateString(description, "描述", {
      limitKey: "description",
      required: false,
    });
    if (!descResult.valid) {
      return sendWarnningResponse(res, descResult.error || "描述校验失败");
    }
  }

  if (color !== undefined) {
    const colorResult = validateString(color, "颜色", {
      limitKey: "color",
      required: false,
    });
    if (!colorResult.valid) {
      return sendWarnningResponse(res, colorResult.error || "颜色校验失败");
    }
  }

  // 验证 cover_image 格式（如果提供）
  if (cover_image !== undefined && cover_image !== null && cover_image !== "") {
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

  // 获取旧的文件夹信息，用于删除旧封面图
  const oldFolder = await getFolderById(folder_id);
  const oldCoverImage = oldFolder?.cover_image || null;

  const updateData: Prisma.PaperFolderUpdateInput = {};

  if (folder_name !== undefined) updateData.folder_name = folder_name;
  if (description !== undefined) updateData.description = description;
  if (color !== undefined) updateData.color = color;
  if (cover_image !== undefined) updateData.cover_image = cover_image || null;
  if (sort_order !== undefined) updateData.sort_order = sort_order;

  const folder = await updateFolder(folder_id, updateData);

  if (!folder) {
    throw new Error("更新失败");
  }

  // 如果封面图被更新或删除，删除旧的封面图
  if (cover_image !== undefined && oldCoverImage && oldCoverImage !== cover_image) {
    await deleteCoverImage(oldCoverImage);
  }

  // 生成新封面图的签名 URL
  const cover_image_url = folder.cover_image
    ? getCoverImageSignedUrl(folder.cover_image)
    : null;

  return sendSuccessResponse(res, "更新成功", {
    folder_id: folder.folder_id,
    folder_name: folder.folder_name,
    description: folder.description,
    color: folder.color,
    cover_image: folder.cover_image,
    cover_image_url,
    sort_order: folder.sort_order,
    update_time: folder.update_time,
  });
};

/**
 * DELETE - 删除文件夹
 */
const handleDelete = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string,
  folder_id: string
) => {
  // 获取文件夹信息，用于删除封面图
  const oldFolder = await getFolderById(folder_id);
  const oldCoverImage = oldFolder?.cover_image || null;

  const folder = await deleteFolder(folder_id);

  if (!folder) {
    throw new Error("删除失败");
  }

  // 删除封面图
  if (oldCoverImage) {
    await deleteCoverImage(oldCoverImage);
  }

  return sendSuccessResponse(res, "删除成功");
};

/**
 * 文件夹管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { id } = req.query;

  // 参数校验
  const idResult = validateId(id, "文件夹 ID");
  if (!idResult.valid) {
    return sendWarnningResponse(res, idResult.error || "文件夹 ID 校验失败");
  }
  const folder_id = id as string;

  // 验证文件夹所有权
  const isOwner = await verifyFolderOwner(folder_id, userId);
  if (!isOwner) {
    return sendWarnningResponse(res, "无权访问此文件夹");
  }

  if (req.method === "GET") {
    return await handleGet(req, res, userId, folder_id);
  } else if (req.method === "PATCH") {
    return await handlePatch(req, res, userId, folder_id);
  } else if (req.method === "DELETE") {
    return await handleDelete(req, res, userId, folder_id);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET/PATCH/DELETE请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "文件夹详情" })
);
