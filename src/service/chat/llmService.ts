import logger from "@/helper/logger";
import { getConversationById } from "@/db/chatConversation";
// import { findUploadedPaperById } from "@/db/ai-reading/uploadedPaper";
import { getAIChatApi } from "@/lib/ai/client";
import { pushBill } from "@/utils/pushBill";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// 导入 LLM 基础模块
import { buildContext } from "./llm/contextBuilder";
import { processLLMStream } from "./llm/streamProcessor";

// 导入相关论文类型
import type { RelatedPaper } from "./autoRelatedPapers";

// 导入附件内容类型和函数
import type { AttachmentContent } from "./messageService";
import { getConversationAttachmentContents } from "./messageService";

/**
 * 构建带论文引用的系统提示词
 * @param papers 相关论文列表
 * @returns 系统提示词
 */
function buildCitationSystemPrompt(papers: RelatedPaper[]): string {
  if (!papers || papers.length === 0) {
    return "";
  }

  let prompt = `\n\n你有以下参考文献可以使用。在回答时，如果你的回答内容来源于或参考了这些文献，请在相关内容后使用 [编号] 格式标注引用来源。

参考文献列表：
`;

  papers.forEach((paper, index) => {
    const authors = Array.isArray(paper.authors)
      ? paper.authors.slice(0, 3).join(", ") +
        (paper.authors.length > 3 ? " 等" : "")
      : paper.authors || "未知作者";

    prompt += `[${index + 1}] ${paper.title}`;
    if (authors) prompt += ` - ${authors}`;
    if (paper.publication_year) prompt += ` (${paper.publication_year})`;
    if (paper.publication_name) prompt += ` - ${paper.publication_name}`;
    prompt += "\n";

    if (paper.abstract) {
      // 截取摘要前200字
      const abstractPreview =
        paper.abstract.length > 200
          ? paper.abstract.substring(0, 200) + "..."
          : paper.abstract;
      prompt += `   摘要: ${abstractPreview}\n`;
    }
  });

  prompt += `
引用规则：
1. 你只能使用 [1] 到 [${papers.length}] 的引用编号，绝对不要使用超出此范围的编号
2. 当你的回答直接引用或参考了某篇文献的内容时，在该句末尾添加引用标记，如 [1] 或 [1][2]
3. 如果某个观点来自多篇文献，可以同时标注多个引用，如 [1][2]
4. 不要在每句话都加引用，只在确实参考了文献的地方标注
5. 如果问题与这些文献无关，可以不使用引用，直接回答
6. 引用标记应该紧跟在相关内容之后，标点符号之前
`;

  return prompt;
}

/**
 * 构建附件文档的系统提示词
 * 用于普通聊天场景，将用户上传的文档内容作为 LLM 上下文
 * @param attachments 附件内容列表
 * @returns 系统提示词
 */
function buildAttachmentSystemPrompt(attachments: AttachmentContent[]): string {
  if (!attachments || attachments.length === 0) {
    return "";
  }

  let prompt = `\n\n用户在本次对话中上传了以下文档，请基于这些文档内容来回答问题。

上传的文档列表：
`;

  attachments.forEach((doc, index) => {
    prompt += `\n---【文档 ${index + 1}】${doc.title || doc.file_name}---\n`;
    // 限制每个文档内容的长度，避免 token 超限
    const maxContentLength = 30000;
    if (doc.content.length > maxContentLength) {
      prompt +=
        doc.content.substring(0, maxContentLength) + "\n...(内容已截断)\n";
    } else {
      prompt += doc.content + "\n";
    }
  });

  prompt += `
---文档内容结束---

回答要求：
1. 优先基于上述文档内容回答用户问题
2. 如果问题超出文档范围，可以结合你的知识回答，但需说明
3. 引用文档内容时，可以注明来源文档名称
4. 对于技术性或专业性问题，保持准确性
`;

  return prompt;
}

/**
 * 调用聊天 LLM API（非流式）
 * @param conversation_id 会话ID
 * @param userInput 用户输入
 * @param relatedPapers 相关论文列表（可选），用于构建带引用的上下文
 * @param is_deep_think 是否启用深度思考模式（可选，以当次传入为准）
 */
export async function callChatLLM(
  conversation_id: string,
  userInput: string,
  relatedPapers?: RelatedPaper[],
  is_deep_think?: boolean
): Promise<{
  content: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
}> {
  try {
    // 1. 构建上下文
    const context = await buildContext(conversation_id);

    // 2. 获取会话配置
    const conversation = await getConversationById(conversation_id);

    if (!conversation) {
      throw new Error("会话不存在");
    }

    // 3. 根据深度思考模式选择模型（以当次传入为准）
    let model: string;
    if (is_deep_think === true) {
      // 深度思考模式
      model = process.env.LLM_THINKING_MODEL!;
      logger.info("使用深度思考模式", { model, conversation_id });
    } else {
      // 普通模式：使用会话配置的模型或默认模型
      model = process.env.LLM_MODEL!;
    }

    // 4. 构建消息列表
    const messages: ChatCompletionMessageParam[] = [...context];

    // 如果有相关论文，添加带引用的系统提示词
    if (relatedPapers && relatedPapers.length > 0) {
      const citationPrompt = buildCitationSystemPrompt(relatedPapers);
      messages.push({
        role: "system",
        content: citationPrompt,
      });
      logger.info("添加论文引用上下文（非流式）", {
        conversation_id,
        paperCount: relatedPapers.length,
      });
    }

    messages.push({ role: "user", content: userInput });

    // 5. 调用通用 AI 函数（自动处理 pushBill）
    const result = await callAI({
      user_id: conversation.user_id,
      messages,
      type: "chat_message",
      input_content: userInput,
      model,
    });

    return {
      content: result.content,
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.total_tokens,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`调用聊天LLM失败: ${errorMessage}`, { error });
    throw error;
  }
}

/**
 * 调用聊天 LLM API（流式）
 * @param conversation_id 会话ID
 * @param userInput 用户输入
 * @param onToken 每收到一个token的回调函数，参数为 { type: 'reasoning' | 'content', text: string }
 * @param relatedPapers 相关论文列表（可选），用于构建带引用的上下文
 * @param attachmentContents 附件内容列表（可选），用于普通聊天场景的文档上下文
 * @param is_deep_think 是否启用深度思考模式（可选，以当次传入为准）
 */
export async function callChatLLMStream(
  conversation_id: string,
  userInput: string,
  onToken: (data: { type: "reasoning" | "content"; text: string }) => void,
  relatedPapers?: RelatedPaper[],
  attachmentContents?: AttachmentContent[],
  is_deep_think?: boolean
): Promise<void> {
  try {
    // 1. 构建上下文
    const context = await buildContext(conversation_id);

    // 2. 获取会话配置
    const conversation = await getConversationById(conversation_id);

    if (!conversation) {
      throw new Error("会话不存在");
    }

    // 3. 根据深度思考模式选择模型（以当次传入为准）
    let model: string;
    if (is_deep_think === true) {
      // 深度思考模式
      model = process.env.LLM_THINKING_MODEL!;
      logger.info("使用深度思考模式（流式）", { model, conversation_id });
    } else {
      // 普通模式：使用会话配置的模型或默认模型
      model = process.env.LLM_MODEL!;
    }

    // 4. 构建消息列表
    const messages: ChatCompletionMessageParam[] = [...context];

    // 如果有相关论文，添加带引用的系统提示词
    if (relatedPapers && relatedPapers.length > 0) {
      const citationPrompt = buildCitationSystemPrompt(relatedPapers);
      // 在用户消息前添加论文引用上下文
      messages.push({
        role: "system",
        content: citationPrompt,
      });
      logger.info("添加论文引用上下文", {
        conversation_id,
        paperCount: relatedPapers.length,
      });
    }

    // 如果有附件内容（普通聊天上传的文档），添加文档上下文
    if (attachmentContents && attachmentContents.length > 0) {
      const attachmentPrompt = buildAttachmentSystemPrompt(attachmentContents);
      messages.push({
        role: "system",
        content: attachmentPrompt,
      });
      logger.info("添加附件文档上下文", {
        conversation_id,
        attachmentCount: attachmentContents.length,
        totalContentLength: attachmentContents.reduce(
          (sum, a) => sum + a.content.length,
          0
        ),
      });
    }

    messages.push({ role: "user", content: userInput });

    // 5. 调用LLM API - 使用 OpenAI SDK 流式接口（启用 usage 统计）
    const openai = await getAIChatApi();
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true }, // 启用 token 统计
    });

    // 6. 使用通用流式处理函数处理响应
    await processLLMStream(stream, onToken, {
      user_id: conversation.user_id,
      model,
      bill_type: "chat_message",
      input_content: userInput,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`调用聊天LLM流式API失败: ${errorMessage}`, { error });
    throw error;
  }
}

/**
 * 通用 AI 调用函数
 * 适用于非对话场景的 AI 调用
 * @param params 调用参数
 * @returns AI 响应结果和 token 统计
 */
export async function callAI(params: {
  user_id: string;
  messages: ChatCompletionMessageParam[];
  type: string;
  input_content: string;
  model?: string;
  temperature?: number;
}): Promise<{
  content: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  model: string;
}> {
  const {
    user_id,
    messages,
    type,
    input_content,
    model = process.env.LLM_MODEL!,
    temperature = 0.7,
  } = params;

  try {
    // 1. 调用 AI API
    const openai = await getAIChatApi();
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      stream: false,
    });

    // 2. 记录用量到 bill 表
    await pushBill(response, user_id, type, input_content);

    // 3. 提取结果和 token 统计
    const content = response.choices[0]?.message?.content || "";
    const input_tokens = response.usage?.prompt_tokens || 0;
    const output_tokens = response.usage?.completion_tokens || 0;
    const total_tokens = response.usage?.total_tokens || 0;
    const actual_model = response.model || model;

    // 4. 返回结果
    return {
      content,
      input_tokens,
      output_tokens,
      total_tokens,
      model: actual_model,
    };
  } catch (error: any) {
    logger.error(`调用AI失败: ${error?.message}`, { error, type });
    throw error;
  }
}

/**
 * 操作类型定义
 */
export type OperationType =
  | "analyze" // 分析理解
  | "translate" // 翻译
  | "summarize" // 总结
  | "explain"; // 解释

/**
 * 根据操作类型构建专用系统提示词
 */
function buildSystemPromptByOperationType(
  operationType: OperationType,
  contextText?: string,
  targetLanguage?: string
): string {
  switch (operationType) {
    case "translate":
      return `你是一个专业的学术论文翻译助手。请将以下论文片段翻译成${
        targetLanguage || "英文"
      }，保持学术性和专业性：

---
原文：
"${contextText || ""}"
---

翻译要求：
1. 保持学术术语的准确性
2. 保持原文的语气和风格
3. 必要时可以添加简短的注释说明专业术语
4. 确保翻译流畅自然`;

    case "summarize":
      return `你是一个专业的学术论文总结专家。请对以下论文片段进行简洁准确的总结：

---
原文：
"${contextText || ""}"
---

总结要求：
1. 提取核心观点和关键信息
2. 保持学术性和客观性
3. 使用简洁清晰的语言
4. 突出重要的研究发现或结论`;

    case "explain":
      return `你是一个专业的学术概念解释专家。请用通俗易懂的语言解释以下论文片段中的概念或内容：

---
需要解释的内容：
"${contextText || ""}"
---

解释要求：
1. 用简单的语言替换专业术语
2. 使用类比或例子帮助理解
3. 保持解释的准确性
4. 必要时可以分层次解释（从简单到深入）`;

    case "analyze":
    default:
      return `你是一个专业的学术论文阅读助手。你的任务是帮助用户理解和分析学术论文。

你应该：
1. 用简洁清晰的语言解释复杂的学术概念
2. 提供深入的分析和见解
3. 在适当时引用论文中的具体内容
4. 帮助用户理解研究方法、结果和结论
5. 回答用户关于论文的任何问题`;
  }
}

/**
 * 调用论文伴读 LLM API(流式)
 * 专门用于AI阅读助手的论文伴读场景
 *
 * @param params.conversation_id - 会话ID
 * @param params.userInput - 用户输入
 * @param params.contextText - 选中的论文文本（可选）
 * @param params.operationType - 操作类型（analyze/translate/summarize/explain）
 * @param params.targetLanguage - 目标语言（仅翻译时使用，默认"英文"）
 * @param params.overrideDeepThink - 消息级别的深度思考控制（可选，覆盖对话级别设置）
 * @param params.currentMessageAttachmentIds - 当前消息的附件ID列表（可选）
 * @param params.onToken - token回调函数
 * @returns token统计信息
 */
export async function callPaperReadingLLMStream(params: {
  conversation_id: string;
  userInput: string;
  contextText?: string;
  operationType?: OperationType;
  targetLanguage?: string;
  overrideDeepThink?: boolean;
  currentMessageAttachmentIds?: string[];
  onToken: (data: { type: "reasoning" | "content"; text: string }) => void;
}): Promise<{
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
}> {
  const {
    conversation_id,
    userInput,
    contextText,
    operationType = "analyze",
    targetLanguage = "英文",
    overrideDeepThink,
    currentMessageAttachmentIds,
    onToken,
  } = params;

  try {
    // 1. 获取会话配置
    const conversation = await getConversationById(conversation_id);
    if (!conversation) {
      throw new Error("会话不存在");
    }

    // 2. 根据操作类型构建专用系统提示词
    let systemPrompt = buildSystemPromptByOperationType(
      operationType,
      contextText,
      targetLanguage
    );

    // 3. 如果是分析操作，获取论文内容作为上下文
    // 策略：始终加载会话中所有论文，但标记当前消息上传的论文以便 AI 知道用户当前关注点
    if (operationType === "analyze") {
      // 获取会话中所有论文
      const allPapers = await getConversationAttachmentContents(
        conversation_id
      );

      // 判断是否有当前消息的附件
      const hasCurrentMessageAttachments =
        currentMessageAttachmentIds && currentMessageAttachmentIds.length > 0;

      if (allPapers.length > 0) {
        // 构建论文上下文，标记当前消息上传的论文
        if (hasCurrentMessageAttachments) {
          // 当前消息携带了论文附件，标记出来让 AI 知道用户当前关注的是哪些
          const currentUploadCount = currentMessageAttachmentIds.length;
          systemPrompt += `\n\n本次对话中的论文文档：`;

          allPapers.forEach((paper, index) => {
            const isCurrentUpload = currentMessageAttachmentIds.includes(
              paper.id
            );
            const marker = isCurrentUpload ? "【当前上传】" : "";
            systemPrompt += `\n\n---【文档 ${index + 1}】${marker}${
              paper.title || paper.file_name
            }---`;

            // 限制每个文档内容的长度，避免 token 超限
            const maxContentLength = 30000;
            if (paper.content && paper.content.length > maxContentLength) {
              systemPrompt += `\n${paper.content.substring(
                0,
                maxContentLength
              )}\n...(内容已截断)`;
            } else if (paper.content) {
              systemPrompt += `\n${paper.content}`;
            }
          });

          systemPrompt += `\n\n---论文内容结束---`;

          // 根据当前上传数量生成不同的提示
          if (currentUploadCount === 1) {
            systemPrompt += `\n\n注意：标记为【当前上传】的文档是用户刚刚上传的，请重点关注该文档来回答问题。如果用户询问与其他文档的对比，请综合分析所有文档。`;
          } else {
            systemPrompt += `\n\n注意：标记为【当前上传】的 ${currentUploadCount} 篇文档是用户刚刚上传的，请重点关注这些文档来回答问题。如果用户询问这些文档之间的对比或与其他文档的对比，请综合分析相关文档。`;
          }

          logger.info("AI伴读加载论文（含当前上传标记）", {
            conversation_id,
            totalPaperCount: allPapers.length,
            currentUploadCount,
            currentUploadIds: currentMessageAttachmentIds,
            paperTitles: allPapers.map((p) => p.title || p.file_name),
          });
        } else {
          // 当前消息没有携带论文附件，正常加载所有论文
          systemPrompt += `\n\n当前阅读的论文文档：`;

          allPapers.forEach((paper, index) => {
            systemPrompt += `\n\n---【文档 ${index + 1}】${
              paper.title || paper.file_name
            }---`;

            // 限制每个文档内容的长度，避免 token 超限
            const maxContentLength = 30000;
            if (paper.content && paper.content.length > maxContentLength) {
              systemPrompt += `\n${paper.content.substring(
                0,
                maxContentLength
              )}\n...(内容已截断)`;
            } else if (paper.content) {
              systemPrompt += `\n${paper.content}`;
            }
          });

          systemPrompt += `\n\n---论文内容结束---`;

          logger.info("AI伴读加载所有论文", {
            conversation_id,
            paperCount: allPapers.length,
            paperTitles: allPapers.map((p) => p.title || p.file_name),
          });
        }
      }

      // 如果有选中的文本，添加到系统提示词
      if (contextText) {
        systemPrompt += `

---
用户当前选中的论文文本：
"${contextText}"
---
请基于上述选中文本回答用户的问题。如果问题与选中文本无关，可以结合整篇论文来回答。`;
      }
    }

    // 4. 获取历史对话上下文
    const context = await buildContext(conversation_id);

    // 5. 根据深度思考模式选择模型
    // 优先使用消息级别的设置，如果未指定则使用对话级别的设置
    let model: string;
    const useDeepThink =
      overrideDeepThink !== undefined
        ? overrideDeepThink
        : conversation.is_deep_think;

    if (useDeepThink) {
      model = process.env.LLM_THINKING_MODEL!;
      logger.info("论文伴读使用深度思考模式", {
        model,
        conversation_id,
        messageLevel: overrideDeepThink !== undefined,
      });
    } else {
      model = process.env.LLM_MODEL!;
    }

    // 6. 构建完整消息列表
    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...context,
      { role: "user", content: userInput },
    ];

    // 7. 调用 LLM API（流式）
    const openai = await getAIChatApi();
    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    });

    // 8. 使用通用流式处理函数处理响应
    const result = await processLLMStream(stream, onToken, {
      user_id: conversation.user_id,
      model,
      bill_type: "paper_reading",
      input_content: userInput,
    });

    return {
      input_tokens: result.input_tokens,
      output_tokens: result.output_tokens,
      total_tokens: result.total_tokens,
      reasoning_tokens: result.reasoning_tokens,
    };
  } catch (error: any) {
    logger.error(`调用论文伴读LLM失败: ${error?.message}`, { error });
    throw error;
  }
}
