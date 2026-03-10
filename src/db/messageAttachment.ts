import prisma from "@/utils/prismaProxy";
import { MessageAttachment } from "@prisma/client";

/**
 * 论文信息（完整版，用于会话详情返回）
 */
export interface PaperFullInfo {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  file_name: string;
  file_size: number;
  file_type: string;
  file_path: string;
  file_url?: string | null;
  parse_status: string;
  parsed_content: string;
  page_count: number | null;
  word_count: number | null;
}

/**
 * 消息附件数据（用于创建）
 */
export interface CreateAttachmentData {
  uploaded_paper_id: string;
  file_name: string;
  file_type: string;
  file_size: bigint | number;
}

/**
 * 消息附件返回格式
 */
export interface AttachmentInfo {
  id: string;
  uploaded_paper_id: string;
  file_name: string;
  file_type: string;
  file_size: string; // BigInt 转为字符串
  attachment_order: number;
  parse_status?: string;
}

/**
 * 批量创建消息附件
 * @param messageId 消息ID
 * @param attachments 附件数据列表
 * @returns 创建的附件列表
 */
export async function createMessageAttachments(
  messageId: string,
  attachments: CreateAttachmentData[]
): Promise<MessageAttachment[]> {
  if (!attachments || attachments.length === 0) {
    return [];
  }

  // 使用 createMany 批量插入
  await prisma.messageAttachment.createMany({
    data: attachments.map((attachment, index) => ({
      message_id: messageId,
      uploaded_paper_id: attachment.uploaded_paper_id,
      file_name: attachment.file_name,
      file_type: attachment.file_type,
      file_size: BigInt(attachment.file_size),
      attachment_order: index + 1,
    })),
    skipDuplicates: true,
  });

  // 返回创建的附件
  return prisma.messageAttachment.findMany({
    where: { message_id: messageId },
    orderBy: { attachment_order: "asc" },
  });
}

/**
 * 根据上传文件ID列表获取文件信息并创建附件
 * @param messageId 消息ID
 * @param uploadedPaperIds 上传文件ID列表
 * @returns 创建的附件列表
 */
export async function createAttachmentsFromPaperIds(
  messageId: string,
  uploadedPaperIds: string[]
): Promise<MessageAttachment[]> {
  if (!uploadedPaperIds || uploadedPaperIds.length === 0) {
    return [];
  }

  // 查询上传文件信息
  const papers = await prisma.userUploadedPaper.findMany({
    where: {
      id: { in: uploadedPaperIds },
      deletedAt: null,
    },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileSize: true,
    },
  });

  if (papers.length === 0) {
    return [];
  }

  // 保持原始顺序
  const paperMap = new Map(papers.map((p) => [p.id, p]));
  const orderedPapers = uploadedPaperIds
    .map((id) => paperMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  // 创建附件数据
  const attachmentData: CreateAttachmentData[] = orderedPapers.map((paper) => ({
    uploaded_paper_id: paper.id,
    file_name: paper.fileName,
    file_type: paper.fileType,
    file_size: paper.fileSize,
  }));

  return createMessageAttachments(messageId, attachmentData);
}

/**
 * 获取消息的附件列表
 * @param messageId 消息ID
 * @returns 附件列表
 */
export async function getMessageAttachments(
  messageId: string
): Promise<AttachmentInfo[]> {
  const attachments = await prisma.messageAttachment.findMany({
    where: { message_id: messageId },
    orderBy: { attachment_order: "asc" },
    include: {
      uploadedPaper: {
        select: {
          parseStatus: true,
        },
      },
    },
  });

  return attachments.map((att) => ({
    id: att.id,
    uploaded_paper_id: att.uploaded_paper_id,
    file_name: att.file_name,
    file_type: att.file_type,
    file_size: att.file_size.toString(),
    attachment_order: att.attachment_order,
    parse_status: att.uploadedPaper?.parseStatus,
  }));
}

/**
 * 批量获取多个消息的附件
 * @param messageIds 消息ID列表
 * @returns 消息ID -> 附件列表 的映射
 */
export async function getAttachmentsByMessageIds(
  messageIds: string[]
): Promise<Record<string, AttachmentInfo[]>> {
  if (!messageIds || messageIds.length === 0) {
    return {};
  }

  const attachments = await prisma.messageAttachment.findMany({
    where: { message_id: { in: messageIds } },
    orderBy: { attachment_order: "asc" },
    include: {
      uploadedPaper: {
        select: {
          parseStatus: true,
        },
      },
    },
  });

  // 按消息ID分组
  const result: Record<string, AttachmentInfo[]> = {};

  for (const att of attachments) {
    const messageId = att.message_id;
    if (!result[messageId]) {
      result[messageId] = [];
    }
    result[messageId].push({
      id: att.id,
      uploaded_paper_id: att.uploaded_paper_id,
      file_name: att.file_name,
      file_type: att.file_type,
      file_size: att.file_size.toString(),
      attachment_order: att.attachment_order,
      parse_status: att.uploadedPaper?.parseStatus,
    });
  }

  return result;
}

/**
 * 删除消息的所有附件
 * @param messageId 消息ID
 */
export async function deleteMessageAttachments(
  messageId: string
): Promise<void> {
  await prisma.messageAttachment.deleteMany({
    where: { message_id: messageId },
  });
}

/**
 * 统计会话中关联的论文数量（去重）
 * @param conversationId 会话ID
 * @returns 去重后的论文数量
 */
export async function countConversationPapers(
  conversationId: string
): Promise<number> {
  // 查询该会话所有消息的附件，获取去重后的论文ID数量
  const result = await prisma.messageAttachment.findMany({
    where: {
      message: {
        conversation_id: conversationId,
      },
    },
    select: {
      uploaded_paper_id: true,
    },
    distinct: ["uploaded_paper_id"],
  });

  return result.length;
}

/**
 * 获取会话中所有关联的论文（去重）
 * 通过 MessageAttachment 表查询会话中所有消息关联的论文
 * @param conversationId 会话ID
 * @returns 论文列表（按首次添加时间排序）
 */
export async function getConversationPapers(
  conversationId: string
): Promise<PaperFullInfo[]> {
  // 查询该会话所有消息的附件，获取关联的论文
  const attachments = await prisma.messageAttachment.findMany({
    where: {
      message: {
        conversation_id: conversationId,
      },
    },
    include: {
      uploadedPaper: {
        select: {
          id: true,
          title: true,
          authors: true,
          abstract: true,
          keywords: true,
          fileName: true,
          filePath: true,
          fileSize: true,
          fileType: true,
          parseStatus: true,
          parsedContent: true,
          pageCount: true,
          wordCount: true,
        },
      },
    },
    orderBy: {
      create_time: "asc",
    },
  });

  // 去重：同一篇论文可能被多条消息引用
  const paperMap = new Map<string, PaperFullInfo>();

  for (const att of attachments) {
    const paper = att.uploadedPaper;
    if (paper && !paperMap.has(paper.id)) {
      // 解析 JSON 字段
      let authors: string[] = [];
      let keywords: string[] = [];
      try {
        if (paper.authors) authors = JSON.parse(paper.authors);
        if (paper.keywords) keywords = JSON.parse(paper.keywords);
      } catch {
        // JSON 解析失败，保持默认空数组
      }

      paperMap.set(paper.id, {
        id: paper.id,
        title: paper.title,
        authors,
        abstract: paper.abstract || "",
        keywords,
        file_name: paper.fileName,
        file_size: Number(paper.fileSize),
        file_type: paper.fileType,
        file_path: paper.filePath,
        parse_status: paper.parseStatus,
        parsed_content: paper.parsedContent || "",
        page_count: paper.pageCount,
        word_count: paper.wordCount,
      });
    }
  }

  return Array.from(paperMap.values());
}
