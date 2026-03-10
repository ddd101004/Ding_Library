import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";

/**
 * 检查第三方数据源论文是否存在
 */
export const checkPaperExists = async (paper_id: string): Promise<boolean> => {
  try {
    const paper = await prisma.paper.findUnique({
      where: { id: paper_id },
      select: { id: true },
    });
    return !!paper;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`检查论文是否存在失败: ${errorMessage}`, { error });
    return false;
  }
};

/**
 * 检查用户上传论文是否存在
 */
export const checkUploadedPaperExists = async (
  uploaded_paper_id: string
): Promise<boolean> => {
  try {
    const paper = await prisma.userUploadedPaper.findUnique({
      where: { id: uploaded_paper_id },
      select: { id: true },
    });
    return !!paper;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`检查用户上传论文是否存在失败: ${errorMessage}`, { error });
    return false;
  }
};

/**
 * 检查对话是否存在且属于指定用户
 */
export const checkConversationExists = async (
  conversation_id: string,
  user_id: string
): Promise<boolean> => {
  try {
    const conversation = await prisma.chatConversation.findFirst({
      where: {
        conversation_id,
        user_id,
        deleted_at: null,
      },
      select: { conversation_id: true },
    });
    return !!conversation;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`检查对话是否存在失败: ${errorMessage}`, { error });
    return false;
  }
};
