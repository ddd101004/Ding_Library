import { useCallback } from "react";
import { Message, MessagePapers } from "@/components/chat/ChatSplitLayout";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/api/request";
import { useStreaming } from "./useStreaming";

interface UseMessageActionsParams {
  conversationId: string | string[] | undefined;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  currentStreamControllerRef: React.MutableRefObject<AbortController | null>;
  isDeepThinkActiveRef: React.MutableRefObject<boolean>;
  isPaperSearchActiveRef: React.MutableRefObject<boolean>;
  hasSentInitialMessageRef: React.MutableRefObject<boolean>;
  currentRequestRef: React.MutableRefObject<string | null>;
  isFeedbackInProgressRef: React.MutableRefObject<boolean>;
  setLatestAiMessageId?: React.Dispatch<React.SetStateAction<string | null>>;
  messageVersions: Record<string, any>;
  setMessageVersions: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  currentVersionMessageIds: Record<string, string>;
  setCurrentVersionMessageIds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLoadMessageVersions?: (messageId: string) => Promise<void>;
  onLoadBatchMessageVersions?: (
    conversationId: string,
    parentMessageIds: string[],
    formattedMessages: Message[],
    replaceWithLatest?: boolean,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => Promise<void>;
  onFilesCleared?: () => void;
  getToken: () => string | null;
  clearUserInfo: () => void;
  getCurrentTime: () => string;
  checkFromHistory: () => boolean;
  uploadedFiles?: any[];
  pendingFiles?: any[];
  setPendingFiles?: React.Dispatch<React.SetStateAction<any[]>>;
  userDisplayMessage?: string | string[] | undefined;
  initialMessage?: string | string[] | undefined;
  onSetIsFromHistory?: (value: boolean) => void;
  setRelatedPapersList?: React.Dispatch<React.SetStateAction<MessagePapers[]>>;
  setShowRelatedPapers?: React.Dispatch<React.SetStateAction<boolean>>;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 消息操作Hook
 * 处理复制、重新生成、停止流式输出、发送消息等操作
 */
export function useMessageActions(params: UseMessageActionsParams) {
  const {
    conversationId,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    inputText,
    setInputText,
    currentStreamControllerRef,
    isDeepThinkActiveRef,
    isPaperSearchActiveRef,
    hasSentInitialMessageRef,
    currentRequestRef,
    isFeedbackInProgressRef,
    setLatestAiMessageId,
    messageVersions,
    setMessageVersions,
    currentVersionMessageIds,
    setCurrentVersionMessageIds,
    onLoadMessageVersions,
    onLoadBatchMessageVersions,
    onFilesCleared,
    getToken,
    clearUserInfo,
    getCurrentTime,
    checkFromHistory,
    uploadedFiles = [],
    pendingFiles = [],
    setPendingFiles,
    userDisplayMessage,
    initialMessage,
    onSetIsFromHistory,
  } = params;

  const { processStreamResponse } = useStreaming({
    messages,
    setMessages,
    setIsLoading,
    currentStreamControllerRef,
    setLatestAiMessageId,
    setRelatedPapersList: params.setRelatedPapersList,
    setShowRelatedPapers: params.setShowRelatedPapers,
    conversationId: params.conversationId,
    messagesEndRef: params.messagesEndRef,
  });

  /**
   * 复制消息内容
   */
  const copyMessageContent = useCallback(
    async (messageId: string) => {
      const message = messages.find(
        (msg) => msg.id === messageId || msg.backendId === messageId
      );

      if (!message) {
        toast.error("消息不存在，无法复制");
        return;
      }

      try {
        await navigator.clipboard.writeText(message.content);
        toast.success("已复制到剪贴板");
      } catch (err) {
        console.error("复制失败:", err);
        toast.error("复制失败，请重试");
      }
    },
    [messages]
  );

  /**
   * 停止流式输出
   */
  const stopStreaming = useCallback(() => {
    if (currentStreamControllerRef.current) {
      const controller = currentStreamControllerRef.current;

      try {
        if (controller && !controller.signal.aborted) {
          controller.abort("User stopped streaming");
          setMessages((prev) =>
            prev.map((msg) =>
              msg.isStreaming ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsLoading(false);
          toast.success("已停止输出");
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("停止流式输出时发生错误:", error.message);
        }
      } finally {
        currentStreamControllerRef.current = null;
      }
    }
  }, [currentStreamControllerRef, setMessages, setIsLoading]);

  /**
   * 重新生成响应
   */
  const regenerateResponse = useCallback(
    async (messageId: string) => {
      const targetMessage = messages.find(
        (msg) => msg.id === messageId || msg.backendId === messageId
      );

      if (!targetMessage) {
        toast.error("消息不存在，无法重新生成");
        return;
      }

      if (targetMessage.role !== "assistant") {
        toast.error("无法重新生成用户消息");
        return;
      }

      const actualMessageId = targetMessage.backendId || targetMessage.id;

      if (!actualMessageId) {
        console.error("无法重新生成：缺少消息ID");
        toast.error("该消息无法重新生成，请尝试发送新消息");
        return;
      }

      const messageIndex = messages.findIndex(
        (msg) =>
          msg.id === targetMessage.id || msg.backendId === targetMessage.backendId
      );

      if (messageIndex <= 0) {
        toast.error("找不到对应的用户消息");
        return;
      }

      const userMessage = messages[messageIndex - 1];
      if (userMessage.role !== "user") {
        toast.error("无法重新生成：找不到对应的用户消息");
        return;
      }

      if (currentStreamControllerRef.current) {
        currentStreamControllerRef.current.abort();
        currentStreamControllerRef.current = null;
      }

      setMessages((prev) => prev.slice(0, messageIndex));
      setIsLoading(true);

      if (setLatestAiMessageId) {
        setLatestAiMessageId(null);
      }

      const newAiMessageId = `assistant-${Date.now()}`;

      const aiMessage: Message = {
        id: newAiMessageId,
        role: "assistant",
        content: "",
        timestamp: getCurrentTime(),
        isStreaming: true,
        totalVersions: 1,
        currentVersion: 1,
        backendId: targetMessage.backendId,
      };

      setMessages((prev) => [...prev, aiMessage]);

      try {
        const token = getToken();
        if (!token) {
          throw new Error("用户未登录");
        }

        const controller = new AbortController();
        currentStreamControllerRef.current = controller;

        const apiUrl = targetMessage.backendId
          ? `/api/chat/messages/${actualMessageId}/regenerate`
          : `/api/chat/messages/regenerate`;

        const requestBody = targetMessage.backendId
          ? {
              conversation_id: conversationId,
              is_deep_think: isDeepThinkActiveRef.current,
              stream: true,
            }
          : {
              message_id: actualMessageId,
              conversation_id: conversationId,
              is_deep_think: isDeepThinkActiveRef.current,
              stream: true,
            };

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error("重新生成API错误响应:", errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        const onLoadVersions = (newBackendId: string) => {
          setTimeout(async () => {
            if (
              newBackendId &&
              conversationId &&
              onLoadBatchMessageVersions
            ) {
              await onLoadBatchMessageVersions(
                conversationId as string,
                [newBackendId],
                messages,
                false,
                setMessages
              );
            }
          }, 1000);
        };

        await processStreamResponse(response.body, newAiMessageId, onLoadVersions);
      } catch (error: unknown) {
        console.error("重新生成失败:", error);

        if (error instanceof Error && error.name === "AbortError") {
          toast.info("已取消重新生成");
          return;
        }

        let errorMessage = "重新生成失败，请重试";
        if (error instanceof Error && error.message) {
          errorMessage = error.message;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newAiMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: errorMessage,
                  backendId: targetMessage.backendId,
                }
              : msg
          )
        );

        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
        currentStreamControllerRef.current = null;
      }
    },
    [
      messages,
      setMessages,
      setIsLoading,
      setLatestAiMessageId,
      getCurrentTime,
      getToken,
      currentStreamControllerRef,
      isDeepThinkActiveRef,
      conversationId,
      processStreamResponse,
      onLoadBatchMessageVersions,
    ]
  );

  /**
   * 处理反馈成功后的回调
   */
  const handleFeedbackSuccess = useCallback(
    (messageId: string, feedbackType: "like" | "dislike" | "cancel_like" | "cancel_dislike") => {
      isFeedbackInProgressRef.current = true;

      let newIsLiked = false;
      let newIsDisliked = false;

      if (feedbackType === "like") {
        newIsLiked = true;
        newIsDisliked = false;
      } else if (feedbackType === "dislike") {
        newIsLiked = false;
        newIsDisliked = true;
      } else if (feedbackType === "cancel_like") {
        newIsLiked = false;
        newIsDisliked = false;
      } else if (feedbackType === "cancel_dislike") {
        newIsLiked = false;
        newIsDisliked = false;
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.backendId === messageId) {
            return { ...msg, isLiked: newIsLiked, isDisliked: newIsDisliked };
          }
          return msg;
        })
      );

      setMessageVersions((prev) => {
        const updated = { ...prev };

        const currentVersionMessageId = currentVersionMessageIds[messageId];

        if (currentVersionMessageId && updated[currentVersionMessageId]) {
          updated[currentVersionMessageId] = {
            ...updated[currentVersionMessageId],
            isLiked: newIsLiked,
            isDisliked: newIsDisliked,
          };

          const versionInfo = updated[currentVersionMessageId];
          if (versionInfo.allVersions && versionInfo.currentVersion) {
            const currentVersionIndex = versionInfo.currentVersion - 1;
            if (versionInfo.allVersions[currentVersionIndex]) {
              const updatedVersions = [...versionInfo.allVersions];
              updatedVersions[currentVersionIndex] = {
                ...updatedVersions[currentVersionIndex],
                is_liked: newIsLiked,
                is_disliked: newIsDisliked,
              };

              if (versionInfo.rootMessageId && updated[versionInfo.rootMessageId]) {
                updated[versionInfo.rootMessageId] = {
                  ...updated[versionInfo.rootMessageId],
                  allVersions: updatedVersions,
                };
              }
            }
          }
        }

        return updated;
      });

      setTimeout(() => {
        isFeedbackInProgressRef.current = false;
      }, 500);
    },
    [setMessages, setMessageVersions, currentVersionMessageIds, isFeedbackInProgressRef]
  );

  return {
    copyMessageContent,
    stopStreaming,
    regenerateResponse,
    handleFeedbackSuccess,
    processStreamResponse,
  };
}
