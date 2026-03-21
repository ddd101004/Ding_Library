"use client";
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { RotateCcw } from "lucide-react";
import FunctionSelection from "./common/FunctionSelection";
import AvatarHoverMenu from "./common/AvatarHoverMenu";
import ChatInput, { ChatInputRef } from "./common/ChatInput";
import Toolbar from "./common/Toolbar";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useConversation } from "@/hooks/use-conversation";
import { useTopicManager } from "@/hooks/use-topic-manager";
import { toast } from "sonner";
import { apiPost } from "@/api/request";

interface CheckedChatProps {
  selectedFunction?: string;
}

export default function CheckedChat({ selectedFunction }: CheckedChatProps) {
  const [isDeepThinkActive, setIsDeepThinkActive] = useState(false);
  const [isPaperSearchActive, setIsPaperSearchActive] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sendButtonHover, setSendButtonHover] = useState(false);
  const [currentFunction, setCurrentFunction] = useState<string | null>(null);
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);

  const textareaRef = useRef<ChatInputRef>(null);
  const avatarPopupRef = useRef<HTMLDivElement>(null);

  const { isRecording, toggleRecording, transcribedText, setTranscribedText } = useAudioRecorder();

  // 保存语音识别前的文本内容
  const textBeforeRecording = useRef('');

  // 包装 toggleRecording 函数以处理文本状态
  const handleToggleRecording = () => {
    if (!isRecording) {
      // 开始录音前保存当前文本
      textBeforeRecording.current = inputText;
      // 设置累积文本为当前输入框的文本
      setTranscribedText(inputText);
    }
    toggleRecording();
  };

  const { handleSendMessage, isSending } = useConversation();

  const {
    topics,
    selectedTopic,
    isLoading,
    handleTopicButtonClick,
    handleTopicClick,
    handleRefreshClick,
    setSelectedTopic,
  } = useTopicManager({ currentFunction, selectedButton });

  const router = useRouter();
  const { query } = useRouter();

  // 根据功能类型计算额外高度
  const getAdditionalHeight = () => {
    if (currentFunction === "quickQA" || currentFunction === "deepStudy") return -70;
    return 0;
  };

  // 从URL参数获取功能类型
  useEffect(() => {
    const functionType = (query.function as string) || selectedFunction;
    const inputText = (query.inputText as string) || "";
    const isDeepThink = query.isDeepThink === "true";
    const isPaperSearch = query.isPaperSearch === "true";

    if (functionType) {
      setCurrentFunction(functionType);
      if (functionType === "deepStudy") {
        // 深度学习模式：直接加载关键词
        setTimeout(() => {
          handleTopicButtonClick("deepStudy");
        }, 100);
      }
    }

    if (inputText) {
      setInputText(inputText);
    }

    setIsDeepThinkActive(isDeepThink);
    setIsPaperSearchActive(isPaperSearch);
  }, [
    query.function,
    selectedFunction,
    query.inputText,
    query.isDeepThink,
    query.isPaperSearch,
    handleTopicButtonClick,
  ]);

  // Update input text when voice transcription is complete
  useEffect(() => {
    if (transcribedText) {
      setInputText((prev) => prev + transcribedText);
    }
  }, [transcribedText]);

  // 当选择主题时更新输入框
  useEffect(() => {
    if (selectedTopic) {
      // 深度学习模式：生成问题
      if (currentFunction === "deepStudy") {
        generateQuestion(selectedTopic, "deepStudy");
      } else {
        // 快问快答模式：直接设置问题
        setInputText(selectedTopic);
        // 延迟执行光标定位，确保DOM已更新
        setTimeout(() => {
          if (textareaRef.current && textareaRef.current.focusToEnd) {
            textareaRef.current.focusToEnd();
          }
        }, 0);
      }
    }
  }, [selectedTopic, currentFunction]);

  // 发送消息
  const handleSend = async () => {
    await handleSendMessage({
      inputText,
      uploadedFiles: [],
      isDeepThinkActive,
      isPaperSearchActive,
      currentFunction,
      formatFileContent: () => "",
      saveFilesToSession: () => {},
    });

    // 发送消息后清空语音识别的文本，避免下次录音时重复显示
    setTranscribedText('');
  };

  // 处理关闭功能
  const handleCloseFunction = () => {
    router.push("/chat");
  };

  // 切换DeepThink状态
  const toggleDeepThink = () => {
    setIsDeepThinkActive(!isDeepThinkActive);
  };

  // 切换论文搜索状态
  const togglePaperSearch = () => {
    setIsPaperSearchActive(!isPaperSearchActive);

  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 生成问题的函数
  const generateQuestion = async (topic: string, topicType: string) => {
    setIsGeneratingQuestion(true);
    try {
      // 直接使用关键词
      const combinedKeyword = topic;

      const response = await apiPost("/api/ai/questions", {
        keyword: combinedKeyword,
        count: 1, // 只生成一个问题
      });

      if (response.code === 200 && response.data?.questions?.length > 0) {
        const generatedQuestion = response.data.questions[0];
        setInputText(generatedQuestion);
        // 延迟执行光标定位，确保DOM已更新
        setTimeout(() => {
          if (textareaRef.current && textareaRef.current.focusToEnd) {
            textareaRef.current.focusToEnd();
          }
        }, 0);
      } else {
        toast.error("生成问题失败，请重试");
      }
    } catch (error: any) {
      console.error("生成问题失败:", error);
      toast.error("生成问题失败，请重试");
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  return (
    <>
      <Head>
        <title>AI智慧学术交互系统-AI对话</title>
      </Head>

      {/* 用户头像 */}
      <AvatarHoverMenu />

      <div className="flex-1 flex justify-center items-center w-full max-w-7xl mx-auto px-4">
        <div className="relative w-full max-w-7xl mx-auto flex justify-center">
          {/* 主要容器 */}
          <div
            className="relative w-full transition-all duration-300"
            style={{
              height: `${300 + getAdditionalHeight()}px`,
              marginTop: "-20px",
            }}
          >
            {/* 背景图 - 替换为浅绿色背景 #c6f2e0ff */}
            <div
              className="absolute inset-0 rounded-[20px] z-10 transition-all duration-300 overflow-hidden"
              style={{
                height: `${280 + getAdditionalHeight()}px`,
                top: "0px",
                backgroundColor: '#c6f2e0ff', // 浅绿色背景
                // 移除背景图片
              }}
            >
              {/* 移除了原有的背景图片div */}
            </div>

            {/* 白色背景层 - 调整为半透明白色，增强浅绿色背景的视觉效果 */}
            <div
              className="absolute w-full max-w-[calc(100%-20px)] mx-auto rounded-[20px] top-[10px] left-0 right-0 pt-[10px] z-20 px-2 sm:px-4 transition-all duration-300"
              style={{
                height: `180px`,
                margin: "0 10px",
                backgroundColor: 'rgba(255, 255, 255, 0.9)', // 半透明白色
                border: '1px solid #d4ede4', // 浅绿色边框
              }}
            >
              <div className="flex flex-col h-full">
                {/* 输入框区域 */}
                <div
                  className="ml-5 flex items-center transition-all duration-300"
                  style={{
                    marginTop: "1px",
                  }}
                >
                  {/* 功能标签 */}
                  {currentFunction && (
                    <>
                      <FunctionSelection
                        functionType={currentFunction}
                        onClose={handleCloseFunction}
                      />
                      <div className="w-[1px] h-[30px] bg-[#E0E1E5] rounded-[1px] mx-3"></div>
                    </>
                  )}

                  {/* 输入框 */}
                  <div className="flex-1 flex flex-col">
                    <ChatInput
                      ref={textareaRef}
                      value={inputText}
                      onKeyDown={handleKeyDown}
                      onChange={setInputText}
                      className="pt-4 text-xl text-gray-700 bg-transparent border-none focus:outline-none resize-none flex-1"
                      placeholder="请输入您的问题..."
                      maxHeight={150}
                    />
                  </div>
                </div>

                {/* 按钮区域 */}
                <div
                  className="absolute left-2 right-2 sm:left-5 sm:right-5 transition-all duration-300 px-2"
                  style={{ top: "113px" }}
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
                  />
                </div>
              </div>
            </div>

            {/* 主题选择区域 - 显示动态获取的内容 */}
            {topics.length > 0 && (
              <div
                className="absolute z-30 transition-all duration-300 w-full px-4"
                style={{
                  top:
                    currentFunction === "quickQA"
                      ? `${343 + getAdditionalHeight()}px`
                      : `${353 + getAdditionalHeight()}px`,
                  left: "0",
                  right: "0",
                }}
              >
                {/* 内容容器 - 确保不超出父容器宽度 */}
                <div className="max-w-7xl mx-auto">
                  {/* 快问快答模式：问题列表 */}
                  {currentFunction === "quickQA" && (
                    <div className="flex flex-col items-center gap-2">
                      {topics.map((topic, index) => (
                        <div
                          key={index}
                          className="w-full max-w-[800px] sm:max-w-[900px] lg:max-w-[1000px] h-[40px] bg-[#f0faf6] rounded-[20px] flex items-center text-gray-700 cursor-pointer transition-colors hover:bg-[#e8f8f0] px-4 sm:px-8 lg:px-[28px] text-sm sm:text-base border border-transparent hover:border-[#d4ede4]"
                          onClick={() => handleTopicClick(topic)}
                        >
                          <span className="truncate text-center w-full">
                            {topic}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 深度学习模式：关键词网格 */}
                  {currentFunction === "deepStudy" && (
                    <div className="flex flex-col items-center -mt-[10px] w-full px-4 sm:px-6 lg:px-8">
                      <div className="w-full max-w-6xl lg:max-w-7xl mx-auto">
                        {/* 第一行 - 6个关键词 */}
                        <div className="flex justify-center gap-1 sm:gap-2 lg:gap-5 mb-4 pl-4 sm:pl-8 lg:pl-[50px]">
                          {topics.slice(0, 6).map((topic, index) => (
                            <div
                              key={index}
                              className={`w-[70px] xs:w-[85px] sm:w-[100px] lg:w-[140px] h-[35px] sm:h-[40px] bg-white rounded-[20px] border flex items-center justify-center text-gray-700 cursor-pointer transition-colors text-xs sm:text-sm px-1 flex-shrink-0 ${
                                selectedTopic === topic
                                  ? isGeneratingQuestion
                                    ? "border-gray-300 bg-gray-50 cursor-wait"
                                    : "border-[#0D9488] bg-[#e8f8f0]"
                                  : "border-[#C8C9CC] hover:border-[#d4ede4] hover:bg-[#f0faf6]"
                              }`}
                              onClick={() =>
                                !isGeneratingQuestion && handleTopicClick(topic)
                              }
                            >
                              <span className="flex items-center justify-center text-center">
                                {selectedTopic === topic &&
                                isGeneratingQuestion ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span className="truncate">生成中...</span>
                                  </>
                                ) : (
                                  <span className="truncate">{topic}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* 第二行 - 7个关键词 */}
                        <div className="flex justify-center gap-1 sm:gap-2 lg:gap-5 pl-4 sm:pl-8 lg:pl-[50px]">
                          {topics.slice(6, 13).map((topic, index) => (
                            <div
                              key={index + 6}
                              className={`w-[70px] xs:w-[85px] sm:w-[100px] lg:w-[140px] h-[35px] sm:h-[40px] bg-white rounded-[20px] border flex items-center justify-center text-gray-700 cursor-pointer transition-colors text-xs sm:text-sm px-1 flex-shrink-0 ${
                                selectedTopic === topic
                                  ? isGeneratingQuestion
                                    ? "border-gray-300 bg-gray-50 cursor-wait"
                                    : "border-[#0D9488] bg-[#e8f8f0]"
                                  : "border-[#C8C9CC] hover:border-[#d4ede4] hover:bg-[#f0faf6]"
                              }`}
                              onClick={() =>
                                !isGeneratingQuestion && handleTopicClick(topic)
                              }
                            >
                              <span className="flex items-center justify-center text-center">
                                {selectedTopic === topic &&
                                isGeneratingQuestion ? (
                                  <>
                                    <svg
                                      className="animate-spin -ml-1 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0"
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                    >
                                      <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                      ></circle>
                                      <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                      ></path>
                                    </svg>
                                    <span className="truncate">生成中...</span>
                                  </>
                                ) : (
                                  <span className="truncate">{topic}</span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 换一批按钮 - 只在有内容时显示 */}
            {topics.length > 0 && (
              <div
                className="absolute z-40 cursor-pointer transition-all duration-300 hover:text-[#679CFF] flex items-center px-3"
                style={{
                  top:
                    currentFunction === "quickQA"
                      ? `${300 + getAdditionalHeight()}px`
                      : `${310 + getAdditionalHeight()}px`,
                  left: "40px",
                  color: "#666",
                  fontSize: "14px",
                }}
                onClick={handleRefreshClick}
              >
                <RotateCcw className="w-[18px] h-[18px] mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {isLoading ? "加载中..." : "换一批"}
                </span>
              </div>
            )}
            </div>
        </div>
      </div>
    </>
  );
}