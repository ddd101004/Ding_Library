import React, { useState, forwardRef } from 'react';
import ChatInput from './ChatInput';
import type { ChatInputRef } from './ChatInput';
import Toolbar from './Toolbar';
import FunctionSelection from './FunctionSelection';

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
  showRelatedPapers?: boolean;
  isFolderChat?: boolean;
  isFileParsing?: boolean;
  hideFileTags?: boolean;
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
  showRelatedPapers = false,
  isFolderChat = false,
  isFileParsing = false,
  hideFileTags = false,
}, ref) => {
  const [sendButtonHover, setSendButtonHover] = React.useState(false);
  const backgroundOffset = 0;

  return (
    <div
      className={`relative mx-auto transition-all duration-300 left-[10px] bg-white rounded-[20px] border border-[#E9ECF2] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] ${
        showRelatedPapers ? "w-full" : "max-w-7xl w-full"
      }`}
      style={{ height: `${160 + backgroundOffset}px` }}
    >
      <div className="flex flex-col h-full pt-4">
        <div
          className="ml-6 pb-[60px] flex items-center transition-all duration-300 flex-1"
          style={{ marginTop: "0px" }}
        >
          {/* 修复：添加 FunctionSelection 组件 */}
          {currentFunction && (
            <>
              <FunctionSelection
                functionType={currentFunction}
                onClose={onCloseFunction || (() => {})}
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
            totalFileCount={totalFileCount}
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