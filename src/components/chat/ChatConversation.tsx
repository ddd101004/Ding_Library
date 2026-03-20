"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/router";
import { apiGet, apiPost } from "@/api/request";
import Head from "next/head";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useUser } from "@/components/contexts/UserContext";
import { toast } from "sonner";
import { useConversation } from "@/hooks/use-conversation";
import { useTopicManager } from "@/hooks/use-topic-manager";
import useChatScroll from "@/hooks/use-chat-scroll";
import useMessageFormatter from "@/hooks/use-message-formatter";
import UserAvatarSection from "./conversation-components/UserAvatarSection";
import MessageListContainer from "./conversation-components/MessageListContainer";
import ChatInputArea from "./conversation-components/ChatInputArea";
import MessageInput, { ChatInputRef } from "./common/MessageInput";
import ChatSplitLayout, { Message, MessagePapers } from "./ChatSplitLayout";
import { useChatState } from "@/hooks/chat/useChatState";
import { useMessageActions } from "@/hooks/chat/useMessageActions";
import { useRelatedPapers } from "@/hooks/chat/useRelatedPapers";
import { useConversationData } from "@/hooks/chat/useConversationData";
import { useMessageVersions } from "@/hooks/use-message-versions";

interface ChatConversationProps {
  isSidebarOpen?: boolean;
}

export default function ChatConversation({
  isSidebarOpen = false,
}: ChatConversationProps) {
  const router = useRouter();
  const {
    conversationId,
    userDisplayMessage,
    initialMessage,
    functionType,
    folderId,
    folderName,
  } = router.query;

  const { userInfo, getToken, clearUserInfo } = useUser();
  const { isRecording, toggleRecording, transcribedText } = useAudioRecorder();
  const { getCurrentTime, formatMessage } = useMessageFormatter();

  // ============ 使用自定义Hooks ============
  const chatState = useChatState();
  const {
    messages,
    setMessages,
    inputText,
    setInputText,
    isLoading,
    setIsLoading,
    messageError,
    setMessageError,
    isDeepThinkActive,
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
    copiedMessageId,
    setCopiedMessageId,
    isFileParsing,
    setIsFileParsing,
    parsingFileCountRef,
    pendingFiles,
    setPendingFiles,
    conversationDetail,
    setConversationDetail,
    isDeepThinkActiveRef,
    isPaperSearchActiveRef,
    currentStreamControllerRef,
    hasSentInitialMessageRef,
    currentRequestRef,
    hasInitializedRef,
    isLoadingHistoryRef,
    isFeedbackInProgressRef,
    messageInputRef,
    checkFromHistory,
    toggleDeepThink,
    togglePaperSearch,
    toggleThinkingCollapse,
    isAiResponding,
  } = chatState;

  // 对话处理
  const { handleSendMessage: handleSendConversation, isSending } =
    useConversation();

  // 主题管理
  const {
    topics,
    selectedTopic,
    isLoading: topicsLoading,
    handleTopicButtonClick,
    handleTopicClick,
    handleRefreshClick,
    setSelectedTopic,
  } = useTopicManager({
    currentFunction,
    selectedButton,
  });

  // 消息版本管理
  const messageVersionsHook = useMessageVersions({
    isFeedbackInProgressRef,
    onErrorLogPrefix: "[ChatConversation]",
  });

  const {
    messageVersions,
    currentVersionMessageIds,
    setMessageVersions,
    setCurrentVersionMessageIds,
  } = messageVersionsHook;

  // 获取版本切换函数
  const handlePreviousVersion = (messageId: string) =>
    messageVersionsHook.handlePreviousVersion(
      messageId,
      messageVersions,
      async (msgId: string, targetVersion: number) =>
        messageVersionsHook.switchToVersion(
          msgId,
          targetVersion,
          messageVersions,
          setMessages as any,
          currentVersionMessageIds,
          setCurrentVersionMessageIds
        )
    );

  const handleNextVersion = (messageId: string) =>
    messageVersionsHook.handleNextVersion(
      messageId,
      messageVersions,
      async (msgId: string, targetVersion: number) =>
        messageVersionsHook.switchToVersion(
          msgId,
          targetVersion,
          messageVersions,
          setMessages as any,
          currentVersionMessageIds,
          setCurrentVersionMessageIds
        )
    );

  // ============ Refs ============
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 消息操作
  const messageActions = useMessageActions({
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
    onLoadBatchMessageVersions: messageVersionsHook.loadBatchMessageVersions as any,
    onFilesCleared: () => {},
    getToken,
    clearUserInfo,
    getCurrentTime,
    checkFromHistory,
    uploadedFiles: [],
    pendingFiles: [],
    setPendingFiles: () => {},
    userDisplayMessage,
    initialMessage,
    setRelatedPapersList,
    setShowRelatedPapers,
    messagesEndRef,
  });

  const {
    copyMessageContent,
    stopStreaming,
    regenerateResponse,
    handleFeedbackSuccess,
    processStreamResponse,
  } = messageActions;

  // 相关论文
  const { handleReferenceClick } = useRelatedPapers({
    showRelatedPapers,
    setShowRelatedPapers,
    relatedPapersList,
    setRelatedPapersList,
    messages,
  });

  // ============ 滚动控制 ============
  const scrollToBottom = useCallback(
    (forceScroll = false) => {
      if (isFeedbackInProgressRef.current) {
        return;
      }

      const now = Date.now();
      if (!forceScroll && now - lastScrollTimeRef.current < 100) {
        return;
      }
      lastScrollTimeRef.current = now;

      const scrollContainers = [
        document.querySelector(".overflow-y-auto.auto-hide-scrollbar"),
        document.querySelector(".overflow-y-auto.scrollbar-thin"),
        document.querySelector(".overflow-y-auto"),
        document.querySelector(".overflow-auto"),
        document.querySelector('[class*="overflow"]'),
        document.querySelector(".flex-1.w-full"),
        document.documentElement,
        document.body,
      ];

      let scrollContainer: Element | null = null;
      for (const container of scrollContainers) {
        if (container && container instanceof HTMLElement) {
          const style = window.getComputedStyle(container);
          if (
            style.overflowY === "auto" ||
            style.overflowY === "scroll" ||
            style.overflow === "auto" ||
            style.overflow === "scroll"
          ) {
            scrollContainer = container;
            break;
          }
        }
      }

      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: forceScroll ? "auto" : "smooth",
        });

        if (forceScroll) {
          setTimeout(() => {
            scrollContainer?.scrollTo({
              top: scrollContainer.scrollHeight,
              behavior: "auto",
            });
          }, 10);
        }
      }
    },
    [isFeedbackInProgressRef]
  );

  useChatScroll(messagesEndRef, messages);

  // ============ 发送消息 ============
  const sendMessage = useCallback(async (content: string, isInitial = false) => {
    if (!conversationId || isLoading) {
      return;
    }

    if (isInitial && hasSentInitialMessageRef.current) {
      return;
    }

    if (currentStreamControllerRef.current) {
      return;
    }

    const currentIsFromHistory = checkFromHistory();

    if (!isInitial && content === "") {
      toast.warning("输入框不能为空，请输入消息内容");
      return;
    }

    const requestId = `${conversationId}-${Date.now()}-${
      isInitial ? "initial" : "manual"
    }`;

    const isSameTypeRequest =
      currentRequestRef.current &&
      (isInitial
        ? currentRequestRef.current.includes("initial")
        : !currentRequestRef.current.includes("initial"));

    if (isInitial) {
      if (
        currentRequestRef.current &&
        currentRequestRef.current.includes("initial")
      ) {
        return;
      }

      if (
        currentRequestRef.current &&
        currentRequestRef.current.includes(content.substring(0, 30))
      ) {
        return;
      }
    } else {
      if (
        isSameTypeRequest &&
        currentRequestRef.current?.includes(content.substring(0, 50))
      ) {
        toast.warning("请勿重复发送相同消息");
        return;
      }
    }

    currentRequestRef.current = requestId;

    if (isInitial) {
      hasSentInitialMessageRef.current = true;
    }

    setIsLoading(true);

    setLatestAiMessageId(null);

    const controller = new AbortController();
    currentStreamControllerRef.current = controller;

    let userDisplayContent = "";
    if (isInitial) {
      if (userDisplayMessage) {
        userDisplayContent = Array.isArray(userDisplayMessage)
          ? userDisplayMessage[0]?.trim() || ""
          : userDisplayMessage.trim();
      }
    } else {
      userDisplayContent = content;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userDisplayContent,
      timestamp: getCurrentTime(),
    };

    setMessages((prev) => {
      const newMessages = [...prev, userMessage];
      setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return newMessages;
    });

    const aiMessageId = `assistant-${Date.now()}`;
    const aiMessage: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: getCurrentTime(),
      isStreaming: true,
    };

    setMessages((prev) => {
      const newMessages = [...prev, aiMessage];
      setTimeout(() => {
        scrollToBottom(true);
      }, 50);
      return newMessages;
    });

    if (!isInitial) {
      setInputText("");
    }

    try {
      const token = getToken();
      if (!token) {
        throw new Error("用户未登录");
      }

      const apiUrl = "/api/chat/messages/stream";
      const requestBody = {
        conversation_id: conversationId,
        content: content,
        is_deep_think: isDeepThinkActiveRef.current,
        auto_search_papers: isPaperSearchActiveRef.current ? true : undefined,
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
        console.error("发送消息API错误响应:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      await processStreamResponse(response.body, aiMessageId, async (newBackendId: string) => {
        // 发送消息成功后，延迟加载版本信息
        setTimeout(async () => {
          if (newBackendId && conversationId && messageVersionsHook.loadBatchMessageVersions) {
            await messageVersionsHook.loadBatchMessageVersions(
              conversationId as string,
              [newBackendId],
              messages,
              false,
              setMessages
            );
          }
        }, 1000);
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
        prev.map((msg) => {
          if (msg.id === aiMessageId) {
            const hasContent = msg.content && msg.content.trim().length > 0;
            const hasThinking = msg.thinking && msg.thinking.trim().length > 0;

            return {
              ...msg,
              isStreaming: false,
              content: hasContent ? msg.content : errorMessage,
              thinking: hasThinking ? msg.thinking : "",
            };
          }
          return msg;
        })
      );

      const currentMsg = messages.find((m) => m.id === aiMessageId);
      if (!currentMsg || (!currentMsg.content && !currentMsg.thinking)) {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
      currentRequestRef.current = null;
      currentStreamControllerRef.current = null;
    }
  }, [
    conversationId,
    isLoading,
    hasSentInitialMessageRef,
    currentStreamControllerRef,
    checkFromHistory,
    currentRequestRef,
    setIsLoading,
    setLatestAiMessageId,
    setMessages,
    getCurrentTime,
    scrollToBottom,
    setInputText,
    getToken,
    isDeepThinkActiveRef,
    isPaperSearchActiveRef,
    processStreamResponse,
    messages,
  ]);

  // 会话数据加载
  useConversationData({
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
    onLoadBatchMessageVersions: messageVersionsHook.loadBatchMessageVersions,
    scrollToBottom,
    sendMessage,
    getToken,
    clearUserInfo,
    checkFromHistory,
  });

  // 实时滚动监控器
  useEffect(() => {
    if (isAiResponding) {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }

      scrollIntervalRef.current = setInterval(() => {
        scrollToBottom(true);
      }, 50);
    } else {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    };
  }, [isAiResponding, scrollToBottom]);

  // 页面完全加载后确保滚动到底部
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        scrollToBottom(true);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [conversationId, messages.length, scrollToBottom]);

  // 监听语音转文字
  useEffect(() => {
    if (transcribedText) {
      setInputText((prev) => prev + transcribedText);
    }
  }, [transcribedText, setInputText]);

  // ============ UI交互处理 ============
  const handleSendMessage = () => {
    if (!inputText.trim()) {
      toast.warning("请输入消息内容");
      return;
    }

    if (isRecording) {
      toggleRecording();
    }

    sendMessage(inputText.trim(), false);

    setTimeout(() => {
      scrollToBottom(true);
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCloseFunction = () => {
    router.push({
      pathname: "/chat",
      query: { function: currentFunction },
    });
  };

  const createNewConversationAndRedirect = async () => {
    try {
      const requestBody = {
        is_deep_think: false,
      };

      const createRes = await apiPost("/api/chat/conversations", requestBody);

      if (createRes.code !== 200) {
        throw new Error(`创建对话失败: ${createRes.message}`);
      }

      const responseData = createRes;

      if (responseData.code !== 200) {
        throw new Error(`创建对话失败: ${responseData.message || "未知错误"}`);
      }

      if (!responseData.data?.conversation_id) {
        throw new Error("创建对话失败: 缺少对话ID");
      }

      const newConversationId = responseData.data.conversation_id;

      toast.success("新对话创建成功");

      window.location.href = `/chatconversation?conversationId=${newConversationId}&isDeepThink=false`;
    } catch (error: unknown) {
      console.error("创建新对话失败:", error);

      if (
        error instanceof Error &&
        (error.message === "用户未登录" || error.message.includes("401"))
      ) {
        clearUserInfo();
        toast.error("用户未登录，请重新登录");
        window.location.href = "/login";
      } else {
        toast.error(
          `创建新对话失败: ${
            error instanceof Error ? error.message : "未知错误"
          }`
        );
        window.location.href = `/chatconversation?isDeepThink=false`;
      }
    }
  };

  useEffect(() => {
    const handleNewChatRequest = () => {
      const hasContent =
        messages.length > 0 ||
        inputText.trim() !== "";

      if (hasContent) {
        createNewConversationAndRedirect();
      }
    };

    window.addEventListener("newChatRequest", handleNewChatRequest);

    return () => {
      window.removeEventListener("newChatRequest", handleNewChatRequest);
    };
  }, [messages, inputText]);

  // 组件卸载时清理标记
  useEffect(() => {
    return () => {
      const conversationIdStr = Array.isArray(conversationId)
        ? conversationId[0]
        : conversationId;
      if (conversationIdStr) {
        setTimeout(() => {
          sessionStorage.removeItem(`hasLoaded_${conversationIdStr}`);
        }, 5000);

        if (hasInitializedRef.current === conversationIdStr) {
          hasInitializedRef.current = null;
        }
        hasSentInitialMessageRef.current = false;
        isLoadingHistoryRef.current = null;
      }
    };
  }, [conversationId]);

  return (
    <>
      <Head>
        <title>AI智慧学术交互系统-AI对话</title>
      </Head>

      {/* 全局样式覆盖 - 浅绿主题 */}
      <style jsx global>{`
        /* 主容器背景色 */
        .auto-hide-scrollbar {
          background-color: #f0faf6 !important;
        }
        
        /* 消息列表容器背景 */
        .flex-1.overflow-y-auto {
          background-color: #d5f4cff !important;
        }
        
        /* 输入区域背景 */
        .chat-input-area {
          background-color: #d5f4cff !important;
          border-top: 1px solid #d4ede4 !important;
        }
        
        /* 用户消息气泡 */
        .user-message-bubble {
          background-color: #e8f8f0 !important;
          border: 1px solid #d4ede4 !important;
        }
        
        /* AI消息气泡 */
        .ai-message-bubble {
          background-color: #ffffff !important;
          border: 1px solid #d4ede4 !important;
        }
        
        /* 文件标签样式 */
        .file-tag {
          background-color: #f0faf6 !important;
          border: 1px solid #d4ede4 !important;
        }
        
        /* 按钮hover状态（排除论文搜索、DeepThink和引用确认按钮） */
        button:hover:not(:disabled):not(.paper-search-btn):not(.deep-think-btn):not(.citation-confirm-btn),
        .btn-hover-effect:hover {
          background-color: #e8f8f0 !important;
          border-color: #d4ede4 !important;
        }
        
        /* 选中状态 */
        .active-item, .selected-item {
          background-color: #e8f8f0 !important;
          border-color: #679CFF !important;
        }
        
        /* 滚动条样式 */
        ::-webkit-scrollbar-track {
          background: #f0faf6 !important;
        }
        ::-webkit-scrollbar-thumb {
          background-color: #d4ede4 !important;
          border-radius: 6px !important;
          border: 3px solid #f0faf6 !important;
        }
      `}</style>

      <UserAvatarSection />

      {/* 主容器添加浅绿背景和边框样式 */}
      <div style={{ 
        backgroundColor: '#f0faf6',
        minHeight: '100vh',
        border: '1px solid #d4ede4',
        borderRadius: '20px',
        boxShadow: '0 2px 8px rgba(198, 242, 224, 0.2)'
      }}>
  <ChatSplitLayout
  showRelatedPapers={showRelatedPapers}
  messages={messages}
  relatedPapersList={relatedPapersList}
  messageError={messageError}
  copiedMessageId={copiedMessageId}
  userInfo={userInfo}
  isAiResponding={isAiResponding}
  conversationId={conversationId}
  isFolderChatActive={isFolderChatActive}
  folderId={folderId}
  folderName={folderName}
  isSidebarOpen={isSidebarOpen}
  onToggleCollapse={toggleThinkingCollapse}
  onCopy={copyMessageContent}
  onRegenerate={regenerateResponse}
  onStopStreaming={stopStreaming}
  onPreviousVersion={handlePreviousVersion}
  onNextVersion={handleNextVersion}
  onReferenceClick={handleReferenceClick}
  messagesEndRef={messagesEndRef}
  latestAiMessageId={latestAiMessageId}
  onFeedbackSuccess={handleFeedbackSuccess}
  currentVersionMessageIds={currentVersionMessageIds}
  singleColumnContent={
    // 移除多余的 </>，直接返回单个 div 即可（无需空标签包裹）
    <div 
      className="flex-1 overflow-y-auto overflow-x-hidden auto-hide-scrollbar pb-[10px]"
      style={{ backgroundColor: '#d5f4cf' }} // 修正 7 位颜色值为 6 位
    >
      <div className="flex justify-center items-start w-full">
        <div className="relative responsive-container flex justify-center w-full">
          <MessageListContainer
            messages={messages}
            messageError={messageError}
            copiedMessageId={copiedMessageId}
            userInfo={userInfo}
            onToggleCollapse={toggleThinkingCollapse}
            onCopy={copyMessageContent}
            onRegenerate={regenerateResponse}
            onStopStreaming={stopStreaming}
            isAiResponding={isAiResponding}
            onPreviousVersion={handlePreviousVersion}
            onNextVersion={handleNextVersion}
            messagesEndRef={messagesEndRef}
            relatedPapers={
              relatedPapersList.length > 0
                ? relatedPapersList.at(-1)?.papers || null // 增加可选链避免报错
                : null
            }
            onReferenceClick={handleReferenceClick}
            onFeedbackSuccess={handleFeedbackSuccess}
            currentVersionMessageIds={currentVersionMessageIds}
            latestAiMessageId={latestAiMessageId}
          />
        </div>
      </div>
    </div>
  }
  inputAreaContent={
    <ChatInputArea
      ref={messageInputRef}
      isSidebarOpen={isSidebarOpen}
      inputText={inputText}
      inputOnChange={setInputText}
      onKeyDown={handleKeyDown}
      onSend={handleSendMessage}
      uploadedFiles={[]}
      onRemoveFile={() => {}}
      isRecording={isRecording}
      toggleRecording={toggleRecording}
      isDeepThinkActive={isDeepThinkActive}
      toggleDeepThink={toggleDeepThink}
      isPaperSearchActive={isPaperSearchActive}
      togglePaperSearch={togglePaperSearch}
      isLoading={isLoading}
      currentFunction={currentFunction}
      onCloseFunction={handleCloseFunction}
      isFromOtherPage={false}
      onAddFile={() => {}}
      totalFileCount={0}
      showRelatedPapers={showRelatedPapers}
      isFolderChat={false}
      isFileParsing={false}
      hideFileTags={true}
      style={{
        backgroundColor: '#d5f4cf',
        borderTop: '1px solid #d4ede4'
      }}
    />
  }
/>
      </div>
    </>
  );
}