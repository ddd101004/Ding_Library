import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/router";
import { Message, MessagePapers } from "@/components/chat/ChatSplitLayout";

/**
 * 聊天状态管理Hook
 * 管理所有聊天相关的状态和副作用
 */
export function useChatState() {
  const router = useRouter();
  const {
    conversationId,
    functionType,
    isDeepThink,
    isPaperSearch,
    isFolderChat,
  } = router.query;

  // ============ 基础状态 ============
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isFromOtherPage, setIsFromOtherPage] = useState(false);
  const [isFromHistory, setIsFromHistory] = useState(false);

  // ============ 功能模式状态 ============
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
  const [isPaperSearchActive, setIsPaperSearchActive] = useState(false);
  const [isFolderChatActive, setIsFolderChatActive] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<string | null>(null);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);

  // ============ 消息相关状态 ============
  const [showRelatedPapers, setShowRelatedPapers] = useState(false);
  const [relatedPapersList, setRelatedPapersList] = useState<MessagePapers[]>([]);
  const [latestAiMessageId, setLatestAiMessageId] = useState<string | null>(null);
  // messageVersions 和 currentVersionMessageIds 由 useMessageVersions hook 管理

  // ============ UI状态 ============
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isFileParsing, setIsFileParsing] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<any[]>([]);

  // ============ 会话详情 ============
  const [conversationDetail, setConversationDetail] = useState<any>(null);

  // ============ Refs ============
  const isDeepThinkActiveRef = useRef(false);
  const isPaperSearchActiveRef = useRef(false);
  const currentStreamControllerRef = useRef<AbortController | null>(null);
  const hasSentInitialMessageRef = useRef(false);
  const currentRequestRef = useRef<string | null>(null);
  const hasInitializedRef = useRef<string | null>(null);
  const isLoadingHistoryRef = useRef<string | null>(null);
  const previousConversationIdRef = useRef<string | null>(null);
  const parsingFileCountRef = useRef(0);
  const isFeedbackInProgressRef = useRef<boolean>(false);
  const messageInputRef = useRef<any>(null);

  // ============ URL参数初始化 ============
  useEffect(() => {
    if (functionType) {
      setCurrentFunction(functionType as string);
    } else {
      setCurrentFunction(null);
    }

    const newIsDeepThink =
      isDeepThink === "true" ||
      (Array.isArray(isDeepThink) && isDeepThink[0] === "true");

    setIsDeepThinkActive(newIsDeepThink);
    isDeepThinkActiveRef.current = newIsDeepThink;

    const newIsPaperSearch =
      isPaperSearch === "true" ||
      (Array.isArray(isPaperSearch) && isPaperSearch[0] === "true");

    setIsPaperSearchActive(newIsPaperSearch);
    isPaperSearchActiveRef.current = newIsPaperSearch;

    const newIsFolderChat =
      isFolderChat === "true" ||
      (Array.isArray(isFolderChat) && isFolderChat[0] === "true");

    setIsFolderChatActive(newIsFolderChat);
  }, [functionType, isDeepThink, isPaperSearch, isFolderChat]);

  // ============ 从历史记录检测 ============
  useEffect(() => {
    const { fromHistory } = router.query;
    if (fromHistory === "true") {
      setIsFromHistory(true);
      setShowRelatedPapers(false);
      setRelatedPapersList([]);
    }
  }, [router.query]);

  // ============ 同步检查是否从历史记录跳转 ============
  const checkFromHistory = () => {
    const { fromHistory } = router.query;
    return fromHistory === "true";
  };

  // ============ 当会话ID变化时清空状态 ============
  useEffect(() => {
    const conversationIdStr = Array.isArray(conversationId)
      ? conversationId[0]
      : conversationId;

    if (
      conversationIdStr &&
      conversationIdStr !== previousConversationIdRef.current
    ) {
      if (previousConversationIdRef.current !== null) {
        setInputText("");
        setCurrentFunction(null);
        setIsFolderChatActive(false);
      }

      previousConversationIdRef.current = conversationIdStr;
    }
  }, [conversationId]);

  // ============ 计算全局AI回复状态 ============
  const isAiResponding = isLoading || messages.some((msg) => msg.isStreaming);

  // ============ 切换深度思考模式 ============
  const toggleDeepThink = useCallback(() => {
    if (!isLoading) {
      const newValue = !isDeepThinkActive;
      setIsDeepThinkActive(newValue);
      isDeepThinkActiveRef.current = newValue;
    }
  }, [isLoading, isDeepThinkActive]);

  // ============ 切换论文搜索模式 ============
  const togglePaperSearch = useCallback(() => {
    if (!isLoading) {
      const newValue = !isPaperSearchActive;
      setIsPaperSearchActive(newValue);
      isPaperSearchActiveRef.current = newValue;
    }
  }, [isLoading, isPaperSearchActive]);

  // ============ 切换思考过程折叠状态 ============
  const toggleThinkingCollapse = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId || msg.backendId === messageId
          ? { ...msg, isThinkingCollapsed: !msg.isThinkingCollapsed }
          : msg
      )
    );
  }, []);

  return {
    // 状态
    messages,
    setMessages,
    inputText,
    setInputText,
    isLoading,
    setIsLoading,
    messageError,
    setMessageError,
    isFromOtherPage,
    setIsFromOtherPage,
    isFromHistory,
    setIsFromHistory,
    isDeepThinkActive,
    setIsDeepThinkActive,
    isPaperSearchActive,
    isFolderChatActive,
    setIsFolderChatActive,
    currentFunction,
    setCurrentFunction,
    selectedButton,
    setSelectedButton,
    showRelatedPapers,
    setShowRelatedPapers,
    relatedPapersList,
    setRelatedPapersList,
    latestAiMessageId,
    setLatestAiMessageId,
    // messageVersions, setMessageVersions 由 useMessageVersions hook 管理
    // currentVersionMessageIds, setCurrentVersionMessageIds 由 useMessageVersions hook 管理
    showAvatarPopup,
    setShowAvatarPopup,
    copiedMessageId,
    setCopiedMessageId,
    isFileParsing,
    setIsFileParsing,
    parsingFileCountRef,
    pendingFiles,
    setPendingFiles,
    conversationDetail,
    setConversationDetail,

    // Refs
    isDeepThinkActiveRef,
    isPaperSearchActiveRef,
    currentStreamControllerRef,
    hasSentInitialMessageRef,
    currentRequestRef,
    hasInitializedRef,
    isLoadingHistoryRef,
    previousConversationIdRef,
    isFeedbackInProgressRef,
    messageInputRef,

    // 工具函数
    checkFromHistory,
    toggleDeepThink,
    togglePaperSearch,
    toggleThinkingCollapse,
    isAiResponding,
  };
}
