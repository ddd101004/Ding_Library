import React from "react";
import MarkdownRenderer from './MarkdownRenderer';
import { formatMessageForDisplay } from "@/service/chat/conversationUtils";
import { cn } from "@/lib/utils";

interface FileWithContent {
  file: { name: string; type: string; size: number };
  content: string;
}

interface RelatedPaper {
  index: number;
  id: string;
  title: string;
  authors: string[];
  publication_name?: string;
  publication_year?: number;
  abstract?: string;
  doi?: string;
  source: string;
  source_id: string;
}

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  files?: FileWithContent[];
  username?: string;
  avatarUrl?: string;
  isStreaming?: boolean;
  onCopy?: () => void;
  onRegenerate?: () => void;
  copied?: boolean;
  onRemoveFile?: (index: number) => void;
  relatedPapers?: RelatedPaper[] | null;
  onReferenceClick?: (paperIndex: number, element: HTMLElement) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  timestamp,
  files,
  username = "用户",
  avatarUrl = role === "user" ? "/touxiang.jpg" : "/logo/ai_logo.png",
  isStreaming = false,
  onCopy,
  onRegenerate,
  copied = false,
  onRemoveFile,
  relatedPapers,
  onReferenceClick,
}) => {
  // 格式化消息内容（处理历史消息中的文件内容显示）
  const formattedContent = formatMessageForDisplay(content);
  return (
    <div
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      {role === "user" ? (
        // 用户消息 - 保持不变
        <div className="flex flex-col items-end max-w-full">
          {/* 用户信息行 - 时间、昵称、头像在同一行 */}
          <div className="flex items-center justify-end mb-2 w-full">
            <span className="text-sm text-gray-600 mr-3 mt-4">{timestamp}</span>
            <span className="text-sm font-medium mr-3 mt-4">{username}</span>
            <img
              src={avatarUrl}
              alt="用户头像"
              className="w-9 h-9 rounded-full flex-shrink-0"
            />
          </div>

          {/* 显示文件标签（如果有文件） - 关键：确保文件标签正确显示 */}
          {files && files.length > 0 && (
            <div className="mb-2 mr-[30px] w-full flex justify-end">
              <div className="flex flex-wrap gap-[30px] justify-end">
                {files.map((fileWithContent, index) => (
                  <div
                    key={index}
                    className="relative w-[255px] h-[56px] bg-[#F7F8FA] rounded-[20px] border border-[#E0E1E5] flex items-center"
                  >
                    {/* 左侧图标区域 */}
                    <div className="w-[56px] h-[54px] bg-white rounded-l-[20px] border-r border-[#E0E1E5] flex items-center justify-center">
                      {(() => {
                        const fileName =
                          fileWithContent.file.name || "未知文件";
                        const fileExtension = fileName
                          .split(".")
                          .pop()
                          ?.toLowerCase();
                        let iconSrc = "/slibar/slibar-word@2x.png";

                        if (fileExtension === "pdf") {
                          iconSrc = "/slibar/slibar-pdf@2x.png";
                        } else if (fileExtension === "txt") {
                          iconSrc = "/slibar/slibar-txt@2x.png";
                        }

                        return (
                          <img
                            src={iconSrc}
                            alt="文件类型"
                            className="w-[27px] h-[30px] mx-[13px] my-[13px] ml-[15px]"
                          />
                        );
                      })()}
                    </div>

                    {/* 文件名 */}
                    <div className="flex-1 px-4 overflow-hidden">
                      <span
                        className="text-[16px] font-normal text-gray-700 block w-[152px] leading-[40px] h-[34px]"
                        title={fileWithContent.file.name}
                      >
                        {fileWithContent.file.name.length <= 12
                          ? fileWithContent.file.name
                          : fileWithContent.file.name.substring(0, 8) + "..."}
                      </span>
                    </div>
                    
                    {/* 如果是传递的文件，不显示删除按钮 */}
                    {onRemoveFile && (
                      <button
                        onClick={() => onRemoveFile(index)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors border border-[#C8C9CC]"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 用户消息气泡 - 使用 Markdown 渲染 */}
          {formattedContent && (
            <div
              className={cn(
                "bg-[#F7F8FA] border border-[#E0E1E5] rounded-[20px_4px_20px_20px] px-4 py-3",
                "max-w-[1000px] min-w-0 min-h-[60px] mr-12 break-words",
                files && files.length > 0 ? "mt-2" : "mt-4"
              )}
            >
              <div className="text-base text-gray-800 w-full leading-relaxed">
                <MarkdownRenderer
                  content={formattedContent}
                  relatedPapers={relatedPapers}
                  onReferenceClick={onReferenceClick}
                />
              </div>
            </div>
          )}

          {/* 如果只有文件没有文字，添加占位空间 */}
          {!formattedContent && files && files.length > 0 && (
            <div className="mt-4 mr-[30px] h-[10px]"></div>
          )}
        </div>
      ) : (
        // AI消息 - 纯文本，无边框
        <div className="flex justify-start max-w-full">
          <div
            className="text-base text-gray-800 max-w-[1037px] min-w-[40px] min-h-[10px] break-words leading-[1.2] whitespace-pre-line"
          >
            <MarkdownRenderer
              content={formattedContent}
              relatedPapers={relatedPapers}
              onReferenceClick={onReferenceClick}
            />
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-gray-400 animate-bounce"></span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;