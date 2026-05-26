/**
 * 底部工具栏 — 输入框下方的功能按钮组（DeepThink/论文搜索/语音录制/发送）
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - DeepThink模式切换按钮(Brain图标)：开启时显示绿色圆点指示+绿色边框
 * - 论文搜索切换按钮(FileSearch图标)：开启时显示绿色圆点指示+绿色边框
 * - 语音录制按钮(Mic/MicOff图标)：录音中显示红色MicOff图标+脉冲动画
 * - 发送按钮(Send图标)：有内容时teal色可点击，无内容时触发提示
 * - 侧边栏宽度影响按钮位置偏移
 *
 * 引用方：
 * - common/MessageInput — 消息输入区域底部工具栏
 * - chat/ChatHome — 首页输入框工具栏
 * - chat/CheckedChat — 功能对话页工具栏
 */
import React from 'react';
import { MessageSquare, GraduationCap, Mic, MicOff, Send, Brain, FileSearch } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ToolbarProps {
  isDeepThinkActive: boolean;
  onToggleDeepThink: () => void;
  isPaperSearchActive: boolean;
  onTogglePaperSearch: () => void;
  isRecording: boolean;
  onToggleRecording: () => void;
  sendButtonHover: boolean;
  onSendButtonHover: (hover: boolean) => void;
  onSend: () => void;
  disabled?: boolean;
  isSending?: boolean;
  currentFunction?: string | null;
  onNavigateFunction?: (functionType: string) => void;
}

export default function Toolbar({
  isDeepThinkActive,
  onToggleDeepThink,
  isPaperSearchActive,
  onTogglePaperSearch,
  isRecording,
  onToggleRecording,
  sendButtonHover,
  onSendButtonHover,
  onSend,
  disabled = false,
  isSending = false,
  currentFunction = null,
  onNavigateFunction
}: ToolbarProps) {

  const handleToggleDeepThink = () => {
    if (!disabled && !isSending) onToggleDeepThink();
  };

  const handleTogglePaperSearch = () => {
    if (!disabled && !isSending) onTogglePaperSearch();
  };

  const handleToggleRecording = () => {
    if (!isSending) onToggleRecording();
  };

  const handleSend = () => {
    if (!disabled && !isSending) onSend();
  };

  const handleMouseEnter = () => {
    if (!disabled && !isSending) onSendButtonHover(true);
  };

  const handleMouseLeave = () => {
    if (!disabled && !isSending) onSendButtonHover(false);
  };

  // isOverallDisabled 只用于发送按钮
  const isOverallDisabled = disabled || isSending;

  const isControlDisabled = disabled || isSending;

  return (
    <TooltipProvider>
      <div className="flex items-center justify-between">
        <div className='flex items-center gap-5'>
      {/* DeepThink button */}
      <button
        onClick={handleToggleDeepThink}
        onMouseDown={(e) => e.preventDefault()}
        className={`deep-think-btn w-[140px] h-10 rounded-[20px] flex items-center justify-center gap-2 transition-all ${
          isDeepThinkActive
            ? 'bg-[#0D9488] opacity-80 text-white'
            : 'bg-transparent border border-[#C8C9CC] text-[#666666]'
        } ${
          isControlDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:scale-[1.02] hover:shadow-md hover:border-[#0D9488] cursor-pointer'
        }`}
        disabled={isControlDisabled}
      >
        {isSending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            <span className="text-base">发送中</span>
          </>
        ) : (
          <>
            <Brain
              className={`w-5 h-5 ${isDeepThinkActive ? 'text-white' : ''}`}
            />
            <span className="text-base">DeepThink</span>
          </>
        )}
      </button>

      {/* Paper Search button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleTogglePaperSearch}
            onMouseDown={(e) => e.preventDefault()}
            className={`paper-search-btn w-[140px] h-10 rounded-[20px] flex items-center justify-center gap-2 transition-all ${
              isPaperSearchActive
                ? 'bg-[#0D9488] opacity-80 text-white'
                : 'bg-transparent border border-[#C8C9CC] text-[#666666]'
            } ${
              isControlDisabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:scale-[1.02] hover:shadow-md hover:border-[#0D9488] cursor-pointer'
            }`}
            disabled={isControlDisabled}
          >
            {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span className="text-base">搜索中</span>
                </>
              ) : (
                <>
                  <FileSearch
                    className={`w-5 h-5 ${isPaperSearchActive ? 'text-white' : ''}`}
                  />
                  <span className="text-base">论文搜索</span>
                </>
              )}
            </button>
          </TooltipTrigger>
          {!isControlDisabled && (
            <TooltipContent>
              <p>{isPaperSearchActive
                ? '点击关闭论文搜索'
                : '点击开启论文搜索'
              }</p>
            </TooltipContent>
          )}
        </Tooltip>

      {/* 快问快答和深度学习按钮 - 只在ChatHome模式时显示 */}
      {onNavigateFunction && (
        <>
          <button
            onClick={() => onNavigateFunction('quickQA')}
            onMouseDown={(e) => e.preventDefault()}
            className={`w-[120px] h-10 rounded-[20px] border flex items-center justify-center gap-2 transition-all ${
              isControlDisabled
                ? 'bg-[#F5F5F5] border-[#E0E0E0] cursor-not-allowed opacity-60'
                : 'bg-white border-[#C8C9CC] hover:border-[#6FCF97] hover:text-[#6FCF97] cursor-pointer'
            }`}
            disabled={isControlDisabled}
          >
            <MessageSquare className="w-[18px] h-[18px]" />
            <span className="text-sm">快问快答</span>
          </button>

          <button
            onClick={() => onNavigateFunction('deepStudy')}
            onMouseDown={(e) => e.preventDefault()}
            className={`w-[120px] h-10 rounded-[20px] border flex items-center justify-center gap-2 transition-all ${
              isControlDisabled
                ? 'bg-[#F5F5F5] border-[#E0E0E0] cursor-not-allowed opacity-60'
                : 'bg-white border-[#C8C9CC] hover:border-[#6FCF97] hover:text-[#6FCF97] cursor-pointer'
            }`}
            disabled={isControlDisabled}
          >
            <GraduationCap className="w-[18px] h-[18px]" />
            <span className="text-sm">深度学习</span>
          </button>
        </>
      )}
      </div>

      {/* Voice recording button */}
      <div className='flex items-center gap-5'>
        <div className="relative flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`transition-opacity ${
                isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
              }`}
              onClick={handleToggleRecording}
              onMouseDown={(e) => e.preventDefault()}
            >
              {isRecording ? (
                <div className="flex items-center justify-center">
                  <div className="animate-pulse mr-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                  </div>
                  <Mic className="w-8 h-8 text-red-500" />
                </div>
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </div>
          </TooltipTrigger>
          {!isSending && (
            <TooltipContent>
              <p>{isRecording ? '停止语音输入' : '开始语音输入'}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>


      {/* Send button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={`w-10 h-10 p-0 border-none bg-transparent transition-opacity ${
              isOverallDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
            }`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleSend}
            disabled={isOverallDisabled}
          >
            {isSending ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <Send
                className={`w-6 h-6 ${sendButtonHover && !isOverallDisabled ? 'text-[#0D9488]' : ''}`}
              />
            )}
          </button>
        </TooltipTrigger>
      </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  );
}