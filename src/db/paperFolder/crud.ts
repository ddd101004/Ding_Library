import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import {
  createDataset,
  deleteDataset,
} from "@/service/fastgpt";
import { getOrCreateUserRootDataset } from "@/db/user";

// 临时禁用 FastGPT 调用的开关（MongoDB 连接失败时使用）
const DISABLE_FASTGPT = process.env.DISABLE_FASTGPT === "true";

/**
 * 创建文件夹（同步创建 FastGPT 知识库）
 */
export const createFolder = async (data: {
  user_id: string;
  folder_name: string;
  description?: string;
  color?: string;
  cover_image?: string;
}) => {
  try {
    let fastgptDatasetId: string | null = null;

    // 仅在未禁用 FastGPT 时才创建知识库
    if (!DISABLE_FASTGPT) {
      try {
        // 获取或创建用户的根知识库
        const rootDatasetId = await getOrCreateUserRootDataset(data.user_id);

        // 在用户根知识库下创建子知识库
        fastgptDatasetId = await createDataset({
          name: data.folder_name,
          intro: data.description || "",
          type: "dataset",
          parentId: rootDatasetId || undefined,
        });
        logger.info(
          `[Folder] FastGPT dataset created: ${fastgptDatasetId} for folder: ${data.folder_name}, parentId: ${rootDatasetId}`
        );
      } catch (fastgptError) {
        const errorMessage =
          fastgptError instanceof Error
            ? fastgptError.message
            : String(fastgptError);
        logger.error(`[Folder] FastGPT dataset creation failed: ${errorMessage}`);
      }
    } else {
      logger.info(
        `[Folder] FastGPT disabled, skipping dataset creation for folder: ${data.folder_name}`
      );
    }

    const folder = await prisma.paperFolder.create({
      data: {
        user_id: data.user_id,
        folder_name: data.folder_name,
        description: data.description,
        color: data.color,
        cover_image: data.cover_image,
        sort_order: 0,
        fastgpt_dataset_id: fastgptDatasetId,
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
      color: folder.color,
      cover_image: folder.cover_image,
      sort_order: folder.sort_order,
      item_count: folder._count.items,
      fastgpt_dataset_id: folder.fastgpt_dataset_id,
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
 * 删除文件夹（同步删除 FastGPT 知识库）
 */
export const deleteFolder = async (folder_id: string) => {
  try {
    const folder = await prisma.paperFolder.findUnique({
      where: { folder_id },
      select: { fastgpt_dataset_id: true },
    });

    const deletedFolder = await prisma.paperFolder.delete({
      where: { folder_id },
    });

    // 仅在未禁用 FastGPT 且存在 dataset_id 时才删除
    if (!DISABLE_FASTGPT && folder?.fastgpt_dataset_id) {
      try {
        await deleteDataset(folder.fastgpt_dataset_id);
        logger.info(
          `[Folder] FastGPT dataset deleted: ${folder.fastgpt_dataset_id}`
        );
      } catch (fastgptError) {
        const errorMessage =
          fastgptError instanceof Error
            ? fastgptError.message
            : String(fastgptError);
        logger.error(`[Folder] FastGPT dataset deletion failed: ${errorMessage}`);
      }
    } else if (DISABLE_FASTGPT && folder?.fastgpt_dataset_id) {
      logger.info(
        `[Folder] FastGPT disabled, skipping dataset deletion: ${folder.fastgpt_dataset_id}`
      );
    }

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
