/**
 * 对话输入区容器 — 管理底部输入区域的定位和布局，包裹MessageInput组件
 *
 * 【前端】对话模块布局组件
 *
 * 职责：
 * - 论文搜索模式时：输入区在父容器内跟随布局，宽度自适应
 * - 普通模式时：输入区fixed定位在底部(z-100)，左侧留出侧边栏宽度
 * - 侧边栏展开时左侧偏移224px+30px，收起时偏移70px+30px
 * - 宽度响应式计算：calc(100vw - 侧边栏宽度 - 间距)
 * - 通过forwardRef暴露ChatInputRef给ChatConversation父组件
 * - 透传所有props给MessageInput子组件
 *
 * 引用的子组件：
 * - common/MessageInput — 消息输入区域组合组件
 *
 * 引用方：
 * - chat/ChatConversation — 对话详情页底部输入区
 */
"use client";
import React, { forwardRef } from "react";
import MessageInput, { ChatInputRef } from "../common/MessageInput";

interface ChatInputAreaProps {
  isSidebarOpen: boolean;
  inputText: string;
  inputOnChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  isRecording: boolean;
  toggleRecording: () => void;
  isDeepThinkActive: boolean;
  toggleDeepThink: () => void;
  isPaperSearchActive: boolean;
  togglePaperSearch: () => void;
  isLoading: boolean;
  currentFunction: string | null;
  onCloseFunction: () => void;
  isFromOtherPage: boolean;
  showRelatedPapers?: boolean;
  style?: React.CSSProperties;
}

const ChatInputArea = forwardRef<ChatInputRef, ChatInputAreaProps>(({
  isSidebarOpen,
  inputText,
  inputOnChange,
  onKeyDown,
  onSend,
  isRecording,
  toggleRecording,
  isDeepThinkActive,
  toggleDeepThink,
  isPaperSearchActive,
  togglePaperSearch,
  isLoading,
  currentFunction,
  onCloseFunction,
  isFromOtherPage,
  showRelatedPapers = false,
  style,
}, ref) => {
  // 计算样式类 - 响应式布局
  const inputAreaStyle = {
    left: showRelatedPapers
      ? "auto" // 在论文面板模式下，不再使用 fixed 定位
      : (isSidebarOpen ? "224px" : "70px"),
    // 响应式宽度：计算可用宽度，但添加最小宽度限制和响应式调整
    width: showRelatedPapers
      ? "auto" // 在论文面板模式下，宽度由父容器控制
      : (isSidebarOpen ? "min(calc(100% - 224px), calc(100vw - 254px))" : "min(calc(100% - 70px), calc(100vw - 100px))"), // 正常模式：随屏幕缩小自适应
    height: showRelatedPapers ? "auto" : "auto",
    // 合并传入的自定义样式（如果有）
    ...(showRelatedPapers && style ? style : {}),
  };

  return (
    <div className={showRelatedPapers ? "w-full pb-4" : "fixed bottom-4 z-100"} style={showRelatedPapers ? {} : inputAreaStyle}>
      <div className="px-0">
        <div style={{ height: 'auto' }}>
        <MessageInput
          ref={ref}
          inputText={inputText}
          onChange={inputOnChange}
          onKeyDown={onKeyDown}
          onSend={onSend}
          isRecording={isRecording}
          toggleRecording={toggleRecording}
          isDeepThinkActive={isDeepThinkActive}
          toggleDeepThink={toggleDeepThink}
          isPaperSearchActive={isPaperSearchActive}
          togglePaperSearch={togglePaperSearch}
          isLoading={isLoading}
          currentFunction={currentFunction}
          onCloseFunction={onCloseFunction}
          isFromOtherPage={isFromOtherPage}
          showRelatedPapers={showRelatedPapers}
        />
        </div>
      </div>
    </div>
  );
});

ChatInputArea.displayName = 'ChatInputArea';

export default ChatInputArea;