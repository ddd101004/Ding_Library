import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

/**
 * 创建文件夹
 */
export const createFolder = async (data: {
  user_id: string;
  folder_name: string;
  description?: string;
  cover_image?: string;
}) => {
  try {
    const folder = await prisma.paperFolder.create({
      data: {
        user_id: data.user_id,
        folder_name: data.folder_name,
        description: data.description,
        cover_image: data.cover_image,
      },
    });
    return folder;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`创建文件夹失败: ${errorMessage}`, { error });
    throw error;
  }
};

/**
 * 获取用户的所有文件夹
 */
export const getFoldersByUserId = async (user_id: string) => {
  try {
    const folders = await prisma.paperFolder.findMany({
      where: { user_id },
      orderBy: { create_time: "desc" },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return folders.map((folder) => ({
      folder_id: folder.folder_id,
      folder_name: folder.folder_name,
      description: folder.description,
      cover_image: folder.cover_image,
      item_count: folder._count.items,
      create_time: folder.create_time,
      update_time: folder.update_time,
    }));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取文件夹列表失败: ${errorMessage}`, { error });
    return [];
  }
};

/**
 * 获取文件夹详情
 */
export const getFolderById = async (folder_id: string) => {
  try {
    const folder = await prisma.paperFolder.findUnique({
      where: { folder_id },
    });
    return folder;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取文件夹详情失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 更新文件夹
 */
export const updateFolder = async (
  folder_id: string,
  data: Prisma.PaperFolderUpdateInput
) => {
  try {
    const folder = await prisma.paperFolder.update({
      where: { folder_id },
      data,
    });
    return folder;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`更新文件夹失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 删除文件夹
 */
export const deleteFolder = async (folder_id: string) => {
  try {
    const deletedFolder = await prisma.paperFolder.delete({
      where: { folder_id },
    });

    return deletedFolder;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`删除文件夹失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 验证文件夹是否属于指定用户
 */
export const verifyFolderOwner = async (folder_id: string, user_id: string) => {
  try {
    const folder = await prisma.paperFolder.findFirst({
      where: {
        folder_id,
        user_id,
      },
    });
    return !!folder;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`验证文件夹所有者失败: ${errorMessage}`, { error });
    return false;
  }
};
