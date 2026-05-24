/**
 * 消息操作栏 — AI消息底部的操作按钮组（版本切换、点赞点踩、复制、重新生成）
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - 版本切换：多版本时显示左右箭头+版本号(1/2)，调用MessageVersionControl切换
 * - 反馈按钮：调用MessageFeedback组件渲染点赞/点踩按钮
 * - 复制按钮：调用CopyButton复制消息文本到剪贴板
 * - 重新生成按钮：调用onRegenerate重新生成AI回复，AI回复中时显示禁用态+hover提示
 * - 流式输出期间隐藏整条操作栏(isStreaming时display:none)
 *
 * 引用的子组件：
 * - common/CopyButton — 复制到剪贴板按钮
 * - common/MessageVersionControl — 消息版本切换控制器
 * - common/MessageFeedback — 点赞/点踩反馈按钮
 *
 * 引用方：
 * - common/ChatMessage — AI消息底部的操作区域
 */
import React from "react";
import { RefreshCw } from "lucide-react";
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
            <RefreshCw
              className="opacity-50 cursor-not-allowed transition-opacity"
              style={{
                width: "21px",
                height: "20px",
              }}
            />
          ) : (
            // 正常状态的重新生成按钮
            <RefreshCw
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
