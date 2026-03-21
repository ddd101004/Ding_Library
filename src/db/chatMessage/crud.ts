import logger from "@/helper/logger";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";

/**
 * 创建用户消息
 */
export const createUserMessage = async (data: {
  conversation_id: string;
  content: string;
  message_order: number;
  content_type?: string;
}) => {
  try {
    const message = await prisma.chatMessage.create({
      data: {
        conversation_id: data.conversation_id,
        content: data.content,
        role: "user",
        content_type: data.content_type || "text",
        message_order: data.message_order,
        status: "completed",
      },
    });
    return message;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`创建用户消息失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 创建AI助手消息
 */
export const createAssistantMessage = async (data: {
  conversation_id: string;
  content: string;
  message_order: number;
  status?: string;
  parent_message_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}) => {
  try {
    let root_message_id: string | undefined;

    if (data.parent_message_id) {
      const parentMessage = await prisma.chatMessage.findUnique({
        where: { message_id: data.parent_message_id },
        select: { root_message_id: true, message_id: true },
      });
      root_message_id = parentMessage?.root_message_id || parentMessage?.message_id;
    }

    const message = await prisma.chatMessage.create({
      data: {
        conversation_id: data.conversation_id,
        content: data.content,
        role: "assistant",
        content_type: "text",
        message_order: data.message_order,
        status: data.status || "streaming",
        parent_message_id: data.parent_message_id,
        root_message_id,
        input_tokens: data.input_tokens,
        output_tokens: data.output_tokens,
        total_tokens: data.total_tokens,
      },
    });

    if (!data.parent_message_id) {
      await prisma.chatMessage.update({
        where: { message_id: message.message_id },
        data: { root_message_id: message.message_id },
      });
    }

    return message;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`创建AI消息失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 更新消息内容和状态
 */
export const updateMessage = async (
  message_id: string,
  data: {
    content?: string;
    status?: string;
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    error_message?: string;
    reasoning_content?: string | null;
    reasoningTokens?: number | null;
    messageType?: string;
    contextText?: string | null;
    contextRange?: Prisma.InputJsonValue;
  }
) => {
  try {
    const message = await prisma.chatMessage.update({
      where: { message_id },
      data,
    });
    return message;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`更新消息失败: ${errorMessage}`, { error });
    return;
  }
};

/**
 * 删除消息
 */
export const deleteMessage = async (message_id: string) => {
  try {
    const message = await prisma.chatMessage.delete({
      where: { message_id },
    });
    return message;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`删除消息失败: ${errorMessage}`, { error });
    return;
  }
};
