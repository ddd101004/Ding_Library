import { useEffect, useCallback } from "react";
import { useRouter } from "next/router";
import { Message, MessagePapers } from "@/components/chat/ChatSplitLayout";
import { apiGet, apiPost } from "@/api/request";
import { toast } from "sonner";
import { useRelatedPapers } from "./useRelatedPapers";
import useMessageFormatter from "@/hooks/use-message-formatter";

interface UseConversationDataParams {
  conversationId: string | string[] | undefined;
  initialMessage: string | string[] | undefined;
  userDisplayMessage: string | string[] | undefined;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setConversationDetail: React.Dispatch<React.SetStateAction<any>>;
  setIsFolderChatActive: React.Dispatch<React.SetStateAction<boolean>>;
  setShowRelatedPapers: React.Dispatch<React.SetStateAction<boolean>>;
  setRelatedPapersList: React.Dispatch<React.SetStateAction<MessagePapers[]>>;
  setLatestAiMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  hasInitializedRef: React.MutableRefObject<string | null>;
  hasSentInitialMessageRef: React.MutableRefObject<boolean>;
  isLoadingHistoryRef: React.MutableRefObject<string | null>;
  messageVersions: Record<string, any>;
  setMessageVersions: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setCurrentVersionMessageIds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onLoadBatchMessageVersions?: (
    conversationId: string,
    parentMessageIds: string[],
    formattedMessages: Message[],
    replaceWithLatest?: boolean,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => Promise<void>;
  scrollToBottom?: (force?: boolean) => void;
  sendMessage?: (content: string, isInitial?: boolean) => Promise<void>;
  getToken: () => string | null;
  clearUserInfo: () => void;
  checkFromHistory: () => boolean;
}

/**
 * 会话数据加载Hook
 * 处理会话详情、历史消息加载等逻辑
 */
export function useConversationData(params: UseConversationDataParams) {
  const {
    conversationId,
    initialMessage,
    userDisplayMessage,
    messages,
    setMessages,
    setConversationDetail,
    setIsFolderChatActive,
    setShowRelatedPapers,
    setRelatedPapersList,
    setLatestAiMessageId,
    hasInitializedRef,
    hasSentInitialMessageRef,
    isLoadingHistoryRef,
    messageVersions,
    setMessageVersions,
    setCurrentVersionMessageIds,
    onLoadBatchMessageVersions,
    scrollToBottom,
    sendMessage,
    getToken,
    clearUserInfo,
    checkFromHistory,
  } = params;

  const router = useRouter();
  const { getCurrentTime, formatMessage } = useMessageFormatter();
  const { extractPapersFromHistoryMessages } = useRelatedPapers({
    showRelatedPapers: false,
    setShowRelatedPapers: () => {},
    relatedPapersList: [],
    setRelatedPapersList: () => {},
    messages: [],
  });

  /**
   * 格式化消息时间
   */
  const formatMessageTime = useCallback((timeString: string): string => {
    try {
      const date = new Date(timeString);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) {
        return "刚刚";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes}分钟前`;
      } else if (diffInMinutes < 24 * 60) {
        return `${Math.floor(diffInMinutes / 60)}小时前`;
      } else {
        return date.toLocaleDateString("zh-CN", {
          month: "numeric",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } catch {
      return "未知时间";
    }
  }, []);

  /**
   * 判断消息内容是否包含引用标记
   */
  const containsReferences = useCallback((content: string): boolean => {
    if (!content) return false;

    const referencePatterns = [
      /参考文献/i,
      /参考来源/i,
      /资料引用/i,
      /引用自/i,
      /来源：/i,
      /\[参考文献\]/i,
      /\[引用\]/i,
      /citations/i,
      /references/i,
      /来源：http/,
      /www\./,
      /\.com/,
      /\.org/,
      /\.edu/,
      /\.cn/,
    ];

    return referencePatterns.some((pattern) => pattern.test(content));
  }, []);

  /**
   * 加载会话详情
   */
  const loadConversationDetail = useCallback(
    async (conversationId: string) => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("用户未登录");
        }

        const response = await apiGet<{
          conversation_id: string;
          title: string;
          model: string;
          is_deep_think: boolean;
          is_pinned: boolean;
          context_window: number;
          max_tokens: number;
          message_count: number;
          create_time: string;
          update_time: string;
          conversation_type: string;
          uploaded_paper_id: string | null;
          context_mode: string;
        }>(`/api/chat/conversations/${conversationId}`);

        if (response?.code === 200 && response.data) {
          setConversationDetail(response.data);

          const isFolderChat = response.data.conversation_type === "folder_rag";
          setIsFolderChatActive(isFolderChat);

          return response.data;
        }
      } catch (error) {
        console.error("加载会话详情失败:", error);
      }
      return null;
    },
    [getToken, setConversationDetail, setIsFolderChatActive]
  );

  /**
   * 加载会话历史记录
   */
  const loadConversationHistory = useCallback(
    async (conversationId: string): Promise<boolean> => {
      if (isLoadingHistoryRef.current === conversationId) {
        return false;
      }

      const hasLoadedMessages = sessionStorage.getItem(
        `hasLoaded_${conversationId}`
      );
      const currentIsFromHistory = checkFromHistory();

      if (hasLoadedMessages && !currentIsFromHistory && messages.length > 0) {
        return messages.length > 0;
      }

      try {
        isLoadingHistoryRef.current = conversationId;

        const token = getToken();
        if (!token) {
          throw new Error("用户未登录");
        }

        const response = await apiGet<{
          messages: Array<{
            message_id: string;
            conversation_id: string;
            role: "user" | "assistant";
            content: string;
            content_type: string;
            message_order: number;
            status: string;
            error_message: string | null;
            parent_message_id: string | null;
            input_tokens: number;
            output_tokens: number;
            total_tokens: number;
            create_time: string;
            update_time: string;
            message_type: string;
            reasoning_content: string | null;
            reasoning_tokens: number | null;
            context_text: string | null;
            context_range: {
              start: number;
              end: number;
              page?: number;
            } | null;
            is_liked: boolean;
            is_disliked: boolean;
            has_multiple_versions: boolean;
            citations: any[];
            attachments: Array<{
              id: string;
              uploaded_paper_id: string;
              file_name: string;
              file_type: string;
              file_size: number;
              attachment_order: number;
              parse_status: string;
            }>;
            thinking_time?: number;
          }> | null;
          total?: number;
          page?: number;
          size?: number;
          has_more?: boolean;
        }>("/api/chat/messages", {
          params: {
            conversation_id: conversationId,
            limit: 200,
            order: "asc",
          },
        });

        if (response?.code === 200) {
          const messagesData = response.data?.messages || [];

          if (messagesData.length === 0) {
            const currentIsFromHistory = checkFromHistory();
            if (currentIsFromHistory) {
              setMessages([]);
              toast.info("该会话没有历史消息");
            }
            return false;
          }

          const formattedMessages: Message[] = messagesData.map(
            (msg, index) => {
              let filesToDisplay: any[] = [];

              if (
                msg.attachments &&
                Array.isArray(msg.attachments) &&
                msg.attachments.length > 0
              ) {
                filesToDisplay = msg.attachments.map((attachment) => ({
                  file: {
                    name: attachment.file_name || "未知文件",
                    type: attachment.file_type || "",
                    size: attachment.file_size || 0,
                  },
                }));
              }

              if ((msg as any).files && Array.isArray((msg as any).files)) {
                const legacyFiles = (msg as any).files.map((fileData: any) => ({
                  file: {
                    name: fileData.name || fileData.fileName || "未知文件",
                    type: fileData.type || fileData.fileType || "",
                    size: fileData.size || fileData.fileSize || 0,
                  },
                }));
                filesToDisplay = [...filesToDisplay, ...legacyFiles];
              }

              let thinkingContent = "";
              let finalContent = msg.content || "";

              if (msg.role === "assistant" && msg.content) {
                if (
                  msg.reasoning_content &&
                  msg.reasoning_content.trim() !== ""
                ) {
                  thinkingContent = msg.reasoning_content;
                }
              }

              let referenceCountValue = 0;

              if ((msg as any).reference_count && (msg as any).reference_count > 0) {
                referenceCountValue = (msg as any).reference_count;
              } else if (msg.citations && Array.isArray(msg.citations)) {
                referenceCountValue = msg.citations.length;
              } else if (msg.content && containsReferences(msg.content)) {
                referenceCountValue = 2;
              } else {
                referenceCountValue = 2;
              }

              const hasThinking =
                !!thinkingContent && thinkingContent.trim() !== "";

              return {
                id: msg.message_id || `msg-${index}-${Date.now()}`,
                role: msg.role,
                content: finalContent,
                timestamp: formatMessageTime(msg.create_time),
                files: filesToDisplay,
                thinking: thinkingContent,
                isThinkingCollapsed: msg.role === "assistant" && hasThinking,
                referenceCount: referenceCountValue,
                backendId: msg.message_id,
                isStreaming: false,
                totalVersions: 1,
                currentVersion: 1,
                isLiked: (msg as any).is_liked || false,
                isDisliked: (msg as any).is_disliked || false,
              };
            }
          );

          setMessages(formattedMessages);

          const lastAiMessage = formattedMessages
            .slice()
            .reverse()
            .find((msg) => msg.role === "assistant");
          if (lastAiMessage?.backendId) {
            setLatestAiMessageId(lastAiMessage.backendId);
          }

          if (scrollToBottom) {
            setTimeout(() => {
              scrollToBottom(true);
            }, 300);
          }

          const messagesWithMultipleVersions = messagesData.filter(
            (msg) => msg.has_multiple_versions && msg.parent_message_id
          );

          if (
            messagesWithMultipleVersions.length > 0 &&
            onLoadBatchMessageVersions
          ) {
            const parentMessageIds = messagesWithMultipleVersions
              .map((msg) => msg.parent_message_id!)
              .filter((id, index, self) => self.indexOf(id) === index);

            onLoadBatchMessageVersions(
              conversationId,
              parentMessageIds,
              formattedMessages,
              true, // replaceWithLatest - 使用最新版本内容
              setMessages // 传递 setMessages 以更新消息列表
            );
          }

          if (formattedMessages.length > 0) {
            const currentIsFromHistory = checkFromHistory();

            const messagePapersList = extractPapersFromHistoryMessages(
              messagesData
            );

            if (messagePapersList.length > 0) {
              setRelatedPapersList(messagePapersList);
              setShowRelatedPapers(true);
            } else if (currentIsFromHistory) {
              try {
                const relatedPapersResponse = await apiGet<{
                  total: number;
                  papers: Array<{
                    id: string;
                    title: string;
                    authors: string;
                    publication_name: string;
                    publication_year: number;
                    abstract: string;
                    doi: string;
                    source: string;
                    source_id: string;
                    search_keywords: string;
                  }>;
                }>(
                  `/api/chat/conversations/${conversationId}/related-papers`
                );

                if (
                  relatedPapersResponse?.code === 200 &&
                  relatedPapersResponse.data?.papers &&
                  relatedPapersResponse.data.papers.length > 0
                ) {
                  const papersWithIndex = relatedPapersResponse.data.papers.map(
                    (paper, index) => ({
                      ...paper,
                      authors: paper.authors
                        ? Array.isArray(paper.authors)
                          ? paper.authors
                          : paper.authors
                              .split(",")
                              .map((a: string) => a.trim())
                        : [],
                      index: index + 1,
                    })
                  );

                  const historyRelatedPapers: MessagePapers = {
                    messageId: "history",
                    papers: papersWithIndex,
                    keywords: [],
                    search_query: "",
                  };

                  setRelatedPapersList([historyRelatedPapers]);
                  setShowRelatedPapers(true);
                }
              } catch (error) {
                console.error("加载相关论文失败:", error);
              }
            }
          }

          return formattedMessages.length > 0;
        } else {
          throw new Error(response?.message || "获取历史消息失败");
        }
      } catch (error: unknown) {
        console.error("加载会话历史失败:", error);
        const currentIsFromHistory = checkFromHistory();

        if (error instanceof Error) {
          if (currentIsFromHistory) {
            toast.error(`加载历史消息失败: ${error.message}`);
          }

          if (
            error.message.includes("未登录") ||
            error.message.includes("401")
          ) {
            clearUserInfo();
            setTimeout(() => {
              window.location.href = "/login";
            }, 1000);
          }
        } else {
          if (currentIsFromHistory) {
            toast.error("加载会话历史失败");
          }
        }
        return false;
      } finally {
        isLoadingHistoryRef.current = null;
      }
    },
    [
      messages,
      getToken,
      checkFromHistory,
      setMessages,
      setLatestAiMessageId,
      setRelatedPapersList,
      setShowRelatedPapers,
      onLoadBatchMessageVersions,
      scrollToBottom,
      clearUserInfo,
      formatMessageTime,
      containsReferences,
      extractPapersFromHistoryMessages,
      isLoadingHistoryRef,
    ]
  );

  /**
   * 初始化会话
   */
  useEffect(() => {
    const conversationIdStr = Array.isArray(conversationId)
      ? conversationId[0]
      : conversationId;

    if (!conversationIdStr) {
      return;
    }

    if (hasInitializedRef.current === conversationIdStr) {
      return;
    }

    hasInitializedRef.current = conversationIdStr;

    setShowRelatedPapers(false);
    setRelatedPapersList([]);

    const hasLoadedMessages = sessionStorage.getItem(
      `hasLoaded_${conversationIdStr}`
    );
    const currentIsFromHistory = checkFromHistory();

    if (currentIsFromHistory) {
      sessionStorage.removeItem(`hasLoaded_${conversationIdStr}`);
    }

    loadConversationDetail(conversationIdStr).then((conversationDetail) => {
      return loadConversationHistory(conversationIdStr).then(
        (hasHistoryMessages) => {
          return { conversationDetail, hasHistoryMessages };
        }
      );
    }).then(({ conversationDetail, hasHistoryMessages }) => {
      if (hasHistoryMessages || messages.length > 0) {
        if (scrollToBottom) {
          setTimeout(() => {
            scrollToBottom(true);
          }, 400);
        }
      }

      const messageCount = conversationDetail?.message_count || 0;
      const hasExistingMessages = messageCount > 0 || hasHistoryMessages;

      const shouldSendMessage =
        !currentIsFromHistory &&
        !hasExistingMessages &&
        initialMessage &&
        initialMessage !== "开始对话";

      if (shouldSendMessage && sendMessage) {
        const getSafeMessage = () => {
          if (!initialMessage) return "";
          if (Array.isArray(initialMessage)) {
            return initialMessage[0]?.trim() || "";
          }
          return (initialMessage as string).trim() || "";
        };

        const messageContent = getSafeMessage();
        if (messageContent) {
          sendMessage(messageContent, true);
        }
      }

      if (initialMessage && initialMessage !== "开始对话") {
        sessionStorage.setItem(
          `hasLoaded_${conversationIdStr}`,
          "true"
        );
      }
    });
  }, [conversationId, initialMessage]);

  return {
    loadConversationDetail,
    loadConversationHistory,
  };
}
