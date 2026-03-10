"use client";
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "sonner";
import AvatarPopup from "./common/AvatarPopup";
import ChatInput, { ChatInputRef } from "./common/ChatInput";
import Toolbar from "./common/Toolbar";
import FileTags from "./common/FileTags";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useFileHandler } from "@/hooks/use-file-handler";
import { useConversation } from "@/hooks/use-conversation";
import { usePreload } from "@/hooks/use-preload";
import { useAvatar } from "@/contexts/AvatarContext";
import { useAvatarPopup } from "@/contexts/AvatarPopupContext";
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
  const { avatarUrl } = useAvatar();
  const { userInfo } = useUser();
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
  const [isPaperSearchActive, setIsPaperSearchActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const [sendButtonHover, setSendButtonHover] = useState(false);

  const avatarPopupRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const { isRecording, toggleRecording, transcribedText, setTranscribedText } = useAudioRecorder();
  const { preloadMultiple } = usePreload();

  const {
    uploadedFiles,
    showUploadModal,
    setShowUploadModal,
    isUploading,
    handleFileUpload,
    handleRemoveFile,
    formatFileContent,
    saveFilesToSession,
    clearUploadedFiles
  } = useFileHandler();

  const { handleSendMessage, isSending } = useConversation();

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
      setTranscribedText(inputText);
    } else {
      // 停止录音时不需要重置，保持累积文本
    }
    toggleRecording();
  };

  // 实时更新输入框中的语音识别文字
  useEffect(() => {
    if (isRecording || transcribedText) {
      setInputText(transcribedText);
    }
  }, [transcribedText, isRecording]);

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

  // 发送消息
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

    // 保存文件到 sessionStorage
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

      sessionStorage.setItem('transferredFiles_home', JSON.stringify(filesToSave));
    }

    await handleSendMessage({
      inputText,
      uploadedFiles,
      isDeepThinkActive,
      isPaperSearchActive,
      currentFunction: null,
      formatFileContent,
      saveFilesToSession
    });
  };

  // 处理导航
  const handleNavigate = async (functionType: string) => {
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
        console.log("快问快答问题已预加载:", questions);
      }).catch((error) => {
        console.error("预加载快问快答问题失败:", error);
      });
    }

    // 深度学习：预加载所有类型的关键词（已在组件挂载时预加载，这里无需额外操作）
    if (functionType === "deepStudy") {
      console.log("进入深度学习模式，使用预加载的关键词");
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
      },
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Head>
        <title>临港科技智慧图书馆-AI对话</title>
      </Head>

      {/* 用户头像 */}
      <div className="fixed z-50 top-5 right-5">
        <img
          src={avatarUrl}
          alt="用户头像"
          className={`rounded-full border-2 border-white shadow-md w-12 h-12 object-cover ${
            isUploading
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer'
          }`}
          onClick={() => !isUploading && setShowAvatarPopup(true)}
        />
        <AvatarPopup
          show={showAvatarPopup}
          onClose={() => setShowAvatarPopup(false)}
        />
      </div>

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
            {/* 背景图 */}
            <div
              className="absolute inset-0 rounded-[20px] z-10 transition-all duration-300 overflow-hidden"
              style={{ height: `${300 + backgroundOffset}px` }}
            >
              <div
                className="absolute inset-0 bg-center bg-no-repeat bg-[url('/background/layer-3@2x.png')]"
              ></div>
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
                  onRemoveFile={(index) => handleRemoveFile(index)}
                  maxFiles={5}
                />
              </div>

              <div className="flex flex-col h-full">
                {/* 输入框 */}
                <div
                  className="flex items-center transition-all duration-300"
                  style={{ marginTop: `${backgroundOffset > 0 ? 80 : 0}px` }}
                >
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
                    onAddFile={() => {}} // 已移除文件上传功能
                    onSend={handleSend}
                    isSending={isSending}
                  />
                </div>
              </div>
            </div>

            {/* 功能按钮区域 - 已移除AI伴读按钮 */}
            <div
              className="flex justify-center gap-[47px] absolute z-40 transition-all duration-300 bottom-[40px] left-0 right-0"
            >
              {[
                { key: "quickQA", icon: "chat-page-qqqa.png", label: "快问快答" },
                { key: "deepStudy", icon: "chat-page-deep-study.png", label: "深度学习" },
                { key: "more", icon: "chat-page-more.png", label: "更多" }
              ].map(({ key, icon, label }) => (
                <div
                  key={key}
                  className={`w-[160px] h-10 rounded-[20px] border flex items-center px-7 cursor-pointer transition-colors duration-200 bg-white border-[#C8C9CC] hover:border-[#679CFF]`}
                  onClick={() => key !== 'more' && handleNavigate(key)}
                >
                  <img
                    src={`/chat-page/${icon}`}
                    alt={label}
                    className="w-[22px] h-[22px] mr-3"
                  />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI图片装饰 */}
          <img
            className="fixed hidden lg:block absolute w-[425px] h-[369px] z-0 transition-all duration-300 top-[-255px] right-[40px]"
            src="/landing-page/landing-page-ai.png"
            alt="AI"
          />
        </div>
      </div>
    </>
  );
}
