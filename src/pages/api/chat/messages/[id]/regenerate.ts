import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { sendMethodNotAllowedResponse } from "@/helper/responseHelper";
import {
  getParentMessageContext,
  createAssistantMessage,
  updateMessage,
} from "@/db/chatMessage";
import {
  getMessageCount,
  verifyConversationOwner,
  getConversationById,
  updateConversation,
} from "@/db/chatConversation";
import {
  setupSSEHeaders,
  createTokenCallback,
  callLLMByConversationType,
  sendSSEEvent,
  sendSSEError,
  finalizeStreamResponse,
  handleStreamError,
  StreamState,
} from "@/service/chat/streamHelper";
import logger from "@/helper/logger";
import { validateId } from "@/utils/validateString";

/**
 * POST - 重新生成消息
 */
const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  setupSSEHeaders(res);

  const { id } = req.query;
  const { is_deep_think } = req.body;

  // 参数校验
  const idResult = validateId(id, "消息 ID");
  if (!idResult.valid) {
    return sendSSEError(res, idResult.error || "消息 ID 校验失败");
  }

  const message_id = id as string;

  const messageContext = await getParentMessageContext(message_id);

  if (!messageContext) {
    return sendSSEError(res, "消息不存在");
  }

  const { message, contextMessages } = messageContext;
  const conversation_id = message.conversation_id;

  const isOwner = await verifyConversationOwner(conversation_id, userId);
  if (!isOwner) {
    return sendSSEError(res, "无权访问此会话");
  }

  const conversation = await getConversationById(conversation_id);
  if (!conversation) {
    return sendSSEError(res, "会话不存在");
  }

  // 同步更新会话的 is_deep_think 字段
  if (typeof is_deep_think === "boolean") {
    await updateConversation(conversation_id, { is_deep_think });
  }

  const userMessages = contextMessages.filter((m) => m.role === "user");
  if (userMessages.length === 0) {
    return sendSSEError(res, "未找到用户输入");
  }

  const lastUserMessage = userMessages[userMessages.length - 1];

  const messageCount = await getMessageCount(conversation_id);

  let isClientDisconnected = false;
  let newMessageId: string | null = null;
  const state: StreamState = {
    partialContent: "",
    reasoningContent: "",
  };

  req.on("close", async () => {
    isClientDisconnected = true;
    if (newMessageId && !res.writableEnded) {
      await updateMessage(newMessageId, {
        status: "stopped",
        content: state.partialContent,
        reasoning_content: state.reasoningContent || undefined,
      });
      logger.info("客户端断开连接，重新生成消息已保存", {
        messageId: newMessageId,
      });
    }
  });

  try {
    const assistantMessage = await createAssistantMessage({
      conversation_id,
      content: "",
      message_order: messageCount + 1,
      status: "streaming",
      parent_message_id: message_id,
    });

    if (!assistantMessage) {
      return sendSSEError(res, "创建AI消息失败");
    }

    newMessageId = assistantMessage.message_id;

    sendSSEEvent(res, "start", {
      message_id: newMessageId,
      message_order: messageCount + 1,
    });

    const onTokenCallback = createTokenCallback(
      res,
      state,
      () => isClientDisconnected
    );

    const tokenStats = await callLLMByConversationType({
      conversation,
      conversationId: conversation_id,
      userInput: lastUserMessage.content,
      userId,
      onToken: onTokenCallback,
      is_deep_think,
    });

    if (!isClientDisconnected) {
      await finalizeStreamResponse({
        res,
        conversationId: conversation_id,
        messageId: newMessageId,
        messageCount: messageCount + 1,
        state,
        tokenStats,
      });
    }
  } catch (error: unknown) {
    await handleStreamError({
      res,
      messageId: newMessageId,
      state,
      error,
      isClientDisconnected,
      logPrefix: "重新生成流式调用",
    });
  } finally {
    if (!isClientDisconnected) {
      res.end();
    }
  }
};

/**
 * 重新生成消息 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(handler);
