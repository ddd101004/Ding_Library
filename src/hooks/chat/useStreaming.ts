import { Message, MessagePapers } from "@/components/chat/ChatSplitLayout";
import { toast } from "sonner";

interface UseStreamingParams {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  currentStreamControllerRef: React.MutableRefObject<AbortController | null>;
  setLatestAiMessageId?: React.Dispatch<React.SetStateAction<string | null>>;
  setRelatedPapersList?: React.Dispatch<React.SetStateAction<MessagePapers[]>>;
  setShowRelatedPapers?: React.Dispatch<React.SetStateAction<boolean>>;
  conversationId?: string | string[] | undefined;
  messagesEndRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * 处理流式响应的Hook
 */
export function useStreaming(params: UseStreamingParams) {
  const {
    messages,
    setMessages,
    setIsLoading,
    currentStreamControllerRef,
    setLatestAiMessageId,
    setRelatedPapersList,
    setShowRelatedPapers,
    conversationId,
    messagesEndRef,
  } = params;
  /**
   * 处理流式响应
   */
  const processStreamResponse = async (
    stream: ReadableStream,
    aiMessageId: string,
    onLoadVersions?: (backendId: string) => void
  ) => {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedContent = "";
    let accumulatedThinking = "";
    const referenceCount = 2;
    let backendMessageId: string | null = null;
    let hasReceivedContent = false;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (currentStreamControllerRef.current?.signal.aborted) {
          break;
        }

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (currentStreamControllerRef.current?.signal.aborted) {
            break;
          }

          if (line.trim() === "" || line.startsWith(":")) continue;

          if (line.startsWith("data: ")) {
            try {
              const dataStr = line.slice(6);
              if (dataStr.trim() === "") continue;

              const data = JSON.parse(dataStr);

              if (data.type === "start") {
                backendMessageId = data.message_id;

                if (backendMessageId && setLatestAiMessageId) {
                  setLatestAiMessageId(backendMessageId);
                }

                if (data.user_message_id) {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.role === "user" && !msg.backendId
                        ? {
                            ...msg,
                            backendId: data.user_message_id,
                          }
                        : msg
                    )
                  );
                }

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          backendId: backendMessageId,
                        }
                      : msg
                  )
                );
              } else if (data.type === "token") {
                hasReceivedContent = true;
                accumulatedContent += data.content;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          content: accumulatedContent,
                          thinking: accumulatedThinking,
                          backendId: backendMessageId || msg.backendId,
                        }
                      : msg
                  )
                );
              } else if (data.type === "reasoning") {
                hasReceivedContent = true;
                accumulatedThinking += data.content;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          thinking: accumulatedThinking,
                          content: accumulatedContent,
                          backendId: backendMessageId || msg.backendId,
                        }
                      : msg
                  )
                );
              } else if (data.type === "done") {
                let actualReferenceCount = referenceCount;

                if (data.citations && Array.isArray(data.citations)) {
                  actualReferenceCount = data.citations.length;
                } else if (data.reference_count) {
                  actualReferenceCount = data.reference_count;
                }

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          isStreaming: false,
                          thinking: accumulatedThinking,
                          content: accumulatedContent,
                          referenceCount: actualReferenceCount,
                          backendId: backendMessageId || msg.backendId,
                        }
                      : msg
                  )
                );

                if (backendMessageId && onLoadVersions) {
                  onLoadVersions(backendMessageId);
                }

                setTimeout(() => {
                  setIsLoading(false);
                  currentStreamControllerRef.current = null;
                }, 100);

                return;
              } else if (data.type === "related_papers") {
                if (setRelatedPapersList && setShowRelatedPapers) {
                  const papers = data.papers || [];
                  const keywords = data.keywords || [];
                  const searchQuery = data.search_query || "";

                  if (papers.length > 0) {
                    setRelatedPapersList((prev) => [
                      ...prev,
                      {
                        messageId: backendMessageId || aiMessageId,
                        papers: papers,
                        keywords: keywords,
                        search_query: searchQuery,
                      },
                    ]);
                    setShowRelatedPapers(true);
                  }
                }
              } else if (data.type === "error") {
                console.error("流式响应错误:", data.message);

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === aiMessageId
                      ? {
                          ...msg,
                          isStreaming: false,
                          content: `错误: ${data.message}`,
                          backendId: backendMessageId || msg.backendId,
                        }
                      : msg
                  )
                );

                currentStreamControllerRef.current = null;
                toast.error(`流式响应错误: ${data.message}`);
                return;
              }
            } catch (error) {
              console.error("解析流数据错误:", error);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  thinking: accumulatedThinking,
                  content: accumulatedContent || msg.content,
                  referenceCount,
                  backendId: backendMessageId || msg.backendId,
                }
              : msg
          )
        );
        return;
      }

      console.error("处理流响应错误:", error);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                isStreaming: false,
                thinking: accumulatedThinking || msg.thinking,
                content: accumulatedContent || msg.content,
                referenceCount,
                backendId: backendMessageId || msg.backendId,
              }
            : msg
        )
      );
    } finally {
      try {
        reader.releaseLock();
      } catch (error) {}
    }
  };

  return {
    processStreamResponse,
  };
}
