import { useCallback } from "react";
import { MessagePapers } from "@/components/chat/ChatSplitLayout";
import { toast } from "sonner";

interface UseRelatedPapersParams {
  showRelatedPapers: boolean;
  setShowRelatedPapers: React.Dispatch<React.SetStateAction<boolean>>;
  relatedPapersList: MessagePapers[];
  setRelatedPapersList: React.Dispatch<React.SetStateAction<MessagePapers[]>>;
  messages: any[];
  scrollToBottom?: (force?: boolean) => void;
}

/**
 * 相关论文管理Hook
 * 处理文献引用点击、论文提取等操作
 */
export function useRelatedPapers(params: UseRelatedPapersParams) {
  const {
    showRelatedPapers,
    setShowRelatedPapers,
    relatedPapersList,
    setRelatedPapersList,
    messages,
    scrollToBottom,
  } = params;

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
   * 从历史消息的 citations 中提取论文信息
   */
  const extractPapersFromHistoryMessages = useCallback((messagesData: any[]) => {
    const messagePapersList: Array<{
      messageId: string;
      papers: any[];
      keywords: string[];
      search_query: string;
    }> = [];

    messagesData.forEach((msg) => {
      if (msg.citations && Array.isArray(msg.citations) && msg.citations.length > 0) {
        const papers: any[] = [];
        const sortedCitations = [...msg.citations].sort(
          (a: any, b: any) => (a.citation_order || 0) - (b.citation_order || 0)
        );

        sortedCitations.forEach((citation: any) => {
          if (citation.paper) {
            const paper = citation.paper;
            let authors: string[] = [];

            if (paper.authors) {
              if (Array.isArray(paper.authors)) {
                authors = paper.authors;
              } else if (typeof paper.authors === "string") {
                authors = paper.authors
                  .split(",")
                  .map((author: string) => author.trim());
              }
            }

            papers.push({
              id: paper.id,
              title: paper.title,
              authors: authors,
              publication_name: paper.publication_name || "",
              publication_year: paper.publication_year || undefined,
              abstract: paper.abstract || "",
              doi: paper.doi || "",
              source: paper.source || "unknown",
              source_id: paper.source_id || "",
              index: citation.citation_order || 0,
              doc_delivery_status: citation.doc_delivery_status || undefined,
            });
          }
        });

        if (papers.length > 0) {
          const searchKeywords = msg.citations[0]?.search_keywords || "";
          const keywords = searchKeywords
            ? searchKeywords.split(" AND ").map((k: string) => k.trim())
            : [];

          messagePapersList.push({
            messageId: msg.message_id,
            papers: papers,
            keywords: keywords,
            search_query: searchKeywords,
          });
        }
      }
    });

    return messagePapersList;
  }, []);

  /**
   * 处理文献引用点击
   */
  const handleReferenceClick = useCallback(
    (paperIndex: number, element: HTMLElement) => {
      if (!showRelatedPapers) {
        setShowRelatedPapers(true);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            performPaperScroll(paperIndex, element);
          });
        });

        return;
      }

      performPaperScroll(paperIndex, element);
    },
    [showRelatedPapers, setShowRelatedPapers]
  );

  /**
   * 执行论文滚动定位
   */
  const performPaperScroll = useCallback(
    (paperIndex: number, element: HTMLElement) => {
      const allPaperElements = document.querySelectorAll("[data-paper-index]");
      let targetMessageId: string | null = null;

      const allMessageContainers = document.querySelectorAll("[data-message-id]");

      for (const container of allMessageContainers) {
        if (container.contains(element)) {
          targetMessageId = container.getAttribute("data-message-id");

          if (targetMessageId) {
            break;
          }
        }
      }

      if (targetMessageId) {
        const paperExistsForThisMessage = Array.from(allPaperElements).some(
          (el) => el.getAttribute("data-message-id") === targetMessageId
        );

        if (!paperExistsForThisMessage) {
          const targetMessage = messages.find(
            (msg) => msg.backendId === targetMessageId || msg.id === targetMessageId
          );

          if (targetMessage && targetMessage.role === "assistant") {
            const messageIndex = messages.findIndex(
              (msg) => msg.backendId === targetMessageId || msg.id === targetMessageId
            );

            if (messageIndex > 0) {
              const previousMessage = messages[messageIndex - 1];

              if (previousMessage && previousMessage.role === "user") {
                const userMessageId =
                  previousMessage.backendId || previousMessage.id;

                targetMessageId = userMessageId;
              }
            }
          }
        }
      }

      let targetPaperElement: HTMLElement | null = null;

      if (targetMessageId) {
        const messageSelector = `[data-message-id="${targetMessageId}"][data-paper-index="${paperIndex}"]`;
        targetPaperElement = document.querySelector(
          messageSelector
        ) as HTMLElement;
      }

      if (!targetPaperElement) {
        for (const paperEl of allPaperElements) {
          const index = parseInt(paperEl.getAttribute("data-paper-index") || "0");

          if (index === paperIndex) {
            targetPaperElement = paperEl as HTMLElement;
            break;
          }
        }
      }

      if (targetPaperElement) {
        scrollToPaperElement(targetPaperElement);
      } else {
        toast.warning(`未找到第 ${paperIndex} 篇论文`);
      }
    },
    [messages]
  );

  /**
   * 滚动到论文元素并高亮
   */
  const scrollToPaperElement = useCallback(
    (targetPaperElement: HTMLElement) => {
      targetPaperElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      targetPaperElement.classList.add("bg-blue-50", "border-blue-300");

      setTimeout(() => {
        if (targetPaperElement) {
          targetPaperElement.classList.remove("bg-blue-50", "border-blue-300");
        }
      }, 2000);
    },
    []
  );

  return {
    handleReferenceClick,
    containsReferences,
    extractPapersFromHistoryMessages,
  };
}
