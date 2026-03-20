"use client";
import React, { forwardRef } from "react";
import MessageInput, { ChatInputRef } from "../common/MessageInput";

interface ChatInputAreaProps {
  isSidebarOpen: boolean;
  inputText: string;
  inputOnChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  uploadedFiles: any[];
  onRemoveFile: (index: number) => void;
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
  onAddFile: () => void;
  totalFileCount?: number;
  showRelatedPapers?: boolean;
  isFolderChat?: boolean;
  isFileParsing?: boolean;
  style?: React.CSSProperties;
  hideFileTags?: boolean;
}

const ChatInputArea = forwardRef<ChatInputRef, ChatInputAreaProps>(({
  isSidebarOpen,
  inputText,
  inputOnChange,
  onKeyDown,
  onSend,
  uploadedFiles,
  onRemoveFile,
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
  onAddFile,
  totalFileCount = uploadedFiles.length,
  showRelatedPapers = false,
  isFolderChat = false,
  isFileParsing = false,
  style,
  hideFileTags = false,
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
          uploadedFiles={uploadedFiles}
          onRemoveFile={onRemoveFile}
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
          onAddFile={onAddFile}
          totalFileCount={totalFileCount}
          showRelatedPapers={showRelatedPapers}
          isFolderChat={isFolderChat}
          isFileParsing={isFileParsing}
          hideFileTags={hideFileTags}
        />
        </div>
      </div>
    </div>
  );
});

ChatInputArea.displayName = 'ChatInputArea';

export default ChatInputArea;