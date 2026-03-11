import React, { useState, forwardRef } from 'react';
import ChatInput from './ChatInput';
import type { ChatInputRef } from './ChatInput';
import FileTags from './FileTags';
import Toolbar from './Toolbar';
import FunctionSelection from './FunctionSelection'; // 添加这个导入

export type { ChatInputRef } from './ChatInput';

interface MessageInputProps {
  inputText: string;
  onChange: (value: string) => void;
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
  currentFunction?: string | null;
  onCloseFunction?: () => void;
  isFromOtherPage: boolean;
  onAddFile?: () => void;
  totalFileCount?: number;
  showRelatedPapers?: boolean; // 是否显示相关论文面板
  isAiReadingActive?: boolean; // AI伴读激活状态
  isFolderChat?: boolean; // 是否为文件夹对话模式
  isFileParsing?: boolean; // 文件解析状态
  hideFileTags?: boolean; // 是否隐藏文件标签（新增）
}

const MessageInput = forwardRef<ChatInputRef, MessageInputProps>(({
  inputText,
  onChange,
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
  onAddFile = () => {},
  totalFileCount = 0,
  showRelatedPapers = false, // 默认不显示相关论文面板
  isAiReadingActive = false, // 默认AI伴读未激活
  isFolderChat = false, // 默认非文件夹对话模式
  isFileParsing = false, // 默认文件未在解析
  hideFileTags = false, // 默认显示文件标签
}, ref) => {
  const [sendButtonHover, setSendButtonHover] = React.useState(false);
  const [currentFileCount, setCurrentFileCount] = useState(0);
  const backgroundOffset = uploadedFiles.length > 0 ? 80 : 0;

  // 文件数量变化回调
  const handleFileCountChange = (count: number) => {
    setCurrentFileCount(count);
  };

  return (
    <div
      className={`relative mx-auto transition-all duration-300 left-[10px] bg-white rounded-[20px] border border-[#E9ECF2] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] ${
        showRelatedPapers ? "w-full" : "max-w-7xl w-full"
      }`}
      style={{ height: `${160 + backgroundOffset}px` }}
    >
      {/* 文件标签区域 */}
      {!isFromOtherPage && !hideFileTags && uploadedFiles.length > 0 && (
        <div className="absolute top-[40px] left-1 right-6 z-30">
          <FileTags
            files={uploadedFiles}
            onRemoveFile={onRemoveFile}
            onFileCountChange={handleFileCountChange}
          />
        </div>
      )}

      <div className="flex flex-col h-full pt-4">
        <div
          className="ml-6 pb-[60px] flex items-center transition-all duration-300 flex-1"
          style={{ marginTop: `${backgroundOffset > 0 ? 80 : 0}px` }}
        >
          {/* 修复：添加 FunctionSelection 组件 */}
          {currentFunction && (
            <>
              <FunctionSelection
                functionType={currentFunction}
                onClose={onCloseFunction || (() => {})}
                isFileParsing={isFileParsing}
              />
              <div className="w-[1px] h-[30px] bg-[#E0E1E5] rounded-[1px] mx-3"></div>
            </>
          )}

          <div className="flex-1 mr-6">
            <ChatInput
              ref={ref}
              value={inputText}
              onChange={onChange}
              onKeyDown={onKeyDown}
              className="pt-5 text-xl text-gray-700 bg-transparent border-none focus:outline-none resize-none w-full"
              placeholder="你想了解什么AI技术？"
              maxHeight={100}
            />
          </div>
        </div>

        <div className="absolute left-6 right-6 bottom-4">
          <Toolbar
            isDeepThinkActive={isDeepThinkActive}
            onToggleDeepThink={toggleDeepThink}
            isPaperSearchActive={isPaperSearchActive}
            onTogglePaperSearch={togglePaperSearch}
            isRecording={isRecording}
            onToggleRecording={toggleRecording}
            sendButtonHover={sendButtonHover}
            onSendButtonHover={setSendButtonHover}
            onAddFile={onAddFile}
            onSend={onSend}
            disabled={isLoading}
            currentFunction={currentFunction}
            totalFileCount={totalFileCount || currentFileCount}
            isAiReadingActive={isAiReadingActive}
            isFolderChat={isFolderChat}
            isFileParsing={isFileParsing}
          />
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;