import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import { createTextCollection } from "@/service/fastgpt";

export type FolderItemType = "paper" | "uploaded_paper" | "conversation";

export interface AddItemToFolderResult {
  success: boolean;
  item?: {
    item_id: string;
    folder_id: string;
    paper_id: string | null;
    uploaded_paper_id: string | null;
    conversation_id: string | null;
    notes: string | null;
    added_at: Date;
    create_time: Date;
    update_time: Date;
    fastgpt_collection_id?: string | null;
  };
  error?: string;
}

/**
 * 添加内容到文件夹（支持三种类型：论文、用户上传论文、对话）
 * 同步到 FastGPT 知识库
 * @param data.item_type - 内容类型: "paper" | "uploaded_paper" | "conversation"
 * @param data.item_id - 内容ID
 * @param data.user_id - 用户ID（用于验证对话归属）
 */
export const addItemToFolder = async (data: {
  folder_id: string;
  item_type: FolderItemType;
  item_id: string;
  user_id: string;
  notes?: string;
}): Promise<AddItemToFolderResult> => {
  try {
    const { folder_id, item_type, item_id, user_id, notes } = data;

    const folder = await prisma.paperFolder.findUnique({
      where: { folder_id },
      select: { fastgpt_dataset_id: true },
    });

    let contentForFastGPT: { name: string; text: string } | null = null;

    if (item_type === "paper") {
      const paper = await prisma.paper.findUnique({
        where: { id: item_id },
        select: {
          id: true,
          title: true,
          abstract: true,
          keywords: true,
          authors: true,
        },
      });
      if (!paper) {
        logger.warn(`添加到文件夹失败: 第三方论文不存在 (paper_id: ${item_id})`);
        return { success: false, error: "paper_not_found" };
      }
      const keywordsText = Array.isArray(paper.keywords)
        ? (paper.keywords as string[]).join(", ")
        : "";
      contentForFastGPT = {
        name: paper.title || "未命名论文",
        text: [
          `标题: ${paper.title || ""}`,
          paper.abstract ? `摘要: ${paper.abstract}` : "",
          keywordsText ? `关键词: ${keywordsText}` : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
      };
    } else if (item_type === "uploaded_paper") {
      const uploadedPaper = await prisma.userUploadedPaper.findUnique({
        where: { id: item_id },
        select: {
          id: true,
          title: true,
          abstract: true,
          keywords: true,
          parsedContent: true,
        },
      });
      if (!uploadedPaper) {
        logger.warn(
          `添加到文件夹失败: 用户上传论文不存在 (uploaded_paper_id: ${item_id})`
        );
        return { success: false, error: "uploaded_paper_not_found" };
      }
      contentForFastGPT = {
        name: uploadedPaper.title || "未命名上传论文",
        text:
          uploadedPaper.parsedContent ||
          [
            `标题: ${uploadedPaper.title || ""}`,
            uploadedPaper.abstract ? `摘要: ${uploadedPaper.abstract}` : "",
            uploadedPaper.keywords ? `关键词: ${uploadedPaper.keywords}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
      };
    } else if (item_type === "conversation") {
      const conversation = await prisma.chatConversation.findFirst({
        where: {
          conversation_id: item_id,
          user_id,
          deleted_at: null,
        },
        select: {
          conversation_id: true,
          title: true,
          messages: {
            select: {
              role: true,
              content: true,
            },
            orderBy: { message_order: "asc" },
            take: 50,
          },
        },
      });
      if (!conversation) {
        logger.warn(
          `添加到文件夹失败: 对话不存在或无权访问 (conversation_id: ${item_id})`
        );
        return { success: false, error: "conversation_not_found" };
      }
      const messagesText = conversation.messages
        .map((msg) => {
          const roleLabel = msg.role === "user" ? "用户" : "助手";
          return `${roleLabel}: ${msg.content}`;
        })
        .join("\n\n");
      contentForFastGPT = {
        name: conversation.title || "未命名对话",
        text: `对话标题: ${conversation.title}\n\n${messagesText}`,
      };
    } else {
      return { success: false, error: "invalid_item_type" };
    }

    let createData: Prisma.FolderItemCreateInput;
    if (item_type === "paper") {
      createData = {
        folder: { connect: { folder_id } },
        paper: { connect: { id: item_id } },
        notes,
      };
    } else if (item_type === "uploaded_paper") {
      createData = {
        folder: { connect: { folder_id } },
        uploadedPaper: { connect: { id: item_id } },
        notes,
      };
    } else {
      createData = {
        folder: { connect: { folder_id } },
        conversation: { connect: { conversation_id: item_id } },
        notes,
      };
    }

    const item = await prisma.folderItem.create({
      data: createData,
    });

    let fastgptCollectionId: string | null = null;
    if (folder?.fastgpt_dataset_id && contentForFastGPT) {
      try {
        const result = await createTextCollection({
          datasetId: folder.fastgpt_dataset_id,
          name: contentForFastGPT.name,
          text: contentForFastGPT.text,
          trainingType: "chunk",
          metadata: {
            item_id: item.item_id,
            item_type,
            source_id: item_id,
          },
        });
        fastgptCollectionId = result.collectionId;
        logger.info(
          `[Folder] FastGPT collection created: ${fastgptCollectionId} for ${item_type}: ${item_id}`
        );
      } catch (fastgptError) {
        const errorMessage =
          fastgptError instanceof Error
            ? fastgptError.message
            : String(fastgptError);
        logger.error(
          `[Folder] FastGPT collection creation failed: ${errorMessage}`
        );
      }
    }

    return {
      success: true,
      item: {
        item_id: item.item_id,
        folder_id: item.folder_id,
        paper_id: item.paper_id,
        uploaded_paper_id: item.uploaded_paper_id,
        conversation_id: item.conversation_id,
        notes: item.notes,
        added_at: item.added_at,
        create_time: item.create_time,
        update_time: item.update_time,
        fastgpt_collection_id: fastgptCollectionId,
      },
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`添加内容到文件夹失败: ${errorMessage}`, { error });

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { success: false, error: "item_already_in_folder" };
    }

    return { success: false, error: "unknown_error" };
  }
};

/**
 * 批量添加内容到文件夹
 */
export const batchAddItemsToFolder = async (data: {
  folder_id: string;
  items: Array<{
    item_type: FolderItemType;
    item_id: string;
  }>;
  user_id: string;
}): Promise<{
  success: boolean;
  added_count: number;
  failed_count: number;
  errors: Array<{ item_id: string; error: string }>;
}> => {
  const { folder_id, items, user_id } = data;
  const errors: Array<{ item_id: string; error: string }> = [];
  let added_count = 0;

  for (const item of items) {
    const result = await addItemToFolder({
      folder_id,
      item_type: item.item_type,
      item_id: item.item_id,
      user_id,
    });

    if (result.success) {
      added_count++;
    } else {
      errors.push({ item_id: item.item_id, error: result.error || "unknown" });
    }
  }

  return {
    success: errors.length === 0,
    added_count,
    failed_count: errors.length,
    errors,
  };
};

/**
 * 从文件夹移除内容
 * 通过 item_id 主键直接删除（FolderItem 表主键）
 */
export const removeItemFromFolder = async (folder_id: string, item_id: string) => {
  try {
    const deleted = await prisma.folderItem.delete({
      where: { item_id },
    });

    return deleted;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`从文件夹移除内容失败: ${errorMessage}`, { error });
    return null;
  }
};

/**
 * 批量从文件夹移除内容
 * @param item_ids - FolderItem 主键列表
 * @param user_id - 用户 ID（用于验证权限）
 */
export const batchRemoveItemsFromFolder = async (params: {
  item_ids: string[];
  user_id: string;
}): Promise<{
  success: boolean;
  removed_count: number;
  failed_count: number;
  errors: Array<{ item_id: string; error: string }>;
}> => {
  const { item_ids, user_id } = params;
  const errors: Array<{ item_id: string; error: string }> = [];
  let removed_count = 0;

  try {
    for (const item_id of item_ids) {
      try {
        const item = await prisma.folderItem.findFirst({
          where: { item_id },
          include: { folder: { select: { user_id: true } } },
        });

        if (!item) {
          errors.push({ item_id, error: "item_not_found" });
          continue;
        }

        if (item.folder.user_id !== user_id) {
          errors.push({ item_id, error: "permission_denied" });
          continue;
        }

        await prisma.folderItem.delete({
          where: { item_id },
        });

        removed_count++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`批量移除文件夹内容失败: ${errMsg}`, { item_id });
        errors.push({ item_id, error: "remove_failed" });
      }
    }

    return {
      success: errors.length === 0,
      removed_count,
      failed_count: errors.length,
      errors,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量移除文件夹内容失败: ${errorMessage}`, { error });
    return {
      success: false,
      removed_count: 0,
      failed_count: item_ids.length,
      errors: item_ids.map((id) => ({ item_id: id, error: "unknown_error" })),
    };
  }
};

/**
 * 移动内容到另一个文件夹
 * @param item_ids - FolderItem 主键列表
 * @param target_folder_id - 目标文件夹 ID
 * @param user_id - 用户 ID（用于验证权限）
 */
export const moveItemsToFolder = async (params: {
  item_ids: string[];
  target_folder_id: string;
  user_id: string;
}): Promise<{
  success: boolean;
  moved_count: number;
  failed_count: number;
  errors: Array<{ item_id: string; error: string }>;
}> => {
  const { item_ids, target_folder_id, user_id } = params;
  const errors: Array<{ item_id: string; error: string }> = [];
  let moved_count = 0;

  try {
    const targetFolder = await prisma.paperFolder.findFirst({
      where: { folder_id: target_folder_id, user_id },
    });

    if (!targetFolder) {
      return {
        success: false,
        moved_count: 0,
        failed_count: item_ids.length,
        errors: item_ids.map((id) => ({ item_id: id, error: "target_folder_not_found" })),
      };
    }

    for (const item_id of item_ids) {
      try {
        const item = await prisma.folderItem.findFirst({
          where: { item_id },
          include: { folder: { select: { user_id: true } } },
        });

        if (!item) {
          errors.push({ item_id, error: "item_not_found" });
          continue;
        }

        if (item.folder.user_id !== user_id) {
          errors.push({ item_id, error: "permission_denied" });
          continue;
        }

        if (item.folder_id === target_folder_id) {
          errors.push({ item_id, error: "already_in_target_folder" });
          continue;
        }

        const existingItem = await prisma.folderItem.findFirst({
          where: {
            folder_id: target_folder_id,
            OR: [
              { paper_id: item.paper_id },
              { uploaded_paper_id: item.uploaded_paper_id },
              { conversation_id: item.conversation_id },
            ].filter((cond) => Object.values(cond)[0] !== null),
          },
        });

        if (existingItem) {
          errors.push({ item_id, error: "duplicate_in_target_folder" });
          continue;
        }

        await prisma.folderItem.update({
          where: { item_id },
          data: { folder_id: target_folder_id },
        });

        moved_count++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`移动文件夹内容失败: ${errMsg}`, { item_id, target_folder_id });
        errors.push({ item_id, error: "move_failed" });
      }
    }

    return {
      success: errors.length === 0,
      moved_count,
      failed_count: errors.length,
      errors,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`移动文件夹内容失败: ${errorMessage}`, { error });
    return {
      success: false,
      moved_count: 0,
      failed_count: item_ids.length,
      errors: item_ids.map((id) => ({ item_id: id, error: "unknown_error" })),
    };
  }
};
