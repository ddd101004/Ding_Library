import logger from "@/helper/logger";
import { getConversationById } from "@/db/chatConversation";
// import { findUploadedPaperById } from "@/db/ai-reading/uploadedPaper";
import { getAIChatApi } from "@/lib/ai/client";
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

    // 5. 调用通用 AI 函数
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
    await processLLMStream(stream, onToken);
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

    // 2. 提取结果和 token 统计
    const content = response.choices[0]?.message?.content || "";
    const input_tokens = response.usage?.prompt_tokens || 0;
    const output_tokens = response.usage?.completion_tokens || 0;
    const total_tokens = response.usage?.total_tokens || 0;
    const actual_model = response.model || model;

    // 3. 返回结果
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
