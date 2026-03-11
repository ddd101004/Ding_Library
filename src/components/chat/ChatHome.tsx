"use client";
import React, { useState, useRef, useEffect } from "react";
import { flushSync } from "react-dom";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "sonner";
import AvatarHoverMenu from "./common/AvatarHoverMenu";
import FileUploadModal from "./common/FileUploadModal";
import ChatInput, { ChatInputRef } from "./common/ChatInput";
import Toolbar from "./common/Toolbar";
import FileTags from "./common/FileTags";
import FunctionSelection from "./common/FunctionSelection";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useFileHandler } from "@/hooks/use-file-handler";
import { useConversation } from "@/hooks/use-conversation";
import { usePreload } from "@/hooks/use-preload";
import { useUser } from "@/components/contexts/UserContext";

// 根据时间生成问候语
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return "早上好";
  if (hour >= 9 && hour < 12) return "上午好";
  if (hour >= 12 && hour < 14) return "中午好";
  if (hour >= 14 && hour < 18) return "下午好";
  return "晚上好";
};

export default function ChatHome() {
  const { userInfo } = useUser();
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
  const [isPaperSearchActive, setIsPaperSearchActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sendButtonHover, setSendButtonHover] = useState(false);
  const [isAiReadingActive, setIsAiReadingActive] = useState(false);
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [isAiReadingUploadMode, setIsAiReadingUploadMode] = useState(false); // 标记是否是AI伴读模式下的上传
  const [aiReadingFilesUploaded, setAiReadingFilesUploaded] = useState(false); // 标记AI伴读模式下是否已上传文件
  const [currentFileCount, setCurrentFileCount] = useState(0); // 当前文件数量
  const [isFileParsing, setIsFileParsing] = useState(false); // 文件解析状态
  const parsingFileCountRef = useRef(0); // 正在解析的文件数量计数器

  const avatarPopupRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  
  const { isRecording, toggleRecording, transcribedText, setTranscribedText } = useAudioRecorder();
  const { preloadMultiple } = usePreload();
  
  const {
    uploadedFiles,
    setUploadedFiles,
    showUploadModal,
    setShowUploadModal,
    isUploading,
    setUploadingStatus,
    handleFileUpload,
    handleFileCompleted,
    handleRemoveFile,
    formatFileContent,
    saveFilesToSession,
    clearUploadedFiles
  } = useFileHandler();

  // 包装文件上传处理函数
  const handleAiReadingFileUpload = async (files: any[]) => {
    // AI伴读模式下，文件已经在 FileUploadModal 中上传过了
    // 这里只需要保存 uploadedPaperId 到文件对象中
    if (isAiReadingActive) {
      for (const fileData of files) {
        // FileUploadModal 已经在上传时设置了 fileId，这里直接使用
        if (fileData.fileId) {
          fileData.uploadedPaperId = fileData.fileId;
        }
      }

      // 调用原有的文件上传处理（不再重复上传）
      await handleFileUpload(files);
    } else {
      // 非AI伴读模式，使用原有逻辑
      await handleFileUpload(files);
    }
  };
  
  const { handleSendMessage, isSending } = useConversation();

  // 处理文件上传开始
  const handleUploadStart = () => {
    // 增加计数器
    parsingFileCountRef.current += 1;

    flushSync(() => {
      setIsFileParsing(true);
    });
  };

  // 处理文件上传结束
  const handleUploadEnd = () => {
    // 减少计数器
    parsingFileCountRef.current -= 1;

    // 只有当所有文件都解析完成时，才恢复发送按钮
    if (parsingFileCountRef.current === 0) {
      setIsFileParsing(false);
    }
  };

  // 处理文件添加（上传开始前立即显示文件卡片）
  const handleFilesAdding = (files: any[]) => {
    // 将上传中的文件添加到列表
    setUploadedFiles(prev => [...prev, ...files]);

    // AI伴读模式下，用户选择文件后立即显示功能标签
    if (isAiReadingUploadMode) {
      setIsAiReadingActive(true);
    }
  };

  const router = useRouter();
  const { preloadData } = usePreload();

  // 快问快答默认问题
  const quickQADefaults = [
    "什么是人工智能？它的主要应用领域有哪些？",
    "机器学习与深度学习的主要区别是什么？",
    "自然语言处理在日常生活中有哪些应用？",
    "计算机视觉技术如何改变我们的生活？",
    "大数据分析对企业决策有什么帮助？",
  ];

  // 计算白色背景层和layer-3背景的高度偏移量
  const backgroundOffset = uploadedFiles.length > 0 ? 80 : 0;

  // 保存语音识别前的文本内容
  const textBeforeRecording = useRef('');

  // 包装 toggleRecording 函数以处理文本状态
  const handleToggleRecording = () => {
    if (!isRecording) {
      // 开始录音前保存当前文本
      textBeforeRecording.current = inputText;
      // 设置累积文本为当前输入框的文本
      setTranscribedText(inputText); // 这里会更新 accumulatedTextRef
    } else {
      // 停止录音时不需要重置，保持累积文本
    }
    toggleRecording();
  };

  // 实时更新输入框中的语音识别文字
  useEffect(() => {
    if (isRecording || transcribedText) {
      // 直接使用 transcribedText，它已经包含了累积的文本
      setInputText(transcribedText);
    }
  }, [transcribedText, isRecording]);

  // 监听上传弹窗关闭，自动聚焦到输入框
  useEffect(() => {
    if (!showUploadModal) {
      // 弹窗关闭后延迟聚焦，确保 DOM 更新完成
      const timer = setTimeout(() => {
        chatInputRef.current?.focusToEnd();
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [showUploadModal]);

  // 注意：移除了文件上传状态与AI伴读状态的自动关联
  // AI伴读状态现在只通过用户点击按钮来控制

  // 组件挂载时预加载所有深度学习关键词
  useEffect(() => {
    const preloadAllKeywords = async () => {
      const preloadConfigs = [
        {
          endpoint: "/api/ai/keywords",
          params: { keyword: "人工智能前沿技术", count: 13 },
          config: { cacheKey: "deepLearning_cuttingEdge_keywords", defaultData: [] }
        },
        {
          endpoint: "/api/ai/keywords",
          params: { keyword: "科学研究方法", count: 13 },
          config: { cacheKey: "deepLearning_basicResearch_keywords", defaultData: [] }
        },
        {
          endpoint: "/api/ai/keywords",
          params: { keyword: "AI核心技术", count: 13 },
          config: { cacheKey: "deepLearning_coreTechnology_keywords", defaultData: [] }
        },
        {
          endpoint: "/api/ai/keywords",
          params: { keyword: "人工智能基础概念", count: 13 },
          config: { cacheKey: "deepLearning_coreConcepts_keywords", defaultData: [] }
        }
      ];

      await preloadMultiple(preloadConfigs);
    };

    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      window.requestIdleCallback(preloadAllKeywords, { timeout: 5000 });
    } else {
      preloadAllKeywords();
    }
  }, [preloadMultiple]);

  // 组件挂载时清理可能残留的AI伴读状态
  useEffect(() => {
    // 检查是否有残留的AI伴读文件信息
    if (typeof window !== 'undefined') {
      const hasAiReadingFiles = sessionStorage.getItem('aiReadingFiles');
      const hasTransferredFiles = sessionStorage.getItem('transferredFiles_nav') || sessionStorage.getItem('transferredFiles_home');

      // 如果有残留的文件信息，清理它们
      if (hasAiReadingFiles || hasTransferredFiles) {
        sessionStorage.removeItem('aiReadingFiles');
        sessionStorage.removeItem('aiReadingConversationId');
        sessionStorage.removeItem('transferredFiles_home');
        sessionStorage.removeItem('transferredFiles_nav');

        // 清理文件状态
        clearUploadedFiles();

        // 重置状态
        setIsAiReadingActive(false);
        setIsAiReadingUploadMode(false);
        setAiReadingFilesUploaded(false);
        setCurrentFileCount(0);
      }
    }
  }, []); // 只在组件挂载时执行一次

  // 监听路由变化，清理AI伴读状态
  useEffect(() => {
    // 路由开始变化时清空AI伴读状态
    const handleRouteChangeStart = (url: string) => {
      // 如果离开ChatHome页面，立即清空AI伴读状态
      if (!url.includes('/chat') && url !== '/') {
        setIsAiReadingActive(false);
        setIsAiReadingUploadMode(false);
        setAiReadingFilesUploaded(false);
        setCurrentFileCount(0);
      }
    };

    // 路由变化完成后清理文件信息
    const handleRouteChangeComplete = (url: string) => {
      // 如果返回到ChatHome页面，清理AI伴读相关的文件信息
      if (url === '/' || url.includes('/chat')) {
        // 强制清理useFileHandler中的文件状态
        clearUploadedFiles();

        // 清理sessionStorage中的所有相关文件信息
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('aiReadingFiles');
          sessionStorage.removeItem('aiReadingConversationId');
          sessionStorage.removeItem('transferredFiles_home');
          sessionStorage.removeItem('transferredFiles_nav');
        }

        // 重置AI伴读相关状态
        setIsAiReadingActive(false);
        setIsAiReadingUploadMode(false);
        setAiReadingFilesUploaded(false);
        setCurrentFileCount(0);

        // 确保页面刷新时状态也被重置
        setTimeout(() => {
          if (uploadedFiles.length > 0) {
            clearUploadedFiles();
          }
        }, 100);
      }
    };

    // 监听路由变化事件
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    // 组件卸载时清理事件监听
    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [router.events, clearUploadedFiles, uploadedFiles.length]);

  // 搜索历史记录
  const [searchHistory] = useState<string[]>([
    "多模态模型",
    "开源大模型",
    "RAG",
    "生成式AI",
    "MoE",
  ]);

  // 切换DeepThink状态
  const toggleDeepThink = () => {
    setIsDeepThinkActive(!isDeepThinkActive);
  };

  // 切换论文搜索状态
  const togglePaperSearch = () => {
    setIsPaperSearchActive(!isPaperSearchActive);
  };

  // 发送消息 - 关键修改：保存文件到sessionStorage用于传递
  const handleSend = async () => {
    // 检查输入文本是否为空
    if (!inputText.trim()) {
      toast.warning("输入框不能为空，请输入消息内容");
      return;
    }

    // 检查要发送的文件是否正在上传或解析
    if (uploadedFiles.some(file => file.isUploading)) {
      toast.warning("文件解析中，请稍后再试");
      return;
    }

    // 检查是否是AI伴读模式 - 修改：简化判断条件，只要激活了AI伴读且有文件就进入AI伴读流程
    // 修复：只要激活了AI伴读模式且有文件，就进入AI伴读流程，不再要求uploadedPaperId
    if (isAiReadingActive && uploadedFiles.length > 0) {
      // AI伴读模式限制文件数量最多5个
      if (uploadedFiles.length > 5) {
        toast.error("AI伴读模式暂不支持多余五个文件，请删减文件后重试");
        return;
      }

      const file = uploadedFiles[0];
      if (!file) {
        toast.error("文件信息不完整，请重新上传");
        return;
      }

      // 保存文件到 sessionStorage（用于跳转到AI伴读对话页面）
      const filesToSave = uploadedFiles.map(file => {
        // 确保有uploadedPaperId，如果没有则使用fileId
        const uploadedPaperId = file.uploadedPaperId || file.fileId || null;
        return {
          file: {
            name: file.file.name,
            type: file.file.type,
            size: file.file.size
          },
          fileId: file.fileId,
          uploadedPaperId: uploadedPaperId
        };
      });

      sessionStorage.setItem('transferredFiles_home', JSON.stringify(filesToSave));
      sessionStorage.setItem('aiReadingFiles', JSON.stringify(filesToSave));

      // 跳转到AI伴读对话页面，传递文件ID（如果有）
      router.push({
        pathname: "/ai-reading-chat",
        query: {
          inputText,
          isDeepThink: isDeepThinkActive,
          uploadedPaperId: file.uploadedPaperId || file.fileId || undefined,
          functionName: "aiReading",
        },
      });
      return;
    }

    // 非AI伴读模式，正常处理
    // 保存文件到 sessionStorage
    if (uploadedFiles.length > 0) {
      const filesToSave = uploadedFiles.map(file => ({
        file: {
          name: file.file.name,
          type: file.file.type,
          size: file.file.size
        },
        fileId: file.fileId || null, // 修复：保存fileId
        uploadedPaperId: file.uploadedPaperId || null
      }));
      
      sessionStorage.setItem('transferredFiles_home', JSON.stringify(filesToSave));
    }

    await handleSendMessage({
      inputText,
      uploadedFiles,
      isDeepThinkActive,
      isPaperSearchActive,
      currentFunction: isAiReadingActive ? "aiReading" : null,
      formatFileContent,
      saveFilesToSession
    });
  };

  // 处理导航 - 保存文件到sessionStorage用于传递
  const handleNavigate = async (functionType: string) => {
    if (functionType === "aiReading") {
      // 如果论文搜索处于激活状态，需要取消并提示用户
      if (isPaperSearchActive) {
        setIsPaperSearchActive(false);
        toast.info("AI伴读功能暂不支持论文搜索");
      }

      // 检查是否已经有上传的文件
      if (uploadedFiles.length > 0) {
        // AI伴读模式限制文件数量最多5个
        if (uploadedFiles.length > 5) {
          toast.error("AI伴读模式暂不支持多余五个文件，请删减文件后重试");
          return;
        }

        // 有文件，需要为AI伴读模式设置uploadedPaperId
        const filesToSave = uploadedFiles.map(file => {
          // 如果文件有fileId但没有uploadedPaperId，则设置uploadedPaperId
          const uploadedPaperId = file.uploadedPaperId || file.fileId || null;
          return {
            file: {
              name: file.file.name,
              type: file.file.type,
              size: file.file.size
            },
            fileId: file.fileId || null,
            uploadedPaperId: uploadedPaperId
          };
        });

        // 同时更新内存中的文件状态，确保uploadedPaperId被设置
        uploadedFiles.forEach(file => {
          if (!file.uploadedPaperId && file.fileId) {
            file.uploadedPaperId = file.fileId;
          }
        });

        sessionStorage.setItem('transferredFiles_nav', JSON.stringify(filesToSave));

        // 激活AI伴读功能标签
        setIsAiReadingActive(true);
      } else {
        // 没有文件，弹出上传弹窗并标记为AI伴读模式
        setIsAiReadingActive(true);
        setIsAiReadingUploadMode(true);
        setAiReadingFilesUploaded(false);
        setShowUploadModal(true);
      }
      return;
    }

    // 快问快答：立即发起请求获取随机问题
    if (functionType === "quickQA") {
      // 立即发起请求，不等待页面跳转
      preloadData(
        "/api/ai/questions",
        { keyword: "", count: 5 },
        {
          cacheKey: "quickQA_questions",
          defaultData: quickQADefaults,
        }
      ).then((questions) => {
        // 将获取到的问题保存到sessionStorage
        sessionStorage.setItem("quickQA_questions_prefetched", JSON.stringify(questions));
      }).catch((error) => {
        console.error("预加载快问快答问题失败:", error);
      });
    }

    // 深度学习和快问快答：只有当有文件时才保存
    if (uploadedFiles.length > 0) {
      const filesToSave = uploadedFiles.map(file => ({
        file: {
          name: file.file.name,
          type: file.file.type,
          size: file.file.size
        },
        fileId: file.fileId || null,
        uploadedPaperId: file.uploadedPaperId || null
      }));

      sessionStorage.setItem('transferredFiles_nav', JSON.stringify(filesToSave));
    } else {
      // 没有文件时，清除之前的sessionStorage数据
      sessionStorage.removeItem('transferredFiles_nav');
    }

    router.push({
      pathname: "/checkedchat",
      query: {
        function: functionType,
        inputText,
        isDeepThink: isDeepThinkActive,
        isPaperSearch: isPaperSearchActive,
      },
    });
  };


// 处理关闭AI伴读功能
  const handleCloseAiReading = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAiReadingActive(false);
  };

// 处理所有文件删除时的AI伴读状态关闭
  const handleAllFilesRemoved = () => {
    // 只有当AI伴读状态是激活时才关闭
    if (isAiReadingActive) {
      setIsAiReadingActive(false);
    }
  };

  // 文件数量变化回调
  const handleFileCountChange = (count: number) => {
    setCurrentFileCount(count);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      // 检查要发送的文件是否正在上传或解析
      if (uploadedFiles.some(file => file.isUploading)) {
        toast.warning("文件解析中，请稍后再试");
        return;
      }

      handleSend();
    }
  };

  return (
    <>
      <Head>
        <title>AI智慧学术交互图书馆-AI对话</title>
      </Head>

      {/* 文件上传弹窗 */}
      <FileUploadModal
        show={showUploadModal}
        preventAutoClose={isAiReadingUploadMode} // AI伴读模式下阻止自动关闭
        totalFileCount={currentFileCount}
        onUploadStart={handleUploadStart}
        onUploadEnd={handleUploadEnd}
        onFilesAdding={handleFilesAdding}
        onFileCompleted={handleFileCompleted}
        onClose={() => {
          // AI伴读模式下，只有在用户没有选择任何文件时才关闭标签
          // 如果用户已经选择了文件（uploadedFiles.length > 0），则保持标签显示
          if (isAiReadingUploadMode && uploadedFiles.length === 0) {
            setIsAiReadingActive(false);
          }
          setIsAiReadingUploadMode(false);
          setShowUploadModal(false);
        }}
        onFileUpload={(files) => {
          // 检查是否有成功上传的文件
          if (files.length === 0) {
            // 没有成功上传的文件，不关闭弹窗
            return;
          }

          // 使用局部变量保存是否是AI伴读模式（避免状态更新异步问题）
          const isAiReadingMode = isAiReadingUploadMode;

          // AI伴读模式下检查文件数量限制
          if (isAiReadingMode) {
            const currentTotalFiles = currentFileCount + files.length;
            if (currentTotalFiles > 5) {
              // 计算还能上传多少个文件
              const remainingSlots = 5 - currentFileCount;
              if (remainingSlots > 0) {
                toast.error(`AI伴读模式下文件总数不得超过五个，当前还可上传${remainingSlots}个文件`);
              } else {
                toast.error("AI伴读模式下文件总数不得超过五个，请删除已有文件后再上传");
              }
              return;
            }
          }

          setAiReadingFilesUploaded(true); // 标记已上传文件
          handleAiReadingFileUpload(files);

          // AI伴读模式下，确保标签保持激活状态（在文件处理之后再设置，确保状态正确）
          if (isAiReadingMode) {
            setIsAiReadingActive(true);
          }

          // 成功上传文件后关闭弹窗（useEffect 会自动聚焦到输入框）
          setShowUploadModal(false);
          setIsAiReadingUploadMode(false);
        }}
      />

      {/* 用户头像 */}
      <AvatarHoverMenu />

      {/* 主容器 - 水平垂直居中 */}
      <div className="flex-1 flex justify-center items-center w-full">
        <div className="relative responsive-container w-full">
          {/* 问候语 - 绝对定位在左上角 */}
          <div className="absolute text-gray-900 flex flex-col gap-[20px] z-30 left-[40px] -top-[200px]">
            <div className="text-[60px] font-medium">
              {getGreeting()}，{userInfo?.username || "访客"}
            </div>
            <div className="text-[24px]">
              能听懂人话的图书馆，千人千面，找到"与你相关"的科学
            </div>
          </div>

          {/* 主内容卡片容器 */}
          <div
            className="flex w-full transition-all duration-300"
            style={{
              height: `${310 + backgroundOffset}px`,
              maxWidth: '1300px'
            }}
          >
            {/* 背景 - 修改：替换背景图片为纯色背景 */}
            <div
              className="absolute inset-0 rounded-[20px] z-10 transition-all duration-300 overflow-hidden"
              style={{ 
                height: `${300 + backgroundOffset}px`,
                backgroundColor: '#d5f4cfff' // 淡青色背景
              
              }}
            >
              {/* 移除了背景图片，改为纯色背景 */}
            </div>

            {/* 白色背景层 */}
            <div
              className="absolute w-[calc(100%-20px)] mx-auto bg-white rounded-[20px] top-[10px] left-[10px] pt-[10px] z-20 px-4 transition-all duration-300"
              style={{ height: `${180 + backgroundOffset}px` }}
            >
              {/* 上传的文件标签 */}
              <div className="relative top-[30px] z-30">
                <FileTags
                  files={uploadedFiles}
                  onRemoveFile={(index) => handleRemoveFile(index, handleAllFilesRemoved)}
                  maxFiles={5}
                  onFileCountChange={handleFileCountChange}
                />
              </div>
              
              <div className="flex flex-col h-full">
                {/* 输入框 */}
                <div
                  className="flex items-center transition-all duration-300"
                  style={{ marginTop: `${backgroundOffset > 0 ? 80 : 0}px` }}
                >
                  {/* AI伴读功能标签 */}
                  {isAiReadingActive && (
                    <>
                      <FunctionSelection
                        functionType="aiReading"
                        onClose={handleCloseAiReading}
                        isFileParsing={isFileParsing}
                      />
                      <div className="w-[1px] h-[30px] bg-[#E0E1E5] rounded-[1px] mx-3"></div>
                    </>
                  )}

                  {/* 输入框 */}
                  <div className="flex-1">
                    <ChatInput
                      ref={chatInputRef}
                      value={inputText}
                      onKeyDown={handleKeyDown}
                      onChange={setInputText}
                      className="pt-4 text-xl text-gray-700 bg-transparent border-none focus:outline-none resize-none flex-1"
                      placeholder="你想了解什么AI技术？"
                      maxHeight={150}
                    />
                  </div>
                </div>

                {/* 按钮区域 */}
                <div
                  className="absolute left-5 right-5 transition-all duration-300"
                  style={{ top: `${123 + backgroundOffset}px` }}
                >
                  <Toolbar
                    isDeepThinkActive={isDeepThinkActive}
                    onToggleDeepThink={toggleDeepThink}
                    isPaperSearchActive={isPaperSearchActive}
                    onTogglePaperSearch={togglePaperSearch}
                    isRecording={isRecording}
                    onToggleRecording={handleToggleRecording}
                    sendButtonHover={sendButtonHover}
                    onSendButtonHover={setSendButtonHover}
                    onAddFile={() => {
              setIsAiReadingUploadMode(false); // 普通上传模式
              setShowUploadModal(true);
            }}
                    onSend={handleSend}
                    isSending={isSending}
                    totalFileCount={currentFileCount}
                    isAiReadingActive={isAiReadingActive}
                    isFileParsing={isFileParsing}
                  />
                </div>
              </div>
            </div>

            {/* 功能按钮区域 */}
            <div
              className="flex justify-center gap-[47px] absolute z-40 transition-all duration-300 bottom-[40px] left-0 right-0"
            >
              {[
                { key: "quickQA", icon: "chat-page-qqqa.png", label: "快问快答" },
                { key: "deepStudy", icon: "chat-page-deep-study.png", label: "深度学习" }
              ].map(({ key, icon, label }) => {
                const isButtonDisabled = isFileParsing && (key === 'quickQA' || key === 'deepStudy');

                const buttonContent = (
                  <div
                    className={`w-[160px] h-10 rounded-[20px] border flex items-center px-7 transition-colors duration-200 ${
                      isButtonDisabled
                        ? 'bg-[#F5F5F5] border-[#E0E0E0] cursor-not-allowed opacity-60'
                        : 'bg-white border-[#C8C9CC] hover:border-[#6FCF97] hover:text-[#6FCF97] cursor-pointer'
                    }`}
                  >
                    <img
                      src={`/chat-page/${icon}`}
                      alt={label}
                      className="w-[22px] h-[22px] mr-3"
                    />
                    <span
                      style={{
                        color: isButtonDisabled ? '#999999' : 'inherit'
                      }}
                    >{label}</span>
                  </div>
                );

                return (
                  <div key={key} className="relative">
                    {isButtonDisabled ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              {buttonContent}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>文件解析中</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div onClick={() => !isButtonDisabled && handleNavigate(key)}>
                        {buttonContent}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}