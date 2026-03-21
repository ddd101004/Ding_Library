import React from 'react';
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
  isAiReadingActive?: boolean;
  isFolderChat?: boolean;
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
  isAiReadingActive = false,
  isFolderChat = false,
  onNavigateFunction
}: ToolbarProps) {

  const handleToggleDeepThink = () => {
    if (!disabled && !isSending) onToggleDeepThink();
  };

  const handleTogglePaperSearch = () => {
    if (!disabled && !isSending && !isAiReadingActive) onTogglePaperSearch();
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

  // 深度思考和论文搜索不受文件解析影响
  const isControlDisabled = disabled || isSending;

  // 检查论文搜索是否应该被禁用（AI伴读激活时禁用）
  const isPaperSearchDisabled = isControlDisabled || isAiReadingActive;

  // 文件夹对话模式下隐藏论文搜索按钮
  const shouldShowPaperSearch = !isFolderChat && !isAiReadingActive;

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
            : 'hover:scale-[1.01] cursor-pointer'
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
            <img
              src={isDeepThinkActive
                ? '/chat-page/chat-page-deep-think-2@2x.png'
                : '/chat-page/chat-page-deep-think-1@2x.png'}
              alt="DeepThink"
              className="w-5 h-5"
            />
            <span className="text-base">DeepThink</span>
          </>
        )}
      </button>

      {/* Paper Search button - 文件夹对话模式或AI伴读模式时隐藏 */}
      {shouldShowPaperSearch && (
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
                isPaperSearchDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:scale-[1.01] cursor-pointer'
              }`}
              disabled={isPaperSearchDisabled}
            >
            {isSending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span className="text-base">搜索中</span>
                </>
              ) : (
                <>
                  <img
                    src={isPaperSearchActive
                      ? "/chat-page/chat-page-clickwebsitepaper.png"
                      : "/chat-page/chat-page-websitepaper.png"}
                    alt="论文搜索"
                    className="w-5 h-5"
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
      )}

      {/* 快问快答和深度学习按钮 - 只在ChatHome模式时显示 */}
      {!isFolderChat && onNavigateFunction && (
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
            <img
              src="/chat-page/qqqa1.png"
              alt="快问快答"
              className="w-[18px] h-[18px]"
            />
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
            <img
              src="/chat-page/deepstudy1.png"
              alt="深度学习"
              className="w-[18px] h-[18px]"
            />
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
            <img
              src={isRecording
                ? '/chat-page/voice1.png'
                : '/chat-page/chat-page-voice@2x.png'}
              alt="语音"
              className={`w-10 h-10 transition-opacity ${
                isSending ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
              }`}
              onClick={handleToggleRecording}
              onMouseDown={(e) => e.preventDefault()}
            />
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
              <img
                src={sendButtonHover && !isOverallDisabled
                  ? '/chat-page/send2.png'
                  : '/chat-page/send1.png'}
                alt="发送"
                className="w-full h-full"
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