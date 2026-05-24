/**
 * 消息列表容器 — 渲染对话消息列表，处理消息key、版本映射、重新生成权限
 *
 * 【前端】对话模块布局组件
 *
 * 职责：
 * - 遍历messages数组渲染ChatMessage组件列表
 * - 使用backendId（后端消息ID）作为React key，确保消息唯一性和正确更新
 * - 从currentVersionMessageIds映射获取每条消息当前版本的实际message_id
 * - 仅最新AI消息(latestAiMessageId)显示重新生成按钮(canRegenerate=true)
 * - 支持分栏布局(isInSplitLayout)和单栏布局两种样式
 * - 列表底部放置messagesEndRef用于自动滚动到底部
 * - 显示messageError全局错误提示
 *
 * 引用的子组件：
 * - common/ChatMessage — 单条消息渲染
 *
 * 引用方：
 * - chat/ChatConversation — 对话详情页的消息列表区域
 */
"use client";
import React from "react";
import ChatMessage from "../common/ChatMessage";

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

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  files?: any[];
  thinking?: string;
  isThinkingCollapsed?: boolean;
  backendId?: string | null;
  status?: "completed" | "streaming" | "error";
  totalVersions?: number;
  currentVersion?: number;
  isLiked?: boolean;
  isDisliked?: boolean;
}

interface MessageListContainerProps {
  messages: Message[];
  messageError: string | null;
  copiedMessageId: string | null;
  userInfo?: { username: string } | null;
  onToggleCollapse: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onStopStreaming: () => void;
  // 新增：全局AI回复状态
  isAiResponding?: boolean;
  onPreviousVersion: (messageId: string) => void;
  onNextVersion: (messageId: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  // 新增：是否在分栏布局中
  isInSplitLayout?: boolean;
  // 新增：相关论文数据
  relatedPapers?: RelatedPaper[] | null;
  onReferenceClick?: (paperIndex: number, element: HTMLElement) => void;
  onFeedbackSuccess?: (messageId: string, feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike') => void;
  // 新增：当前版本映射
  currentVersionMessageIds?: Record<string, string>;
  // 新增：最新AI消息ID
  latestAiMessageId?: string | null;
}

export default function MessageListContainer({
  messages,
  messageError,
  copiedMessageId,
  userInfo,
  onToggleCollapse,
  onCopy,
  onRegenerate,
  onStopStreaming,
  // 新增：全局AI回复状态
  isAiResponding = false,
  onPreviousVersion,
  onNextVersion,
  messagesEndRef,
  isInSplitLayout = false,
  // 新增：相关论文数据
  relatedPapers,
  onReferenceClick,
  onFeedbackSuccess,
  currentVersionMessageIds = {},
  latestAiMessageId,
}: MessageListContainerProps) {
  return (
    <div className={`flex-1 ${isInSplitLayout ? '' : 'w-full px-6 py-4 mb-[10px]'}`}>
      <div className={`relative w-full transition-all duration-300 ${isInSplitLayout ? 'max-w-full' : 'max-w-7xl mx-auto'}`}>
        <div className={`${isInSplitLayout ? 'w-full pr-[40px]' : 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8'} space-y-5`}>
          {messageError && (
            <div className="text-red-500 text-center py-10">
              {messageError}
            </div>
          )}

          {messages.map((message) => {
            // 使用 backendId 作为主要key，如果没有则使用前端id
            // 确保消息的唯一性，避免重复渲染
            const messageKey = message.backendId || message.id;
            const actualMessageId = message.backendId || message.id;

            // 从映射中获取当前版本的实际 message_id
            const currentVersionMessageId = message.backendId
              ? (currentVersionMessageIds[message.backendId] || message.backendId)
              : undefined;

            // 只有最新AI消息才显示重新生成按钮
            const canRegenerate = message.role === 'assistant' && message.backendId === latestAiMessageId;

            return (
              <ChatMessage
                key={messageKey}
                id={message.id}
                role={message.role}
                content={message.content}
                timestamp={message.timestamp}
                files={message.files}
                username={userInfo?.username || "用户"}
                thinking={message.thinking}
                isThinkingCollapsed={message.isThinkingCollapsed}
                isStreaming={message.isStreaming}
                backendId={message.backendId}
                copied={copiedMessageId === messageKey}
                onToggleCollapse={onToggleCollapse}
                onCopy={onCopy}
                onRegenerate={onRegenerate}
                onStopStreaming={onStopStreaming}
                isAiResponding={isAiResponding}
                totalVersions={message.totalVersions}
                currentVersion={message.currentVersion}
                onPreviousVersion={() => onPreviousVersion(actualMessageId)}
                onNextVersion={() => onNextVersion(actualMessageId)}
                relatedPapers={relatedPapers}
                onReferenceClick={onReferenceClick}
                isLiked={message.isLiked}
                isDisliked={message.isDisliked}
                onFeedbackSuccess={onFeedbackSuccess}
                currentVersionMessageId={currentVersionMessageId}
                canRegenerate={canRegenerate}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}