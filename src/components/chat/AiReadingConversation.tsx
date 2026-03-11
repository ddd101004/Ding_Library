"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useUser } from "@/components/contexts/UserContext";
import { toast } from "sonner";
import MessageInput, { ChatInputRef } from "./common/MessageInput";
import ChatMessage from "./common/ChatMessage";
import FileUploadModal from "./common/FileUploadModal";
import { SmartFileTags } from "./common/SmartFileTags";
import PdfViewer from "@/components/ai-reading/PdfViewer";
import { AIOperation, SelectionContext } from "@/components/ai-reading/types";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Message } from "@/components/chat/ChatSplitLayout";

// ========== Hooks 导入 ==========
import { useChatState } from "@/hooks/chat/useChatState";
import { useAiReadingFeatures } from "@/hooks/chat/useAiReadingFeatures";
import { useAiReadingConversationData } from "@/hooks/chat/useAiReadingConversationData";
import { useAiReadingMessage } from "@/hooks/chat/useAiReadingMessage";
import { useMessageVersions } from "@/hooks/use-message-versions";

interface AiReadingConversationProps {
  isSidebarOpen?: boolean;
}

/**
 * AI伴读对话页面 - 重构版
 * 使用现有 hooks 进行模块化管理
 */
export default function AiReadingConversation({
  isSidebarOpen = false,
}: AiReadingConversationProps) {
  const router = useRouter();
  const { userInfo, getToken, clearUserInfo } = useUser();
  const { isRecording, toggleRecording, transcribedText } = useAudioRecorder();

  // ========== 1. 使用 useChatState 获取基础状态 ==========
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
    isDeepThinkActiveRef,
    currentStreamControllerRef,
    hasSentInitialMessageRef,
    isLoadingHistoryRef,
    latestAiMessageId,
    setLatestAiMessageId,
    isFileParsing,
    setIsFileParsing,
    parsingFileCountRef,
    messageInputRef,
    isAiResponding,
    toggleDeepThink,
    toggleThinkingCollapse,
    checkFromHistory,
  } = chatState;

  // ========== 2. 需要单独管理的状态 ==========
  // 初始化时从 sessionStorage 恢复 conversationId（用于刷新页面场景）
  const getInitialConversationId = () => {
    if (typeof window !== "undefined") {
      const urlConversationId = router.query.conversation_id as string;
      if (urlConversationId) {
        return urlConversationId;
      }
      // 如果 URL 中没有，尝试从 sessionStorage 读取
      const storedConversationId = sessionStorage.getItem("aiReadingConversationId");
      if (storedConversationId) {
        return storedConversationId;
      }
    }
    return null;
  };

  const [conversationId, setConversationId] = useState<string | null>(getInitialConversationId());
  const conversationIdRef = useRef<string | null>(conversationId);
  const isLoadingHistoryRefLocal = useRef<string | null>(null);
  const isVersionSwitchingRef = useRef<boolean>(false); // 追踪版本切换状态
  const isTogglingCollapseRef = useRef<boolean>(false); // 追踪思考过程折叠状态
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);

  // ========== 2.1 监听 conversationId 变化同步到 ref ==========
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // ========== 2.2 监听 URL 参数变化更新 conversationId ==========

  // ========== 2.2.0 初始化 AI 伴读功能（必须在使用其状态之前） ==========
  const aiReadingFeatures = useAiReadingFeatures();
  const {
    paperInfo,
    setPaperInfo,
    currentPdfInfo,
    setCurrentPdfInfo,
    isPdfLoading,
    allUploadedFiles,
    setAllUploadedFiles,
    selectedFileIndex,
    setSelectedFileIndex,
    paperAnnotations,
    citationContent,
    setCitationContent,
    isCreatingConversationRef,
    isLoadingHistoryRef: aiReadingIsLoadingHistoryRef,
    loadPaperAnnotations,
    loadFilePdfInfo,
    loadPaperInfoById,
    handleFileSwitch,
    clearCitation,
    handleHighlightAnnotation,
    handleBackToChat,
    handleCloseAiReading,
  } = aiReadingFeatures;

  // ========== 2.2.1 初始化 useMessageVersions（必须在 useAiReadingMessage 之前）==========
  const messageVersions = useMessageVersions({
    isFeedbackInProgressRef: useRef(false),
    onErrorLogPrefix: "AI伴读",
  });
  const {
    messageVersions: versions,
    currentVersionMessageIds,
    setMessageVersions,
    setCurrentVersionMessageIds,
    loadBatchMessageVersions,
    switchToVersion,
    handleFeedbackSuccess,
  } = messageVersions;

  // ========== 2.2.2 工具函数 ==========
  const getCurrentTime = useCallback(() => {
    return new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // ========== 2.2.3 初始化消息发送功能（必须在 effect 之前） ==========
  const aiReadingMessage = useAiReadingMessage({
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
    onLoadBatchMessageVersions: loadBatchMessageVersions,
    getToken,
    clearUserInfo,
    getCurrentTime,
    uploadedFiles,
    paperInfo,
    conversationId,
    setConversationId,
    onFileCleared: () => setUploadedFiles([]),
  });
  const {
    createAiReadingConversation,
    sendMessageWithOperation,
    processStreamResponse,
  } = aiReadingMessage;

  useEffect(() => {
    const urlConversationId = router.query.conversation_id as string;
    const fromHistory = router.query.fromHistory === "true";

    if (urlConversationId && urlConversationId !== conversationId) {


      // 如果是从历史记录跳转，先清空所有相关状态
      // 这样可以触发历史记录的重新加载和文件信息的更新
      if (fromHistory) {

        // 清除 sessionStorage 中的缓存数据，强制使用 API 返回的新会话数据
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("aiReadingFiles");
          sessionStorage.removeItem("aiReadingConversationId");
        }

        // 清空状态（需要同时清空两个来源的状态）
        setMessages([]);
        setPaperInfo(null);
        setCurrentPdfInfo(null);

        // 清空 useAiReadingFeatures 中的状态
        setAllUploadedFiles([]);  // 这个来自 useAiReadingFeatures

        // 清空本地状态（如果有额外的状态需要清空）
        setSelectedFileIndex(0);
      }

      setConversationId(urlConversationId);
    }
  }, [router.query.conversation_id, router.query.fromHistory]);

  // ========== 2.2.1 从 URL 参数加载论文信息（仅用于会话恢复） ==========
  useEffect(() => {
    const uploadedPaperIdFromQuery = router.query.uploadedPaperId as string;
    const inputTextFromQuery = router.query.inputText as string;
    const fromHistory = router.query.fromHistory === "true";

    // 如果是从历史记录跳转，不要加载 uploadedPaperId，让 useAiReadingConversationData 管理
    if (fromHistory) {
      return;
    }

    // 只有当没有输入文本且需要恢复会话时才加载单个论文信息
    if (uploadedPaperIdFromQuery && !inputTextFromQuery && !paperInfo) {
      
      loadPaperInfoById(uploadedPaperIdFromQuery);
    }
  }, [
    router.query.uploadedPaperId,
    router.query.inputText,
    router.query.fromHistory,
    paperInfo,
    loadPaperInfoById,
  ]);

  // ========== 2.2.2 处理从 ChatHome 跳转过来的参数 ==========
  const hasHandledInitialParams = useRef(false);
  useEffect(() => {
    const inputTextFromQuery = router.query.inputText as string;
    const isDeepThinkFromQuery = router.query.isDeepThink === "true";
    const uploadedPaperIdFromQuery = router.query.uploadedPaperId as string;
    const conversationIdFromQuery = router.query.conversation_id as string;

    // 如果有 conversation_id，说明是从会话列表恢复的，不需要处理初始参数
    if (conversationIdFromQuery) {
      return;
    }

    // 如果没有输入文本，不需要处理
    if (!inputTextFromQuery || !inputTextFromQuery.trim()) {
      return;
    }

    // 如果已经处理过，不再重复处理
    if (hasHandledInitialParams.current) {
      return;
    }

    // 检查是否真的需要创建新会话（已经有会话ID说明是刷新页面）
    if (conversationId) {
      if (typeof window !== "undefined" && router.pathname) {
        const cleanUrl = `${router.pathname}`;
        router.replace(cleanUrl, undefined, { shallow: true });
      }
      return;
    }

    // 直接从 sessionStorage 读取文件列表（不依赖状态）
    let filesFromStorage: any[] = [];
    try {
      const filesStr = sessionStorage.getItem("aiReadingFiles");
      if (filesStr) {
        filesFromStorage = JSON.parse(filesStr);

        // 立即设置到 allUploadedFiles 状态，确保发送消息时能提取到文件 ID
        if (filesFromStorage.length > 0) {
          setAllUploadedFiles(filesFromStorage);
        }
      }
    } catch (error) {
      console.error("读取文件列表失败:", error);
    }

    // 标记为已处理
    hasHandledInitialParams.current = true;

    // 设置输入文本
    setInputText(inputTextFromQuery);

    // 设置深度思考状态（使用 ref 避免依赖循环）
    if (isDeepThinkFromQuery && !isDeepThinkActiveRef.current) {
      toggleDeepThink();
    }

    // 延迟自动发送消息，确保状态已更新
    setTimeout(async () => {
      // 优先使用 sessionStorage 中的文件列表，其次使用状态（定义在外层，确保后续可用）
      const filesToUse =
        filesFromStorage.length > 0 ? filesFromStorage : allUploadedFiles;

      // 如果没有会话ID，先创建会话
      let targetConversationId = conversationId;
      if (!targetConversationId) {
        if (isCreatingConversationRef.current) {
          toast.info("正在创建会话，请稍候...");
          return;
        }

        isCreatingConversationRef.current = true;

        // 从所有文件中提取 ID
        const paperIds = filesToUse
          .map((file: any) => file.uploadedPaperId || file.fileId)
          .filter((id: string | undefined) => !!id);

        if (paperIds.length > 0) {
 

          const newConversationId = await createAiReadingConversation(paperIds);

          isCreatingConversationRef.current = false;

          if (!newConversationId) {
            toast.error("创建会话失败，请重试");
            return;
          }

          targetConversationId = newConversationId;
        } else {
          console.error("AI伴读 - 没有找到有效的文件 ID:", {
            filesFromStorage,
            allUploadedFiles,
            uploadedPaperIdFromQuery,
          });
          toast.error("文件信息缺失，无法创建会话");
          isCreatingConversationRef.current = false;
          return;
        }
      }

 

      if (targetConversationId) {
        // 从文件列表中提取 ID（用于 attachment_ids）
        const attachmentIdsForSend = filesToUse
          .map((file: any) => file.uploadedPaperId || file.fileId)
          .filter((id: string | undefined) => !!id);

        // 直接传递新创建的 conversationId 和文件附件 ID
        await sendMessageWithOperation(
          inputTextFromQuery.trim(),
          null,
          targetConversationId,
          undefined,
          attachmentIdsForSend.length > 0 ? attachmentIdsForSend : undefined
        );
      } else {
      }
    }, 100);
  }, [
    router.query.inputText,
    router.query.isDeepThink,
    router.query.uploadedPaperId,
    conversationId,
    allUploadedFiles,
    isDeepThinkActiveRef,
    isCreatingConversationRef,
    createAiReadingConversation,
    sendMessageWithOperation,
    setInputText,
    toggleDeepThink,
    setPaperInfo,
  ]);

  // ========== 3. 使用 useAiReadingConversationData 加载会话数据 ==========
  useAiReadingConversationData({
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
    isLoadingHistoryRef: isLoadingHistoryRefLocal,
    onLoadBatchMessageVersions: loadBatchMessageVersions,
    getToken,
    clearUserInfo,
  });

  // ========== 7. 滚动管理 ==========
  const lastScrollTimeRef = useRef<number>(0);
  const { containerRef: chatContainerRef } = useAutoHideScrollbar();
  const { containerRef: pdfScrollContainerRef } = useAutoHideScrollbar();

  const scrollToBottom = useCallback(() => {
    const now = Date.now();
    // 节流：300ms内只执行一次滚动
    if (now - lastScrollTimeRef.current < 300) {
      return;
    }
    lastScrollTimeRef.current = now;

    if (chatContainerRef.current) {
      // 使用平滑滚动
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, []);

  // ========== 9. 辅助函数 ==========

  // 复制消息
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
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      } catch (err) {
        toast.error("复制失败，请重试");
      }
    },
    [messages]
  );

  // 去除文件名后缀
  const getFileNameWithoutExtension = useCallback((fileName: string) => {
    const lastDotIndex = fileName.lastIndexOf(".");
    return lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName;
  }, []);

  // 发送消息
  const sendMessage = useCallback(async () => {
    // 检查输入框是否为空
    if (!inputText.trim()) {
      toast.error("请输入消息内容");
      return;
    }

    if (isLoading) {
      return;
    }

    // 检查是否有文件正在上传或解析
    if (isFileParsing || parsingFileCountRef.current > 0) {
      const uploadingFileNames = uploadedFiles
        .filter(file => file.isUploading)
        .map(file => file.file?.name)
        .filter(Boolean);

      if (uploadingFileNames.length > 0) {
        toast.warning(`文件正在上传中，请稍后再试`);
      } else {
        toast.warning("文件正在处理中，请稍后再试");
      }
      return;
    }

    // 如果有待发送的上传文件，添加到总文件列表
    let attachmentIds: string[] = [];
    let currentFiles = allUploadedFiles;
    // 保存本次上传的文件（用于后续提取 ID）
    const newlyUploadedFiles = [...uploadedFiles];

    // 如果状态为空，尝试从 sessionStorage 加载（处理从 ChatHome 跳转过来的情况）
    if (currentFiles.length === 0 && typeof window !== "undefined") {
      try {
        const filesStr = sessionStorage.getItem("aiReadingFiles");
        if (filesStr) {
          const filesFromStorage = JSON.parse(filesStr);
          if (filesFromStorage.length > 0) {
            currentFiles = filesFromStorage;
            // 同时更新状态
            setAllUploadedFiles(filesFromStorage);
          }
        }
      } catch (error) {
      }
    }

    if (uploadedFiles.length > 0) {
      // 合并文件列表（立即用于提取 ID）
      currentFiles = [...currentFiles, ...uploadedFiles];

      setAllUploadedFiles((prev) => {
        const newFiles = [...prev, ...uploadedFiles];
        // 存储到 sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem("aiReadingFiles", JSON.stringify(newFiles));
        }
        return newFiles;
      });

      // 如果是第一个文件，自动加载 PDF 和标注
      if (allUploadedFiles.length === 0 && uploadedFiles[0]) {
        const firstFile = uploadedFiles[0];
        const fileId = firstFile.uploadedPaperId || firstFile.fileId;
        if (fileId) {
          loadFilePdfInfo(fileId);
          loadPaperAnnotations(fileId);
        }
      }

      // 清空待发送的文件列表
      setUploadedFiles([]);
    }

    // 保存引用内容的本地副本，并立即清除引用显示
    const localCitation = citationContent;
    if (localCitation) {
      clearCitation(); // 立即隐藏引用框
    }

    // 如果没有会话ID，先创建会话
    let targetConversationId = conversationId;
    if (!targetConversationId) {
      if (isCreatingConversationRef.current) {
        toast.info("正在创建会话，请稍候...");
        return;
      }

      // 从所有文件中提取 ID（用于创建新会话）
      const paperIds = currentFiles
        .map(file => file.uploadedPaperId || file.fileId)
        .filter((id): id is string => !!id);

      if (paperIds.length === 0) {
        toast.error("请先上传论文");
        return;
      }

      isCreatingConversationRef.current = true;
      const newConversationId = await createAiReadingConversation(paperIds);
      isCreatingConversationRef.current = false;

      if (!newConversationId) {
        toast.error("创建会话失败，请重试");
        return;
      }

      targetConversationId = newConversationId;

      // 新会话：使用所有文件 ID 作为附件
      attachmentIds = paperIds;
    } else {
      // 已有会话：只使用本次上传的文件 ID 作为附件（不包括历史文件）
      if (newlyUploadedFiles.length > 0) {
        attachmentIds = newlyUploadedFiles
          .map(file => file.uploadedPaperId || file.fileId)
          .filter((id): id is string => !!id);
      }
    }

    // 发送消息（不拼接引用内容到消息文本，但通过 citationContent 参数传递）
    await sendMessageWithOperation(
      inputText.trim(),
      null,
      targetConversationId,
      localCitation || undefined,
      attachmentIds.length > 0 ? attachmentIds : undefined
    );
  }, [
    conversationId,
    inputText,
    isLoading,
    citationContent,
    uploadedFiles,
    allUploadedFiles.length,
    isFileParsing,
    parsingFileCountRef,
    sendMessageWithOperation,
    createAiReadingConversation,
    isCreatingConversationRef,
    clearCitation,
    loadFilePdfInfo,
    loadPaperAnnotations,
  ]);

  // 停止流式输出
  const stopStreaming = useCallback(() => {
    if (currentStreamControllerRef.current) {
      currentStreamControllerRef.current.abort();
      currentStreamControllerRef.current = null;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.isStreaming ? { ...msg, isStreaming: false } : msg
        )
      );
      setIsLoading(false);
      toast.success("已停止输出");
    }
  }, [currentStreamControllerRef, setMessages, setIsLoading]);

  // 重新生成响应
  const regenerateResponse = useCallback(
    async (messageId: string) => {
      const targetMessage = messages.find(
        (msg) => msg.id === messageId || msg.backendId === messageId
      );

      if (!targetMessage || targetMessage.role !== "assistant") {
        toast.error("无法重新生成该消息");
        return;
      }

      const actualMessageId = targetMessage.backendId || targetMessage.id;
      if (!actualMessageId) {
        toast.error("该消息无法重新生成");
        return;
      }

      // 找到对应的用户消息
      const messageIndex = messages.findIndex(
        (msg) =>
          msg.id === targetMessage.id ||
          msg.backendId === targetMessage.backendId
      );

      if (messageIndex <= 0) {
        toast.error("找不到对应的用户消息");
        return;
      }

      // 中止当前流式输出
      if (currentStreamControllerRef.current) {
        currentStreamControllerRef.current.abort();
        currentStreamControllerRef.current = null;
      }

      // 移除当前AI消息及之后的所有消息
      setMessages((prev) => prev.slice(0, messageIndex));
      setIsLoading(true);
      setLatestAiMessageId(null);

      const userMessage = messages[messageIndex - 1];
      const newAiMessageId = `assistant-${Date.now()}`;
      const aiMessage: Message = {
        id: newAiMessageId,
        role: "assistant",
        content: "",
        timestamp: getCurrentTime(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, aiMessage]);

      try {
        const token = getToken();
        if (!token) {
          throw new Error("用户未登录");
        }

        const controller = new AbortController();
        currentStreamControllerRef.current = controller;

        const response = await fetch(
          `/api/chat/messages/${actualMessageId}/regenerate`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            signal: controller.signal,
            body: JSON.stringify({
              conversation_id: conversationId,
              is_deep_think: isDeepThinkActive,
              stream: true,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        await processStreamResponse(
          response.body,
          newAiMessageId,
          async (newBackendId: string) => {
            setTimeout(async () => {
              await loadBatchMessageVersions(
                conversationId!,
                [newBackendId],
                messages,
                false,
                setMessages
              );
            }, 1000);
          }
        );
      } catch (error: unknown) {
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
              ? { ...msg, isStreaming: false, content: errorMessage }
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
      conversationId,
      isLoading,
      isDeepThinkActive,
      getToken,
      getCurrentTime,
      processStreamResponse,
      loadBatchMessageVersions,
      currentStreamControllerRef,
      setMessages,
      setIsLoading,
      setLatestAiMessageId,
    ]
  );

  // ========== 11. 文件上传处理 ==========
  const handleAddFile = useCallback(() => {
    const currentTotalFiles = allUploadedFiles.length + uploadedFiles.length;
    if (currentTotalFiles >= 5) {
      toast.error("最多只能上传5个文件");
      return;
    }
    setShowFileUploadModal(true);
  }, [allUploadedFiles.length, uploadedFiles.length]);

  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 文件上传完成处理
  const handleFileUpload = useCallback((files: any[]) => {
  

    // 更新已存在的文件状态，移除 isUploading 标记
    setUploadedFiles((prev) => {
      const updated = prev.map((file) => {
        // 找到对应的上传成功文件，通过文件名匹配（因为上传前的文件没有 fileId）
        const completedFile = files.find(
          (f) => f.file?.name === file.file?.name ||
                 f.uploadedPaperId === file.uploadedPaperId ||
                 f.fileId === file.fileId
        );

        if (completedFile) {     
                    return {
            ...file,
            ...completedFile,
            isUploading: false, // 标记为上传完成
          };
        }

        return file;
      });

      return updated;
    });
    setShowFileUploadModal(false);
  }, [uploadedFiles]);

  // 处理文件上传开始
  const handleUploadStart = useCallback(() => {
    parsingFileCountRef.current += 1;
    setIsFileParsing(true);
  }, []);

  // 处理文件上传结束
  const handleUploadEnd = useCallback(() => {
    parsingFileCountRef.current -= 1;
    if (parsingFileCountRef.current === 0) {
      setIsFileParsing(false);
    }
  }, []);

  // 处理文件添加（显示上传中的状态）
  const handleFilesAdding = useCallback((files: any[]) => {
    setUploadedFiles((prev) => {
      // 只添加不存在的文件
      const existingFileIds = new Set(
        prev.map((f) => f.uploadedPaperId || f.fileId || f.file?.name)
      );

      const newFiles = files.filter((file) => {
        const fileId = file.uploadedPaperId || file.fileId || file.file?.name;
        return !existingFileIds.has(fileId);
      });

      return [...prev, ...newFiles];
    });
  }, []);

  // ========== 12. AI 操作处理 ==========
  const handleAIOperation = useCallback(
    (operation: AIOperation, selectedText: string, context?: any) => {
      switch (operation) {
        case "cite":
          setCitationContent(selectedText);
          toast.success("已添加引用内容");
          break;
        case "translate":
        case "summarize":
        case "explain": {
          // 根据操作类型生成对应的消息内容
          let operationPrompt = "";
          switch (operation) {
            case "translate":
              operationPrompt = `对"${selectedText}"进行翻译`;
              break;
            case "summarize":
              operationPrompt = `对"${selectedText}"进行AI总结`;
              break;
            case "explain":
              operationPrompt = `对"${selectedText}"进行名词解释`;
              break;
          }

          sendMessageWithOperation(operationPrompt, {
            type: operation,
            selectedText,
          } as any);
          break;
        }
      }
    },
    [
      sendMessageWithOperation,
      setCitationContent,
    ]
  );

  // ========== 13. 版本切换处理 ==========
  const handleSwitchToVersion = useCallback(
    async (messageId: string, targetVersion: number) => {
      // 设置版本切换标志，阻止自动滚动
      isVersionSwitchingRef.current = true;

      try {
        await switchToVersion(
          messageId,
          targetVersion,
          versions,
          setMessages,
          currentVersionMessageIds,
          setCurrentVersionMessageIds
        );
      } finally {
        // 延迟重置标志，确保滚动 useEffect 已经跳过
        setTimeout(() => {
          isVersionSwitchingRef.current = false;
        }, 200);
      }
    },
    [
      switchToVersion,
      versions,
      setMessages,
      currentVersionMessageIds,
      setCurrentVersionMessageIds,
    ]
  );

  const handleVersionPrevious = useCallback(
    async (messageId: string) => {
      const versionInfo = versions[messageId];
      if (!versionInfo) return;

      const currentVersion = versionInfo.currentVersion || 1;
      if (currentVersion <= 1) {
        toast.info("已经是第一个版本了");
        return;
      }

      await handleSwitchToVersion(messageId, currentVersion - 1);
    },
    [versions, handleSwitchToVersion]
  );

  const handleVersionNext = useCallback(
    async (messageId: string) => {
      const versionInfo = versions[messageId];
      if (!versionInfo) return;

      const currentVersion = versionInfo.currentVersion || 1;
      const totalVersions = versionInfo.totalVersions || 1;
      if (currentVersion >= totalVersions) {
        toast.info("已经是最新版本了");
        return;
      }

      await handleSwitchToVersion(messageId, currentVersion + 1);
    },
    [versions, handleSwitchToVersion]
  );

  // ========== 13.1 创建包装的 toggleThinkingCollapse 函数 ==========
  const toggleThinkingCollapseWithPreventScroll = useCallback((messageId: string) => {
    // 设置折叠切换标志，阻止自动滚动
    isTogglingCollapseRef.current = true;

    // 调用原始的 toggleThinkingCollapse
    toggleThinkingCollapse(messageId);

    // 延迟重置标志，确保滚动 useEffect 已经跳过
    setTimeout(() => {
      isTogglingCollapseRef.current = false;
    }, 100);
  }, [toggleThinkingCollapse]);

  // ========== 14. 滚动管理 ==========

  // 用于追踪滚动状态
  const isAutoScrollEnabledRef = useRef<boolean>(true);
  const messagesRef = useRef<Message[]>(messages);

  // 同步 messages 到 ref
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // 页面刷新后，当历史消息加载完成时自动滚动到底部
  useEffect(() => {
    // 如果正在切换版本或切换折叠状态，不自动滚动
    if (isVersionSwitchingRef.current || isTogglingCollapseRef.current) {
      return;
    }

    // 只有在消息加载完成且有历史消息时才滚动
    if (!isLoadingHistoryRefLocal.current && messages.length > 0 && !isLoading) {
      

      // 使用 requestAnimationFrame 确保在下一帧渲染后滚动
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      });

      return;
    }
  }, [messages, isLoading, scrollToBottom, isLoadingHistoryRefLocal]);

  // 持续滚动逻辑 - 只创建一次，持续检查并滚动
  useEffect(() => {
    // 创建定时器，持续检查并滚动
    const scrollTimer = setInterval(() => {
      // 如果正在切换版本或切换折叠状态，不滚动
      if (isVersionSwitchingRef.current || isTogglingCollapseRef.current) {
        return;
      }

      if (!chatContainerRef.current || !isAutoScrollEnabledRef.current) {
        return;
      }

      // 从 ref 获取最新的 messages
      const currentMessages = messagesRef.current;
      if (currentMessages.length === 0) return;

      // 检查最后一条消息
      const lastMessage = currentMessages[currentMessages.length - 1];
      if (!lastMessage) return;

      // 用户消息或AI流式消息时自动滚动
      const shouldAutoScroll =
        lastMessage.role === "user" ||
        (lastMessage.role === "assistant" && lastMessage.isStreaming);

      if (shouldAutoScroll) {
        const container = chatContainerRef.current;
        const scrollHeight = container.scrollHeight;
        container.scrollTo({
          top: scrollHeight,
          behavior: "auto",
        });
      }
    }, 100); // 每 100ms 检查一次

    return () => clearInterval(scrollTimer);
  }, []); // 空依赖数组，只创建一次定时器

  // ========== 15. 渲染 ==========
  return (
    <>
      <Head>
        <title>AI智慧学术交互图书馆-AI伴读</title>
      </Head>

      <div className="flex flex-col h-full overflow-hidden">
        {/* 主要内容区域 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左右分栏布局 */}
          <div className="flex w-full h-full gap-0 overflow-hidden">
            {/* 左侧 - PDF 阅读器 */}
            <div
              className="flex-1 pr-[20px] sm:pr-[50px] flex flex-col h-full min-w-0"
              style={{ maxWidth: "100%", flexBasis: 0 }}
            >
              <div className="flex-shrink-0 pb-2">
                {allUploadedFiles.length > 0 && (
                  <div className="mb-3" style={{ marginLeft: "5px" }}>
                    <SmartFileTags
                      files={allUploadedFiles}
                      selectedFileIndex={selectedFileIndex}
                      setSelectedFileIndex={handleFileSwitch}
                      onBackToChat={handleBackToChat}
                      getFileNameWithoutExtension={getFileNameWithoutExtension}
                    />
                  </div>
                )}
              </div>

              {/* PDF 阅读器容器 */}
              <div
                ref={pdfScrollContainerRef}
                className="flex-1 overflow-y-auto overflow-x-auto auto-hide-scrollbar pb-[80px]"
                style={{ maxHeight: "calc(100vh - 310px)" }}
              >
                {isPdfLoading ? (
                  <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-500">正在加载PDF文件...</p>
                    </div>
                  </div>
                ) : currentPdfInfo?.file_url ? (
                  <div className="min-h-full">
                    <PdfViewer
                      fileUrl={currentPdfInfo.file_url}
                      uploadedPaperId={currentPdfInfo.id}
                      highlightAreas={paperAnnotations[currentPdfInfo.id] || []}
                      onAIOperation={handleAIOperation}
                      onHighlight={(data: any) => {
                        if (currentPdfInfo?.id) {
                          handleHighlightAnnotation(
                            {
                              text: data.text,
                              pageNumber: data.pageNumber,
                              positionJson: data.positionJson,
                              areas: data.areas || [],
                            },
                            currentPdfInfo.id,
                            getToken
                          );
                        }
                      }}
                      isAiResponding={isAiResponding}
                    />
                  </div>
                ) : allUploadedFiles.length > 0 ? (
                  <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-500">正在获取文件信息...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[calc(100vh-200px)] bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <p className="text-gray-500">暂无文件</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 中间分隔线 */}
            <div className="w-[1px] h-full bg-[#E2E3E7] flex-shrink-0"></div>

            {/* 右侧 - AI对话 */}
            <div
              className="flex-1 pl-[20px] sm:pl-[40px] flex flex-col h-full overflow-hidden min-w-0"
              style={{ overflow: "hidden", maxWidth: "100%", flexBasis: 0 }}
            >
              {/* AI对话内容区域 */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto overflow-x-auto auto-hide-scrollbar"
                style={{ maxHeight: "calc(100vh - 265px)" }}
              >
                {/* 顶部间距 */}
                <div className="h-[70px] flex-shrink-0"></div>

                {messageError && (
                  <div className="text-red-500 text-center py-10">
                    {messageError}
                  </div>
                )}

                {/* 消息列表 */}
                <div className="space-y-5 pb-20">
                  {messages.map((message) => {
                    const actualMessageId = message.backendId || message.id;
                    const currentVersionMessageId = message.backendId
                      ? currentVersionMessageIds[message.backendId] ||
                        message.backendId
                      : undefined;
                    const canRegenerate =
                      message.role === "assistant" &&
                      message.backendId === latestAiMessageId;

                    return (
                      <ChatMessage
                        key={message.id}
                        id={message.id}
                        role={message.role}
                        content={message.content}
                        timestamp={message.timestamp}
                        files={message.files}
                        username={userInfo?.username || "用户"}
                        thinking={message.thinking}
                        isThinkingCollapsed={message.isThinkingCollapsed}
                        isStreaming={message.isStreaming}
                        backendId={message.backendId}
                        copied={copiedMessageId === message.id}
                        onToggleCollapse={toggleThinkingCollapseWithPreventScroll}
                        onCopy={copyMessageContent}
                        onRegenerate={regenerateResponse}
                        onStopStreaming={stopStreaming}
                        isAiResponding={isAiResponding}
                        totalVersions={message.totalVersions}
                        currentVersion={message.currentVersion}
                        onPreviousVersion={() =>
                          handleVersionPrevious(actualMessageId)
                        }
                        onNextVersion={() => handleVersionNext(actualMessageId)}
                        thinkingMaxWidth="min(1070px, calc(100vw - 280px))"
                        isLiked={message.isLiked}
                        isDisliked={message.isDisliked}
                        onFeedbackSuccess={(mid, type) =>
                          handleFeedbackSuccess(
                            mid,
                            type,
                            setMessages,
                            versions,
                            setMessageVersions,
                            currentVersionMessageIds
                          )
                        }
                        currentVersionMessageId={currentVersionMessageId}
                        canRegenerate={canRegenerate}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 输入框区域 */}
      <div
        className="fixed bottom-4 z-100"
        style={{
          left: isSidebarOpen
            ? "max(224px, calc((100vw - 1920px) / 2 + 224px))"
            : "max(70px, calc((100vw - 1920px) / 2 + 70px))",
          right: "max(16px, calc((100vw - 1920px) / 2 + 16px))",
          maxWidth: "1920px",
          width: "auto",
        }}
      >
        <div className="pt-4 pb-0">
          <MessageInput
            ref={messageInputRef}
            inputText={inputText}
            onChange={setInputText}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !isLoading) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onSend={sendMessage}
            uploadedFiles={uploadedFiles}
            onRemoveFile={handleRemoveFile}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            isDeepThinkActive={isDeepThinkActive}
            toggleDeepThink={toggleDeepThink}
            isPaperSearchActive={false}
            togglePaperSearch={() => {}}
            isLoading={isLoading}
            currentFunction="aiReading"
            onCloseFunction={handleCloseAiReading}
            isFromOtherPage={false}
            onAddFile={handleAddFile}
            totalFileCount={allUploadedFiles.length + uploadedFiles.length}
            isAiReadingActive={true}
            isFileParsing={isFileParsing}
          />
        </div>

        {/* 引用内容显示容器 */}
        {citationContent && (
          <div
            className="absolute z-50 max-w-6xl mx-auto rounded-t-[20px] border border-[#D3DAE6] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)]"
            style={{
              width: "calc(100% - 32px)",
              height: "80px",
              bottom: "calc(100% - 16px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(59,128,255,0.1)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(8px)",
              borderBottomLeftRadius: "0px",
              borderBottomRightRadius: "0px",
            }}
          >
            <div className="flex items-center h-full pr-6">
              <div
                className="flex-1 min-w-0 overflow-hidden"
                style={{ marginLeft: "40px" }}
              >
                <span
                  className="text-gray-700 block max-w-full"
                  style={{
                    fontWeight: 500,
                    fontSize: "16px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "block",
                  }}
                >
                  {citationContent}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={clearCitation}
                    className="flex-shrink-0 ml-3 p-2 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>清除引用</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>

      {/* 文件上传模态框 */}
      <FileUploadModal
        show={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onFileUpload={handleFileUpload}
        totalFileCount={allUploadedFiles.length + uploadedFiles.length}
        onUploadStart={handleUploadStart}
        onUploadEnd={handleUploadEnd}
        onFilesAdding={handleFilesAdding}
      />
    </>
  );
}
