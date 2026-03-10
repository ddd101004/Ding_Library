/**
 * 消息服务公共模块
 * 抽取流式和非流式消息接口的公共逻辑
 */

import { NextApiResponse } from "next";
import { sendWarnningResponse } from "@/helper/responseHelper";
import { createUserMessage } from "@/db/chatMessage";
import {
  getMessageCount,
  updateConversation,
  verifyConversationOwner,
  getConversationById,
} from "@/db/chatConversation";
import { createBatchCitations } from "@/db/messageCitation";
import {
  createAttachmentsFromPaperIds,
  countConversationPapers,
  getConversationPapers,
} from "@/db/messageAttachment";
import { generateConversationTitle } from "@/service/chat/conversationUtils";
import {
  autoSearchRelatedPapers,
  AutoRelatedPapersResult,
  RelatedPaper,
} from "@/service/chat/autoRelatedPapers";
import { findUploadedPapersByIds } from "@/db/ai-reading/uploadedPaper";
import {
  batchGetDocDeliveryStatusByPaperIds,
  DocDeliveryStatus,
} from "@/db/docDeliveryRequest";
import logger from "@/helper/logger";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 消息请求基础参数
 */
export interface MessageRequestParams {
  conversation_id: string;
  content: string;
  cited_paper_ids?: string[];
  attachment_ids?: string[];
  is_deep_think?: boolean;
  auto_search_papers?: boolean;
  // AI 伴读扩展参数
  context_text?: string;
  context_range?: {
    start: number;
    end: number;
    page?: number;
  };
  operation_type?: string;
  target_language?: string;
}

/**
 * 会话验证结果
 */
export interface ConversationValidationResult {
  success: true;
  conversation: NonNullable<Awaited<ReturnType<typeof getConversationById>>>;
  isPaperReading: boolean;
}

/**
 * 会话验证失败结果
 */
export interface ConversationValidationError {
  success: false;
  errorMessage: string;
}

/**
 * 用户消息准备结果
 */
export interface UserMessagePrepareResult {
  success: true;
  userMessage: NonNullable<Awaited<ReturnType<typeof createUserMessage>>>;
  messageCount: number;
}

/**
 * 用户消息准备失败结果
 */
export interface UserMessagePrepareError {
  success: false;
  errorMessage: string;
}

/**
 * 论文检索结果
 */
export interface PaperSearchResult {
  searchResult: AutoRelatedPapersResult | null;
  relatedPapers: RelatedPaper[] | undefined;
}

/**
 * 格式化后的论文数据
 */
export interface FormattedRelatedPaper {
  index: number;
  id: string;
  title: string;
  authors: string | string[];
  publication_name?: string;
  publication_year?: number;
  abstract?: string;
  doi?: string;
  source: string;
  source_id: string;
  doc_delivery_status?: DocDeliveryStatus;
}

/**
 * 格式化后的论文检索响应
 */
export interface FormattedPapersResponse {
  papers: FormattedRelatedPaper[];
  keywords: string[];
  search_query: string;
}

// ============================================================================
// 公共服务函数
// ============================================================================

/**
 * 验证请求参数和会话权限（不发送响应）
 * @param params 请求参数
 * @param userId 用户ID
 * @returns 验证结果，包含会话信息或错误
 */
export async function validateConversation(
  params: MessageRequestParams,
  userId: string
): Promise<ConversationValidationResult | ConversationValidationError> {
  const { conversation_id, content } = params;

  // 1. 参数验证
  if (!conversation_id || !content) {
    return { success: false, errorMessage: "缺少必要参数" };
  }

  // 2. 验证会话所有权
  const isOwner = await verifyConversationOwner(conversation_id, userId);
  if (!isOwner) {
    return { success: false, errorMessage: "无权访问此会话" };
  }

  // 3. 获取会话信息
  const conversation = await getConversationById(conversation_id);
  if (!conversation) {
    return { success: false, errorMessage: "对话不存在" };
  }

  // 4. 判断对话类型
  const isPaperReading = conversation.conversationType === "paper_reading";

  return {
    success: true,
    conversation,
    isPaperReading,
  };
}

/**
 * 验证请求参数和会话权限
 * @param params 请求参数
 * @param userId 用户ID
 * @param res 响应对象（用于发送错误响应）
 * @returns 验证结果，包含会话信息或错误
 */
export async function validateAndGetConversation(
  params: MessageRequestParams,
  userId: string,
  res: NextApiResponse
): Promise<ConversationValidationResult | ConversationValidationError> {
  const { conversation_id, content } = params;

  // 1. 参数验证
  if (!conversation_id || !content) {
    sendWarnningResponse(res, "缺少必要参数");
    return { success: false, errorMessage: "缺少必要参数" };
  }

  // 2. 验证会话所有权
  const isOwner = await verifyConversationOwner(conversation_id, userId);
  if (!isOwner) {
    sendWarnningResponse(res, "无权访问此会话");
    return { success: false, errorMessage: "无权访问此会话" };
  }

  // 3. 获取会话信息
  const conversation = await getConversationById(conversation_id);
  if (!conversation) {
    sendWarnningResponse(res, "对话不存在");
    return { success: false, errorMessage: "对话不存在" };
  }

  // 4. 判断对话类型
  const isPaperReading = conversation.conversationType === "paper_reading";

  return {
    success: true,
    conversation,
    isPaperReading,
  };
}

/**
 * 准备用户消息（创建消息 + 关联引用/附件）
 * @param params 请求参数
 * @returns 用户消息和消息计数
 */
export async function prepareUserMessage(
  params: MessageRequestParams
): Promise<UserMessagePrepareResult | UserMessagePrepareError> {
  const { conversation_id, content, cited_paper_ids, attachment_ids } = params;

  // AI伴读论文数量限制：每个会话最多5篇论文
  const MAX_PAPERS_PER_CONVERSATION = 5;

  // 1. 如果有新附件，先检查论文数量是否超限
  if (attachment_ids && attachment_ids.length > 0) {
    // 获取当前会话已关联的论文数量（去重）
    const currentPaperCount = await countConversationPapers(conversation_id);

    // 计算新增的不重复论文数量
    // 由于 countConversationPapers 返回的是去重数量，我们需要确保新增的附件不会导致超限
    // 这里简单处理：总数（现有 + 新增）不超过限制
    // 注意：同一论文可能被多次引用，但实际只算一次
    const totalPotentialCount = currentPaperCount + attachment_ids.length;

    if (totalPotentialCount > MAX_PAPERS_PER_CONVERSATION) {
      const remainingSlots = MAX_PAPERS_PER_CONVERSATION - currentPaperCount;
      return {
        success: false,
        errorMessage: `每个AI伴读会话最多支持上传${MAX_PAPERS_PER_CONVERSATION}篇论文，当前已有${currentPaperCount}篇，还可上传${Math.max(
          0,
          remainingSlots
        )}篇`,
      };
    }
  }

  // 2. 获取当前消息数量
  const messageCount = await getMessageCount(conversation_id);

  // 3. 创建用户消息
  const userMessage = await createUserMessage({
    conversation_id,
    content,
    message_order: messageCount + 1,
  });

  if (!userMessage) {
    return { success: false, errorMessage: "创建用户消息失败" };
  }

  // 4. 如果有引用论文，创建引用关系
  if (cited_paper_ids && cited_paper_ids.length > 0) {
    await createBatchCitations(
      userMessage.message_id,
      cited_paper_ids,
      conversation_id
    );
  }

  // 5. 如果有附件，创建附件关系
  if (attachment_ids && attachment_ids.length > 0) {
    await createAttachmentsFromPaperIds(userMessage.message_id, attachment_ids);
  }

  return {
    success: true,
    userMessage,
    messageCount,
  };
}

/**
 * 更新会话设置（深度思考、论文检索、标题等）
 * @param conversationId 会话ID
 * @param params 请求参数
 * @param messageCount 当前消息数量
 * @returns 更新后的会话数据
 */
export async function updateConversationSettings(
  conversationId: string,
  params: MessageRequestParams,
  messageCount: number
): Promise<Record<string, unknown>> {
  const { content, is_deep_think, auto_search_papers } = params;

  const updateData: Record<string, unknown> = {
    message_count: messageCount + 1,
    last_message_at: new Date(),
  };

  // 更新深度思考状态
  if (typeof is_deep_think === "boolean") {
    updateData.is_deep_think = is_deep_think;
  }

  // 更新自动论文检索状态
  if (typeof auto_search_papers === "boolean") {
    updateData.autoSearchPapers = auto_search_papers;
  }

  // 如果是第一条消息且当前会话没有标题，自动生成标题
  if (messageCount === 0) {
    const conversation = await getConversationById(conversationId);
    if (!conversation?.title || conversation?.title === "新对话") {
      updateData.title = generateConversationTitle(content);
    }
  }

  await updateConversation(conversationId, updateData);

  return updateData;
}

/**
 * 执行自动论文检索
 * @param params 检索参数
 * @returns 检索结果和格式化后的论文列表
 */
export async function executeAutoSearch(params: {
  conversationId: string;
  content: string;
  messageId: string;
  isPaperReading: boolean;
  autoSearchPapers: boolean | undefined;
  conversationAutoSearch: boolean;
  logPrefix?: string;
}): Promise<PaperSearchResult> {
  const {
    conversationId,
    content,
    messageId,
    isPaperReading,
    autoSearchPapers,
    conversationAutoSearch,
    logPrefix = "",
  } = params;

  // 判断是否需要执行自动论文检索
  // 只有当明确传了 auto_search_papers: true 时才执行检索
  // 避免因前端未传参数而使用会话旧设置导致的意外检索
  const shouldAutoSearch = !isPaperReading && autoSearchPapers === true;

  if (!shouldAutoSearch) {
    return { searchResult: null, relatedPapers: undefined };
  }

  let searchResult: AutoRelatedPapersResult | null = null;

  try {
    logger.info(`开始自动论文检索${logPrefix}`, {
      conversationId,
      userQuestion: content.substring(0, 100),
    });

    searchResult = await autoSearchRelatedPapers({
      userQuestion: content,
      messageId,
      conversationId,
      maxResults: 5,
    });

    if (searchResult.success && searchResult.papers.length > 0) {
      logger.info(`论文检索完成，准备传给 LLM${logPrefix}`, {
        conversationId,
        foundPapers: searchResult.papers.length,
        keywords: searchResult.keywords,
      });
    } else {
      logger.info(`论文检索无结果或失败${logPrefix}`, {
        conversationId,
        success: searchResult.success,
        message: searchResult.message,
      });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.warn(`论文检索异常，继续正常对话${logPrefix}`, {
      error: errorMessage,
      conversationId,
    });
  }

  // 提取论文列表用于传给 LLM
  const relatedPapers =
    searchResult?.success && searchResult.papers.length > 0
      ? searchResult.papers
      : undefined;

  return { searchResult, relatedPapers };
}

/**
 * 格式化论文数据用于返回给前端
 * @param searchResult 检索结果
 * @param userId 用户 ID（用于查询文献传递状态）
 * @returns 格式化后的论文响应数据，如果无结果则返回 null
 */
export async function formatRelatedPapers(
  searchResult: AutoRelatedPapersResult | null,
  userId?: string
): Promise<FormattedPapersResponse | null> {
  if (!searchResult?.success || searchResult.papers.length === 0) {
    return null;
  }

  // 查询文献传递状态
  let deliveryStatusMap: Record<string, DocDeliveryStatus> = {};
  if (userId) {
    const paperIds = searchResult.papers.map((paper) => paper.id);
    deliveryStatusMap = await batchGetDocDeliveryStatusByPaperIds(
      userId,
      paperIds
    );
  }

  return {
    papers: searchResult.papers.map((paper, index) => ({
      index: index + 1, // 引用编号，与 AI 回复中的 [1] [2] 对应
      id: paper.id,
      title: paper.title,
      authors: paper.authors?.map((a) => a.name) || [],
      publication_name: paper.publication_name,
      publication_year: paper.publication_year,
      abstract: paper.abstract,
      doi: paper.doi,
      source: paper.source,
      source_id: paper.source_id,
      doc_delivery_status: deliveryStatusMap[paper.id],
    })),
    keywords: searchResult.keywords,
    search_query: searchResult.searchQuery,
  };
}

/**
 * 更新会话的最终消息数
 * @param conversationId 会话ID
 * @param messageCount 最终消息数
 */
export async function finalizeConversationMessageCount(
  conversationId: string,
  messageCount: number
): Promise<void> {
  await updateConversation(conversationId, {
    message_count: messageCount,
  });
}

// ============================================================================
// 附件内容相关
// ============================================================================

/**
 * 附件内容信息（用于 LLM 上下文）
 */
export interface AttachmentContent {
  id: string;
  title: string;
  content: string;
  file_name: string;
}

/**
 * 获取附件的解析内容（用于普通聊天场景）
 * 后端根据 attachment_ids 查询文件内容，而不是前端传递
 *
 * @param attachmentIds 附件 ID 列表
 * @returns 附件内容列表
 */
export async function getAttachmentContents(
  attachmentIds: string[]
): Promise<AttachmentContent[]> {
  if (!attachmentIds || attachmentIds.length === 0) {
    return [];
  }

  const papers = await findUploadedPapersByIds(attachmentIds);

  return papers
    .filter((paper) => paper.parsedContent) // 只返回有内容的
    .map((paper) => ({
      id: paper.id,
      title: paper.title,
      content: paper.parsedContent || "",
      file_name: paper.fileName,
    }));
}

/**
 * 获取会话中所有关联论文的解析内容
 * 用于普通聊天场景，获取整个会话关联的论文内容作为 LLM 上下文
 *
 * @param conversationId 会话 ID
 * @returns 论文内容列表
 */
export async function getConversationAttachmentContents(
  conversationId: string
): Promise<AttachmentContent[]> {
  const papers = await getConversationPapers(conversationId);

  return papers
    .filter((paper) => paper.parsed_content) // 只返回有内容的
    .map((paper) => ({
      id: paper.id,
      title: paper.title,
      content: paper.parsed_content,
      file_name: paper.file_name,
    }));
}
