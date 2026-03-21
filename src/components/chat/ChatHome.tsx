"use client";
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { toast } from "sonner";
import AvatarHoverMenu from "./common/AvatarHoverMenu";
import ChatInput, { ChatInputRef } from "./common/ChatInput";
import Toolbar from "./common/Toolbar";
import FunctionSelection from "./common/FunctionSelection";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
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

  const avatarPopupRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const { isRecording, toggleRecording, transcribedText, setTranscribedText } = useAudioRecorder();
  const { preloadMultiple } = usePreload();
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
  const backgroundOffset = 0;

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
      // 直接使用 transcribedText，它已经包含了累积的文本
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

  // 处理功能按钮点击
  const handleNavigateFunction = (functionType: string) => {
    // 快问快答和深度学习：跳转到checkedchat页面
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

  // 发送消息
  const handleSend = async () => {
    // 检查输入文本是否为空
    if (!inputText.trim()) {
      toast.warning("输入框不能为空，请输入消息内容");
      return;
    }

    await handleSendMessage({
      inputText,
      uploadedFiles: [],
      isDeepThinkActive,
      isPaperSearchActive,
      currentFunction: null,
      formatFileContent: () => "",
      saveFilesToSession: () => {},
    });

    // 发送消息后清空语音识别的文本，避免下次录音时重复显示
    setTranscribedText('');
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
      }).catch((error) => {
        console.error("预加载快问快答问题失败:", error);
      });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Head>
        <title>AI智慧学术交互系统-AI对话</title>
      </Head>

      {/* 用户头像 */}
      <AvatarHoverMenu />

      {/* 主容器 - 水平垂直居中 */}
      <div className="flex-1 flex justify-center items-center w-full">
        <div className="relative responsive-container w-full">
          {/* 问候语 - 绝对定位在左上角 */}
          <div className="absolute text-gray-900 flex flex-col gap-[20px] z-30 left-[40px] -top-[200px]">
            <div className="text-[58px] font-medium">
              {getGreeting()}，{userInfo?.username || "访客"}
            </div>
            <div className="text-[24px]">
              更懂人的AI学术系统，遇见对你有用的知识。
            </div>
          </div>

          {/* 主内容卡片容器 */}
          <div
            className="flex w-full transition-all duration-300"
            style={{
              height: `${210 + backgroundOffset}px`,
              maxWidth: '1300px'
            }}
          >
            {/* 背景 - 修改：替换背景图片为纯色背景 */}
            <div
              className="absolute inset-0 rounded-[20px] z-10 transition-all duration-300 overflow-hidden"
              style={{
                height: `${210 + backgroundOffset}px`,
                top: "0px",
                backgroundColor: '#d5f4cfff', // 淡青色背景
              }}
            >
              {/* 移除了背景图片，改为纯色背景 */}
            </div>

            {/* 白色背景层 */}
            <div
              className="absolute w-[calc(100%-20px)] mx-auto bg-white rounded-[20px] top-[10px] left-[10px] pt-[10px] z-20 px-4 transition-all duration-300"
              style={{ height: `${180 + backgroundOffset}px` }}
            >
              <div className="flex flex-col h-full">
                {/* 输入框 */}
                <div
                  className="flex items-center transition-all duration-300"
                  style={{ marginTop: `${backgroundOffset > 0 ? 80 : 0}px` }}
                >                  {/* 输入框 */}
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
                    onSend={handleSend}
                    isSending={isSending}
                    onNavigateFunction={handleNavigateFunction}
                  />
                </div>
              </div>
            </div>

            {/* 功能按钮区域 */}
            <div
              className="flex justify-center gap-[47px] absolute z-40 transition-all duration-300 bottom-[40px] left-0 right-0"
            >
            </div>
          </div>
        </div>
      </div>
    </>
  );
}