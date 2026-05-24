/**
 * 消息输入区 — 底部固定输入框+功能标签+工具栏的组合组件，用于对话页输入区域
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - 组合ChatInput输入框、FunctionSelection功能标签、Toolbar工具栏
 * - 功能标签显示：currentFunction存在时在输入框前显示可关闭标签+竖线分隔符
 * - white卡片容器样式，圆角20px+阴影，高度160px
 * - 论文搜索模式下(showRelatedPapers)宽度变为w-full，否则max-w-7xl
 * - 通过forwardRef暴露ChatInputRef给父组件（focusToEnd/focus等方法）
 *
 * 引用的子组件：
 * - common/ChatInput — 自适应高度textarea
 * - common/FunctionSelection — 功能标签（快问快答/深度学习）
 * - common/Toolbar — 底部工具栏
 *
 * 引用方：
 * - chat/ChatConversation — 对话详情页底部输入区域
 * - conversation-components/ChatInputArea — 对话输入区容器
 */
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
  showRelatedPapers?: boolean;
}

const MessageInput = forwardRef<ChatInputRef, MessageInputProps>(({
  inputText,
  onChange,
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
      <div className="flex flex-col h-full pt-1">
        <div
          className="ml-6 pb-[60px] flex items-center transition-all duration-300 flex-1"
          style={{ marginTop: "-15px" }}
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
            onSend={onSend}
            disabled={isLoading}
            currentFunction={currentFunction}
          />
        </div>
      </div>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';

export default MessageInput;