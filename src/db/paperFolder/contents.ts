import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

export interface FolderPaperItem {
  item_id: string;
  item_type: "uploaded_paper";
  paper_id: string | null;
  uploaded_paper_id: string;
  title: string;
  authors: Prisma.JsonValue | string | null;
  publication_name: string | null;
  year: number | null;
  abstract: string | null;
  has_fulltext: boolean;
  file_type?: string | null;
  parse_status?: string | null;
  added_at: Date;
  notes: string | null;
}

export interface FolderConversationItem {
  item_id: string;
  item_type: "conversation";
  conversation_id: string;
  title: string;
  create_time: Date;
  update_time: Date;
  added_at: Date;
  notes: string | null;
}

export type FolderContentItem = FolderPaperItem | FolderConversationItem;

/**
 * 获取文件夹内的所有内容（论文、对话）
 */
export const getFolderContents = async (params: {
  folder_id: string;
  page?: number;
  limit?: number;
}): Promise<{
  items: FolderContentItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
} | null> => {
  try {
    const { folder_id, page = 1, limit = 20 } = params;

    const total = await prisma.folderItem.count({
      where: { folder_id },
    });

    const dbItems = await prisma.folderItem.findMany({
      where: { folder_id },
      orderBy: { added_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        uploadedPaper: {
          select: {
            id: true,
            title: true,
            authors: true,
            source: true,
            publicationYear: true,
            abstract: true,
            doi: true,
            fileType: true,
            parseStatus: true,
          },
        },
        conversation: {
          select: {
            conversation_id: true,
            title: true,
            create_time: true,
            update_time: true,
          },
        },
      },
    });

    const items: FolderContentItem[] = [];

    dbItems.forEach((item) => {
      if (item.uploadedPaper) {
        items.push({
          item_id: item.item_id,
          item_type: "uploaded_paper",
          paper_id: item.paper_id,
          uploaded_paper_id: item.uploadedPaper.id,
          title: item.uploadedPaper.title,
          authors: item.uploadedPaper.authors,
          publication_name: item.uploadedPaper.source,
          year: item.uploadedPaper.publicationYear,
          abstract: item.uploadedPaper.abstract,
          has_fulltext: true,
          file_type: item.uploadedPaper.fileType,
          parse_status: item.uploadedPaper.parseStatus,
          added_at: item.added_at,
          notes: item.notes,
        });
      } else if (item.conversation) {
        items.push({
          item_id: item.item_id,
          item_type: "conversation",
          conversation_id: item.conversation.conversation_id,
          title: item.conversation.title,
          create_time: item.conversation.create_time,
          update_time: item.conversation.update_time,
          added_at: item.added_at,
          notes: item.notes,
        });
      } else {
        logger.warn(`文件夹项缺少关联内容: ${item.item_id}`);
      }
    });

    return {
      items,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取文件夹内容失败: ${errorMessage}`, { error });
    return null;
  }
};

/**
 * 批量查询内容的文件夹加入状态
 */
export const batchGetFolderItemStatus = async (
  user_id: string,
  item_ids: string[]
) => {
  try {
    const items = await prisma.folderItem.findMany({
      where: {
        folder: { user_id },
        OR: [
          { paper_id: { in: item_ids } },
          { uploaded_paper_id: { in: item_ids } },
          { conversation_id: { in: item_ids } },
        ],
      },
      include: {
        folder: {
          select: {
            folder_name: true,
          },
        },
      },
    });

    const statusMap: Record<
      string,
      {
        is_added: boolean;
        folder_names: string[];
        added_count: number;
      }
    > = {};

    item_ids.forEach((id) => {
      statusMap[id] = {
        is_added: false,
        folder_names: [],
        added_count: 0,
      };
    });

    items.forEach((item) => {
      const id = item.paper_id || item.uploaded_paper_id || item.conversation_id;

      if (id && statusMap[id]) {
        statusMap[id].is_added = true;
        statusMap[id].folder_names.push(item.folder.folder_name);
        statusMap[id].added_count++;
      }
    });

    return statusMap;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`批量查询文件夹状态失败: ${errorMessage}`, { error });
    return {};
  }
};
