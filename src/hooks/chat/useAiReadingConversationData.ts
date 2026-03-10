import { useCallback, useEffect } from "react";
import { Message } from "@/components/chat/ChatSplitLayout";
import { apiGet } from "@/api/request";
import { toast } from "sonner";

interface PaperInfo {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  file_name: string;
  file_size: number;
  file_type: string;
  parse_status: string;
  parsed_content: string;
  page_count: number | null;
  word_count: number | null;
  file_url?: string;
}

interface UseAiReadingConversationDataParams {
  conversationId: string | null;
  setConversationId: React.Dispatch<React.SetStateAction<string | null>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setMessageError: React.Dispatch<React.SetStateAction<string | null>>;
  setPaperInfo: React.Dispatch<React.SetStateAction<PaperInfo | null>>;
  setCurrentPdfInfo: React.Dispatch<React.SetStateAction<any>>;
  setSelectedFileIndex: React.Dispatch<React.SetStateAction<number>>;
  setAllUploadedFiles: React.Dispatch<React.SetStateAction<any[]>>;
  loadPaperAnnotations: (paperId: string) => Promise<any[]>;
  setLatestAiMessageId: React.Dispatch<React.SetStateAction<string | null>>;
  conversationIdRef: React.MutableRefObject<string | null>;
  isLoadingHistoryRef: React.MutableRefObject<string | null>;
  onLoadBatchMessageVersions?: (
    conversationId: string,
    parentMessageIds: string[],
    formattedMessages: Message[],
    replaceWithLatest?: boolean,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => Promise<void>;
  getToken: () => string | null;
  clearUserInfo: () => void;
}

/**
 * AI 伴读会话数据加载 Hook
 * 处理 AI 伴读特有的会话历史加载逻辑
 */
export function useAiReadingConversationData(params: UseAiReadingConversationDataParams) {
  const {
    conversationId,
    setConversationId,
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    setMessageError,
    setPaperInfo,
    setCurrentPdfInfo,
    setSelectedFileIndex,
    setAllUploadedFiles,
    loadPaperAnnotations,
    setLatestAiMessageId,
    conversationIdRef,
    isLoadingHistoryRef,
    onLoadBatchMessageVersions,
    getToken,
    clearUserInfo,
  } = params;

  /**
   * 从 content 中提取思考过程的辅助函数
   */
  const extractThinkingFromContent = useCallback((content: string) => {
    let thinking = "";
    let finalContent = content;

    const thinkRegex = /([\s\S]*?)<\/think>/i;
    const thinkMatch = content.match(thinkRegex);

    if (thinkMatch) {
      thinking = thinkMatch[1].trim();
      finalContent = content.replace(thinkRegex, "").trim();
    }

    return { thinking, content: finalContent };
  }, []);

  /**
   * 从URL获取当前时间
   */
  const getCurrentTime = useCallback(() => {
    return new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  /**
   * 加载会话历史记录
   */
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!conversationId) {
        if (messages.length === 0) {
          setPaperInfo(null);
          setCurrentPdfInfo(null);
        }
        return;
      }

      if (isLoadingHistoryRef.current === conversationId) {
        return;
      }

      // 如果当前有消息且包含正在流式传输的消息，不加载历史记录
      // 避免覆盖刚刚发送的消息
      const hasStreamingMessage = messages.some(msg => msg.isStreaming);
      const hasUserMessageJustSent = messages.some(msg => msg.role === 'user');

      if (hasStreamingMessage || (hasUserMessageJustSent && messages.length > 0)) {
        
        return;
      }

      setIsLoading(true);
      isLoadingHistoryRef.current = conversationId;
      conversationIdRef.current = conversationId;

      try {
        const token = getToken();
        if (!token) {
          throw new Error("用户未登录");
        }

        const response = await apiGet<{
          conversation_id: string;
          title: string;
          created_at: string;
          updated_at: string;
          papers?: PaperInfo[];
        }>(`/api/chat/conversations/${conversationId}`);

        if (response.code === 200 && response.data) {
          const { papers } = response.data;

          console.log("AI伴读 - 加载会话详情成功:", {
            conversationId,
            papersCount: papers?.length || 0,
          });

          // 更新论文信息（API返回的是 papers 数组，取第一个）
          if (papers && papers.length > 0) {
            const paper_info = papers[0];
            setPaperInfo(paper_info);
            if (paper_info.file_url) {
              setCurrentPdfInfo({
                id: paper_info.id,
                file_url: paper_info.file_url,
              });
            }

            // 优先使用 sessionStorage 中的文件列表，其次使用 API 返回的
            // 但需要检查 sessionStorage 中存储的 conversationId 是否匹配
            let finalFiles: any[] = [];
            let shouldUseSessionStorage = false;

            if (typeof window !== "undefined") {
              const sessionStorageFiles = sessionStorage.getItem("aiReadingFiles");
              const sessionStorageConversationId = sessionStorage.getItem("aiReadingConversationId");

              // 检查 sessionStorage 中的 conversationId 是否与当前匹配
              const isMatchingConversation = sessionStorageConversationId === conversationId;

              console.log("AI伴读 - sessionStorage 检查:", {
                hasFiles: !!sessionStorageFiles,
                sessionStorageConversationId,
                currentConversationId: conversationId,
                isMatchingConversation
              });

              if (sessionStorageFiles && isMatchingConversation) {
                try {
                  const parsedFiles = JSON.parse(sessionStorageFiles);
                  if (parsedFiles.length > 0) {
                    console.log("AI伴读 - 使用 sessionStorage 中的文件列表:", parsedFiles.length, "个文件");
                    finalFiles = parsedFiles;
                    shouldUseSessionStorage = true;
                  }
                } catch (error) {
                  console.error("解析 sessionStorage 文件列表失败:", error);
                }
              } else if (sessionStorageFiles && !isMatchingConversation) {
                console.log("AI伴读 - sessionStorage 中的 conversationId 不匹配，忽略缓存文件");
              }
            }

            // 如果 sessionStorage 中没有文件或不匹配，才使用 API 返回的
            if (!shouldUseSessionStorage) {
              console.log("AI伴读 - 使用 API 返回的文件列表:", papers.length, "个文件");

              // 转换论文信息为文件格式并存储到 allUploadedFiles
              finalFiles = papers.map((paper: any) => ({
                uploadedPaperId: paper.id,
                fileId: paper.id,
                fileName: paper.file_name,
                name: paper.title,
                file: {
                  name: paper.file_name,
                  size: paper.file_size,
                  type: paper.file_type,
                },
                content: paper.parsed_content || "",
                fileUrl: paper.file_url,
              }));

              // 按文件ID排序确保顺序一致
              finalFiles = finalFiles.sort((a: any, b: any) =>
                a.uploadedPaperId.localeCompare(b.uploadedPaperId)
              );

              console.log("AI伴读 - 转换后的文件列表:", finalFiles.map((f: any) => ({
                id: f.uploadedPaperId,
                name: f.name,
                fileName: f.fileName
              })));

              // 存储到sessionStorage，同时保存 conversationId
              if (typeof window !== "undefined") {
                sessionStorage.setItem("aiReadingFiles", JSON.stringify(finalFiles));
                sessionStorage.setItem("aiReadingConversationId", conversationId);
                console.log("AI伴读 - 将文件列表和 conversationId 存储到 sessionStorage");
              }
            }

            // 更新文件列表
            console.log("AI伴读 - 准备设置 allUploadedFiles，文件数量:", finalFiles.length);
            setAllUploadedFiles(finalFiles);
            setSelectedFileIndex(0);

            // 加载第一个文件的标注
            loadPaperAnnotations(paper_info.id);
          }

          // 加载会话消息列表
          const messagesResponse = await apiGet<{
            messages: any[];
            total: number;
          }>(`/api/chat/messages`, {
            params: {
              conversation_id: conversationId,
              limit: 100,
            },
          });

          const apiMessages = messagesResponse.code === 200 ? messagesResponse.data?.messages || [] : [];

          console.log("AI伴读 - 加载消息列表成功:", {
            conversationId,
            messagesCount: apiMessages.length,
          });

          // 格式化消息
          const formattedMessages: Message[] = (apiMessages || []).map((apiMessage) => {
            let thinkingContent = "";
            let finalContent = apiMessage.content || "";

            if (apiMessage.role === "assistant" && apiMessage.content) {
              if (apiMessage.reasoning_content) {
                thinkingContent = apiMessage.reasoning_content;
              } else {
                const extracted = extractThinkingFromContent(apiMessage.content);
                thinkingContent = extracted.thinking;
                finalContent = extracted.content;
              }
            }

            return {
              id: apiMessage.message_id,
              role: apiMessage.role,
              content: finalContent,
              timestamp: new Date(apiMessage.create_time).toLocaleTimeString("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              thinking: thinkingContent,
              isThinkingCollapsed: thinkingContent ? true : false,
              backendId: apiMessage.message_id,
              files: undefined,
              status:
                apiMessage.status === "completed"
                  ? "completed"
                  : apiMessage.status === "streaming"
                  ? "streaming"
                  : "error",
              totalVersions: 1,
              currentVersion: 1,
              isLiked: apiMessage.is_liked || false,
              isDisliked: apiMessage.is_disliked || false,
            };
          });

          console.log("AI伴读 - 格式化后的消息:", {
            formattedMessagesCount: formattedMessages.length,
            firstMessage: formattedMessages[0] ? {
              id: formattedMessages[0].id,
              role: formattedMessages[0].role,
              contentLength: formattedMessages[0].content?.length || 0,
            } : null,
          });

          setMessages(formattedMessages);

          console.log("AI伴读 - 已调用 setMessages");

          // 设置最后一条 AI 消息 ID（用于显示重新生成按钮）
          const lastAiMessage = formattedMessages
            .filter((msg) => msg.role === "assistant")
            .pop();
          if (lastAiMessage?.backendId) {
            setLatestAiMessageId(lastAiMessage.backendId);
            console.log("AI伴读 - 设置最后一条 AI 消息 ID:", lastAiMessage.backendId);
          }

          // 批量加载版本信息
          const aiMessages = formattedMessages.filter((msg) => msg.role === "assistant");
          const parentMessageIds = aiMessages
            .map((msg) => msg.backendId)
            .filter((id): id is string => id !== undefined && id !== null);

          if (parentMessageIds.length > 0 && onLoadBatchMessageVersions) {
            await onLoadBatchMessageVersions(
              conversationId,
              parentMessageIds,
              formattedMessages,
              true,  // replaceWithLatest: true - 加载最新版本内容
              setMessages
            );
          }
        } else {
          throw new Error(response.message || "加载会话历史失败");
        }
      } catch (error: unknown) {
        console.error("加载AI伴读会话历史失败:", error);

        if (error instanceof Error) {
          if (error.message.includes("未登录") || error.message.includes("401")) {
            clearUserInfo();
            toast.error("用户未登录，请重新登录");
            setTimeout(() => {
              window.location.href = "/login";
            }, 1000);
          } else {
            setMessageError(error.message);
          }
        }
      } finally {
        setIsLoading(false);
        // 重置历史加载标志
        isLoadingHistoryRef.current = null;
      }
    };

    loadConversationHistory();
  }, [
    conversationId,
    getToken,
    clearUserInfo,
    extractThinkingFromContent,
    getCurrentTime,
    setMessages,
    setIsLoading,
    setMessageError,
    setPaperInfo,
    setCurrentPdfInfo,
    loadPaperAnnotations,
    setLatestAiMessageId,
    conversationIdRef,
    isLoadingHistoryRef,
    onLoadBatchMessageVersions,
  ]);
}
