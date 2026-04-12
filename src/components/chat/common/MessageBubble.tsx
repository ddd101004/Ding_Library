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
  avatarUrl = role === "user" ? "/chat-page/avatar.png" : "/logo/ai_logo.png",
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

          {/* 用户消息气泡 - 使用 Markdown 渲染 */}
          {formattedContent && (
            <div
              className={cn(
                "bg-[#F7F8FA] border border-[#E0E1E5] rounded-[20px_4px_20px_20px] px-4 py-3",
                "max-w-[1000px] min-w-0 min-h-[60px] mr-12 break-words",
                "mt-4"
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