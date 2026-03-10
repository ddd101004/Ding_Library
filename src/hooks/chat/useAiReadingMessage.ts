import { useCallback } from "react";
import { useRouter } from "next/router";
import { Message } from "@/components/chat/ChatSplitLayout";
import { apiPost, apiGet } from "@/api/request";
import { toast } from "sonner";
import { useStreaming } from "./useStreaming";
import { AIOperation } from "@/components/ai-reading/types";

interface UseAiReadingMessageParams {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  currentStreamControllerRef: React.MutableRefObject<AbortController | null>;
  isDeepThinkActiveRef: React.MutableRefObject<boolean>;
  hasSentInitialMessageRef: React.MutableRefObject<boolean>;
  setLatestAiMessageId?: React.Dispatch<React.SetStateAction<string | null>>;
  onLoadBatchMessageVersions?: (
    conversationId: string,
    parentMessageIds: string[],
    formattedMessages: Message[],
    replaceWithLatest?: boolean,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => Promise<void>;
  getToken: () => string | null;
  clearUserInfo: () => void;
  getCurrentTime: () => string;
  uploadedFiles?: any[];
  paperInfo?: any;
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  onFileCleared?: () => void;
}

/**
 * AI 伴读消息发送 Hook
 * 处理 AI 伴读特有的消息发送逻辑（支持操作类型）
 */
export function useAiReadingMessage(params: UseAiReadingMessageParams) {
  const {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    inputText,
    setInputText,
    currentStreamControllerRef,
    isDeepThinkActiveRef,
    hasSentInitialMessageRef,
    setLatestAiMessageId,
    onLoadBatchMessageVersions,
    getToken,
    clearUserInfo,
    getCurrentTime,
    uploadedFiles = [],
    paperInfo,
    conversationId,
    setConversationId,
    onFileCleared,
  } = params;

  const router = useRouter();

  const { processStreamResponse } = useStreaming({
    messages,
    setMessages,
    setIsLoading,
    currentStreamControllerRef,
    setLatestAiMessageId,
  });

  /**
   * 创建 AI 伴读会话
   * @param paperIds 论文 ID 数组（如果不提供则使用 paperInfo.id 包装成数组）
   */
  const createAiReadingConversation = useCallback(async (paperIds?: string[]) => {
    if (typeof window === "undefined") return null;

    try {
      const token = getToken();
      if (!token) {
        throw new Error("用户未登录");
      }

      // 优先使用传入的参数，其次使用状态
      const finalPaperIds = paperIds || (paperInfo?.id ? [paperInfo.id] : []);

      if (finalPaperIds.length === 0) {
        throw new Error("论文 ID 不能为空");
      }



      const response = await apiPost<{
        conversation_id: string;
      }>("/api/chat/conversations", {
        conversation_type: "paper_reading",
        uploaded_paper_ids: finalPaperIds,
      });

      if (response.code === 200 && response.data?.conversation_id) {
        setConversationId(response.data.conversation_id);

        // 保存到 sessionStorage
        sessionStorage.setItem("aiReadingConversationId", response.data.conversation_id);

        return response.data.conversation_id;
      } else {
        throw new Error(response.message || "创建会话失败");
      }
    } catch (error: unknown) {
      console.error("创建 AI 伴读会话失败:", error);

      if (error instanceof Error) {
        if (error.message.includes("未登录") || error.message.includes("401")) {
          clearUserInfo();
          toast.error("用户未登录，请重新登录");
          setTimeout(() => {
            window.location.href = "/login";
          }, 1000);
        } else {
          toast.error(`创建会话失败: ${error.message}`);
        }
      }

      return null;
    }
  }, [getToken, paperInfo, setConversationId, clearUserInfo]);

  /**
   * 发送带操作类型的消息
   * @param content 消息内容
   * @param operation 操作类型
   * @param overrideConversationId 可选，覆盖当前的 conversationId（用于刚创建的会话）
   * @param citationContent 可选，引用的论文内容
   * @param attachmentIds 可选，文件附件 ID 列表
   */
  const sendMessageWithOperation = useCallback(async (
    content: string,
    operation: AIOperation | null = null,
    overrideConversationId?: string,
    citationContent?: string,
    attachmentIds?: string[]
  ) => {
    // 优先使用传入的 overrideConversationId，其次使用状态中的 conversationId
    const effectiveConversationId = overrideConversationId || conversationId;

    console.log("AI伴读 - sendMessageWithOperation 被调用:", {
      content,
      conversationId,
      overrideConversationId,
      effectiveConversationId,
      isLoading,
      hasController: !!currentStreamControllerRef.current,
    });

    if (!effectiveConversationId || isLoading) {
      console.log("AI伴读 - 发送消息被阻止:", {
        reason: !effectiveConversationId ? "没有 conversationId" : "正在加载",
        effectiveConversationId,
        isLoading,
      });
      return;
    }

    if (currentStreamControllerRef.current) {
      console.log("AI伴读 - 发送消息被阻止: 已有流式请求在进行");
      return;
    }

    console.log("AI伴读 - 开始发送消息流程");
    setIsLoading(true);
    setLatestAiMessageId?.(null);

    const controller = new AbortController();
    currentStreamControllerRef.current = controller;

    // 创建用户消息（不包含 files 字段，文件已通过 attachment_ids 发送）
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content,
      timestamp: getCurrentTime(),
    };

    setMessages((prev) => [...prev, userMessage]);
    console.log("AI伴读 - 用户消息已添加到列表:", userMessage.id);

    // 创建 AI 消息
    const aiMessageId = `assistant-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: getCurrentTime(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, aiMessage]);
    console.log("AI伴读 - AI 消息已添加到列表:", aiMessageId);

    setInputText("");
    if (onFileCleared) {
      onFileCleared();
    }

    try {
      const token = getToken();
      if (!token) {
        throw new Error("用户未登录");
      }

      const requestBody: any = {
        conversation_id: effectiveConversationId,
        content: content,
        is_deep_think: isDeepThinkActiveRef.current,
        stream: true,
      };

      // 如果有操作类型，添加到请求中
      if (operation) {
        requestBody.operation_type = operation;
      }

      // 如果有引用内容，添加到请求中
      if (citationContent) {
        requestBody.citation_content = citationContent;
      }

      // 如果有文件附件 ID，添加到请求中
      if (attachmentIds && attachmentIds.length > 0) {
        requestBody.attachment_ids = attachmentIds;
      }

      console.log("AI伴读 - 准备发送流式请求:", {
        url: "/api/chat/messages/stream",
        requestBody: {
          ...requestBody,
          conversation_id: effectiveConversationId,
        },
      });

      const response = await fetch("/api/chat/messages/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      console.log("AI伴读 - 流式响应已接收:", {
        status: response.status,
        ok: response.ok,
        hasBody: !!response.body,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      console.log("AI伴读 - 开始处理流式响应");
      await processStreamResponse(response.body, aiMessageId, async (newBackendId: string) => {
        if (newBackendId && effectiveConversationId && onLoadBatchMessageVersions) {
          setTimeout(async () => {
            await onLoadBatchMessageVersions(
              effectiveConversationId,
              [newBackendId],
              messages,
              false,
              setMessages
            );
          }, 1000);
        }
      });
    } catch (error: unknown) {
      console.error("发送消息失败:", error);

      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      let errorMessage = "发送失败，请重试";
      if (error instanceof Error && error.message) {
        errorMessage = error.message;
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                isStreaming: false,
                content: errorMessage,
              }
            : msg
        )
      );

      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
      currentStreamControllerRef.current = null;
    }
  }, [
    conversationId,
    isLoading,
    currentStreamControllerRef,
    isDeepThinkActiveRef,
    uploadedFiles,
    messages,
    getToken,
    processStreamResponse,
    onLoadBatchMessageVersions,
    setLatestAiMessageId,
    getCurrentTime,
    onFileCleared,
    setInputText,
    setMessages,
    setIsLoading,
    clearUserInfo,
  ]);

  return {
    createAiReadingConversation,
    sendMessageWithOperation,
    processStreamResponse,
  };
}
