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
  onAddFile: () => void;
  onSend: () => void;
  disabled?: boolean;
  isSending?: boolean;
  currentFunction?: string | null;
  totalFileCount?: number;
  isAiReadingActive?: boolean;
  isFolderChat?: boolean;
  isFileParsing?: boolean;
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
  onAddFile,
  onSend,
  disabled = false,
  isSending = false,
  currentFunction = null,
  totalFileCount = 0,
  isAiReadingActive = false,
  isFolderChat = false,
  isFileParsing = false
}: ToolbarProps) {
  const handleAddFile = () => {
    if (!isSending) onAddFile();
  };

  // 检查是否超过文件数量限制（所有会话类型都限制为5个文件）
  const isFileUploadDisabled = totalFileCount >= 5;

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
    if (!disabled && !isSending && !isFileParsing) onSend();
  };

  const handleMouseEnter = () => {
    if (!disabled && !isSending && !isFileParsing) onSendButtonHover(true);
  };

  const handleMouseLeave = () => {
    if (!disabled && !isSending && !isFileParsing) onSendButtonHover(false);
  };

  // isOverallDisabled 只用于发送按钮
  const isOverallDisabled = disabled || isSending || isFileParsing;

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
        className={`w-[140px] h-10 rounded-[20px] flex items-center justify-center gap-2 transition-all ${
          isDeepThinkActive
            ? 'bg-[#0D9488] opacity-80 text-white'
            : 'bg-white border border-[#C8C9CC] text-[#666666]'
        } ${
          isControlDisabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:opacity-90 hover:shadow-sm cursor-pointer'
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
              className={`w-[140px] h-10 rounded-[20px] flex items-center justify-center gap-2 transition-all ${
                isPaperSearchActive
                  ? 'bg-[#0D9488] opacity-80 text-white'
                  : 'bg-white border border-[#C8C9CC] text-[#666666]'
              } ${
                isPaperSearchDisabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:opacity-90 hover:shadow-sm cursor-pointer'
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
      </div>

      {/* Voice recording button */}
      <div className='flex items-center gap-5'>
        <div className="relative flex items-center">
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              src={isRecording
                ? '/chat-page/chat-page-shinyvoice@2x.png'
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
                  ? '/chat-page/chat-page-send@2x.png'
                  : '/chat-page/chat-page-no-send.png'}
                alt="发送"
                className="w-full h-full"
              />
            )}
          </button>
        </TooltipTrigger>
        {isFileParsing && (
          <TooltipContent>
            <p>文件解析中</p>
          </TooltipContent>
        )}
      </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  );
}