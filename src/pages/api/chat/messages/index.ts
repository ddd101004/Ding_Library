import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import { withAuthMonitoring } from "@/middleware/monitoring/withMonitoring";
import {
  sendSuccessResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  createAssistantMessage,
  getMessagesByConversationId,
} from "@/db/chatMessage";
import { callChatLLM } from "@/service/chat/llmService";
import { parseLimitParam } from "@/utils/parsePageParams";
import { verifyConversationOwner } from "@/db/chatConversation";
import { validateId } from "@/utils/validateString";
import {
  validateAndGetConversation,
  prepareUserMessage,
  updateConversationSettings,
  executeAutoSearch,
  formatRelatedPapers,
  finalizeConversationMessageCount,
  MessageRequestParams,
} from "@/service/chat/messageService";

/**
 * POST - 发送消息（非流式）- 带 LLM 监控
 */
const handlePostWithMonitoring = withAuthMonitoring(
  async (req: NextApiRequest, res: NextApiResponse, userId: string) => {
    const params: MessageRequestParams = {
      conversation_id: req.body.conversation_id,
      content: req.body.content,
      cited_paper_ids: req.body.cited_paper_ids,
      attachment_ids: req.body.attachment_ids,
      is_deep_think: req.body.is_deep_think,
      auto_search_papers: req.body.auto_search_papers,
    };

    // 1. 验证参数和会话权限
    const validationResult = await validateAndGetConversation(
      params,
      userId,
      res
    );
    if (!validationResult.success) {
      return;
    }

    const { conversation, isPaperReading } = validationResult;

    // 2. 准备用户消息
    const userMessageResult = await prepareUserMessage(params);
    if (!userMessageResult.success) {
      throw new Error(userMessageResult.errorMessage);
    }

    const { userMessage, messageCount } = userMessageResult;

    // 3. 更新会话设置
    const conversationUpdateData = await updateConversationSettings(
      params.conversation_id,
      params,
      messageCount
    );

    // 4. 执行论文检索（如果开启）
    const { searchResult, relatedPapers } = await executeAutoSearch({
      conversationId: params.conversation_id,
      content: params.content,
      messageId: userMessage.message_id,
      isPaperReading,
      autoSearchPapers: params.auto_search_papers,
      conversationAutoSearch: conversation.autoSearchPapers,
      logPrefix: "（非流式）",
    });

    // 5. 调用LLM生成回复
    let assistantContent = "";
    let input_tokens = 0;
    let output_tokens = 0;
    let total_tokens = 0;

    try {
      const llmResult = await callChatLLM(
        params.conversation_id,
        params.content,
        relatedPapers,
        params.is_deep_think
      );
      assistantContent = llmResult.content;
      input_tokens = llmResult.input_tokens;
      output_tokens = llmResult.output_tokens;
      total_tokens = llmResult.total_tokens;
    } catch (error) {
      console.error("LLM调用失败:", error);
      assistantContent = "抱歉，AI服务暂时不可用，请稍后再试。";
    }

    // 6. 创建AI消息
    const assistantMessage = await createAssistantMessage({
      conversation_id: params.conversation_id,
      content: assistantContent,
      message_order: messageCount + 2,
      status: "completed",
      input_tokens,
      output_tokens,
      total_tokens,
    });

    if (!assistantMessage) {
      throw new Error("创建AI消息失败");
    }

    // 7. 更新会话消息数
    await finalizeConversationMessageCount(
      params.conversation_id,
      messageCount + 2
    );

    // 8. 构建响应数据
    const responseData: Record<string, unknown> = {
      user_message: {
        message_id: userMessage.message_id,
        message_order: userMessage.message_order,
        role: userMessage.role,
        content: userMessage.content,
        create_time: userMessage.create_time,
      },
      assistant_message: {
        message_id: assistantMessage.message_id,
        message_order: assistantMessage.message_order,
        role: assistantMessage.role,
        content: assistantMessage.content,
        input_tokens,
        output_tokens,
        total_tokens,
        create_time: assistantMessage.create_time,
      },
      conversation:
        messageCount === 0
          ? { title: conversationUpdateData.title }
          : undefined,
    };

    // 9. 如果有检索到论文，添加到响应中
    const formattedPapers = await formatRelatedPapers(searchResult, userId);
    if (formattedPapers) {
      responseData.related_papers = formattedPapers;
    }

    sendSuccessResponse(res, "发送成功", responseData);
  },
  {
    monitorType: "external_api",
    apiProvider: "openai",
    operationName: "callChatLLM",
    extractMetadata: (req) => ({
      conversationId: req.body.conversation_id,
      contentLength: req.body.content?.length || 0,
    }),
    successMetric: "llm_call_success",
    failureMetric: "llm_call_error",
  }
);

/**
 * GET - 获取消息列表
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { conversation_id, limit, before_message_order } = req.query;

  // 参数校验
  const idResult = validateId(conversation_id, "会话 ID");
  if (!idResult.valid) {
    throw new Error(idResult.error || "会话 ID 校验失败");
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    conversation_id as string,
    userId
  );
  if (!isOwner) {
    throw new Error("无权访问此会话");
  }

  const result = await getMessagesByConversationId({
    conversation_id: conversation_id as string,
    user_id: userId,
    limit: parseLimitParam(limit, 50, 200),
    before_message_order: before_message_order
      ? parseLimitParam(before_message_order, 0, Number.MAX_SAFE_INTEGER)
      : undefined,
  });

  if (!result) {
    throw new Error("获取消息列表失败");
  }

  sendSuccessResponse(res, "获取成功", result);
};

/**
 * 消息管理 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePostWithMonitoring(req, res, userId);
  } else if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET和POST请求");
  }
};

export default withAuth(withErrorHandler(handler, { logPrefix: "消息管理" }));
