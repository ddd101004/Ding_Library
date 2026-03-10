import React from "react";
import CopyButton from "./CopyButton";
import MessageVersionControl from "./MessageVersionControl";
import MessageFeedback from "./MessageFeedback";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageActionsProps {
  isStreaming?: boolean;
  messageId: string;
  currentVersionMessageId?: string; // 当前显示版本的实际 message_id
  content?: string;
  onCopy?: () => void;
  onRegenerate?: () => void;
  copied: boolean;
  canRegenerate?: boolean;
  isAiResponding?: boolean;
  totalVersions?: number;
  currentVersion?: number;
  onPreviousVersion?: (messageId: string) => void;
  onNextVersion?: (messageId: string) => void;
  isLiked?: boolean;
  isDisliked?: boolean;
  onFeedbackSuccess?: (messageId: string, feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike') => void;
}

const MessageActions: React.FC<MessageActionsProps> = ({
  isStreaming,
  messageId,
  currentVersionMessageId,
  content,
  onCopy,
  onRegenerate,
  copied,
  canRegenerate = true,
  isAiResponding = false,
  totalVersions = 1,
  currentVersion = 1,
  onPreviousVersion,
  onNextVersion,
  isLiked = false,
  isDisliked = false,
  onFeedbackSuccess,
}) => {
  const handleRegenerateClick = () => {
    if (onRegenerate) {
      onRegenerate();
    }
  };


  return (
    <div
      className="flex items-center mt-4 group"
      style={{ display: isStreaming ? "none" : "flex" }}
      data-testid="message-actions"
      data-is-streaming={isStreaming ? "true" : "false"}
      data-total-versions={totalVersions}
      data-current-version={currentVersion}
      data-can-regenerate={canRegenerate ? "true" : "false"}
    >
      {/* 版本切换 - 使用独立的 MessageVersionControl 组件 */}
      <MessageVersionControl
        totalVersions={totalVersions}
        currentVersion={currentVersion}
        onPreviousVersion={() => onPreviousVersion?.(messageId)}
        onNextVersion={() => onNextVersion?.(messageId)}
        isStreaming={isStreaming}
      />

      {/* 反馈按钮 - 使用独立的 MessageFeedback 组件 */}
      <TooltipProvider>
        <div className="relative" style={{ marginLeft: totalVersions > 1 && !isStreaming ? "50px" : "0" }}>
          <MessageFeedback
            messageId={messageId}
            currentVersionMessageId={currentVersionMessageId}
            isLiked={isLiked}
            isDisliked={isDisliked}
            onFeedbackSuccess={onFeedbackSuccess}
          />
        </div>
      </TooltipProvider>

      {/* 复制按钮 - 使用封装的 CopyButton 组件 */}
      <div className="relative" style={{ marginLeft: "50px" }}>
        <CopyButton
          content={content || ""}
          size="md"
          variant="icon"
          disabled={false}
          onSuccess={() => {
            onCopy?.();
          }}
        />
      </div>

      {/* 重新回答图标 - 根据全局AI回复状态显示不同样式 */}
      {canRegenerate && (
        <div className="relative" style={{ marginLeft: "50px" }}>
          {isAiResponding ? (
            // AI正在回复中 - 禁用状态的重新生成按钮
            <img
              src="/paper/paper-refresh@2x.png"
              alt="重新回答"
              className="opacity-50 cursor-not-allowed transition-opacity"
              style={{
                width: "21px",
                height: "20px",
              }}
            />
          ) : (
            // 正常状态的重新生成按钮
            <img
              src="/paper/paper-refresh@2x.png"
              alt="重新回答"
              className="cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: "21px",
                height: "20px",
              }}
              onClick={handleRegenerateClick}
            />
          )}
          {/* 悬停提示 - 只在AI正在回复时显示 */}
          {isAiResponding && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              AI正在回复中
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageActions;
