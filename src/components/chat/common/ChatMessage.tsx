/**
 * 单条消息组件 — 根据角色渲染用户消息或AI回复，包含思考过程、操作按钮、版本控制
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - 用户消息(role=user)：直接渲染MessageBubble
 * - AI消息(role=assistant)：渲染AI头像+ThinkingProcess思考过程+MessageBubble回复内容+MessageActions操作按钮
 * - 思考过程长度>10字符时才显示ThinkingProcess组件
 * - 使用backendId作为消息唯一标识（优先于前端生成的id）
 * - 流式输出时底部显示StopStreamingButton停止按钮
 * - 支持论文引用标记点击(onReferenceClick)
 *
 * 引用的子组件：
 * - common/MessageBubble — 消息气泡渲染（含MarkdownRenderer）
 * - common/ThinkingProcess — 思考过程折叠/展开
 * - common/MessageActions — 复制/重新生成/版本切换/点赞点踩
 * - common/StopStreamingButton — 停止流式输出按钮
 *
 * 引用方：
 * - chat/ChatSplitLayout — 消息列表中每条消息的渲染
 */
import React from 'react';
import MessageBubble from './MessageBubble';
import ThinkingProcess from './ThinkingProcess';
import MessageActions from './MessageActions';
import StopStreamingButton from './StopStreamingButton';
import { useAvatar } from '@/contexts/AvatarContext';

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

interface ChatMessageProps {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  files?: any[];
  username?: string;
  thinking?: string;
  isThinkingCollapsed?: boolean;
  isStreaming?: boolean;
  backendId?: string | null;
  copied?: boolean;
  onToggleCollapse?: (id: string) => void;
  onCopy?: (id: string) => void;
  onRegenerate?: (id: string) => void;
  onStopStreaming?: () => void;
  isAiResponding?: boolean;
  totalVersions?: number;
  currentVersion?: number;
  onPreviousVersion?: (messageId: string) => void;
  onNextVersion?: (messageId: string) => void;
  thinkingMaxWidth?: string;
  relatedPapers?: RelatedPaper[] | null;
  onReferenceClick?: (paperIndex: number, element: HTMLElement) => void;
  isLiked?: boolean;
  isDisliked?: boolean;
  onFeedbackSuccess?: (messageId: string, feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike') => void;
  currentVersionMessageId?: string; // 当前显示版本的实际 message_id
  canRegenerate?: boolean; // 是否显示重新生成按钮
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  id,
  role,
  content,
  timestamp,
  files,
  username = '用户',
  thinking,
  isThinkingCollapsed = false,
  isStreaming = false,
  backendId,
  copied = false,
  onToggleCollapse,
  onCopy,
  onRegenerate,
  onStopStreaming,
  isAiResponding = false,
  totalVersions = 1,
  currentVersion = 1,
  onPreviousVersion,
  onNextVersion,
  thinkingMaxWidth,
  relatedPapers,
  onReferenceClick,
  isLiked = false,
  isDisliked = false,
  onFeedbackSuccess,
  currentVersionMessageId,
  canRegenerate = false,
}) => {
  const { avatarUrl } = useAvatar();
  // 使用 backendId 作为消息ID，如果没有则使用前端ID作为fallback
  const messageId = backendId || id;
  
  
  // 添加点击事件
  const handleCopyClick = () => {
    if (onCopy) {
      onCopy(messageId);
    }
  };

  const handleRegenerateClick = () => {
    if (onRegenerate) {
      onRegenerate(messageId);
    }
  };

  // 处理折叠/展开思考过程
  const handleToggleCollapse = () => {
        if (onToggleCollapse) {
      onToggleCollapse(messageId);
    }
  };

  if (role === 'user') {
    return (
      <MessageBubble
        role={role}
        content={content}
        timestamp={timestamp}
        files={files}
        username={username}
        avatarUrl={avatarUrl}
        relatedPapers={relatedPapers}
        onReferenceClick={onReferenceClick}
      />
    );
  }

  return (
    <div className="flex flex-col max-w-full w-full" data-message-id={messageId}>
      {/* AI头像和信息 */}
      <div className="flex items-center w-full">
        <img
          src="/logo/ai_logo.png"
          alt="AI头像"
          className="w-9 h-9 rounded-full mr-3 flex-shrink-0"
        />
        <span className="text-sm font-medium mr-3">AI助手</span>
        <span className="text-sm text-gray-600">
          {timestamp}
        </span>
      </div>

      {/* AI消息内容区域 */}
      <div className="ml-12 flex flex-col">
        {/* 只在有真正思考内容时才显示思考过程 - 修复长度判断 */}
        {thinking && thinking.trim() !== "" && thinking.length > 10 && (
          <div className="mb-3">
            <ThinkingProcess
              thinking={thinking}
              isThinkingCollapsed={isThinkingCollapsed}
              messageId={messageId}
              isStreaming={isStreaming}
              maxWidth={thinkingMaxWidth}
              onToggleCollapse={handleToggleCollapse}
            />
          </div>
        )}

        {/* 最终回答 - 纯文本显示 */}
        <div className={thinking && thinking.trim() !== "" && thinking.length > 10 && !isThinkingCollapsed ? "mt-4" : ""}>
          <MessageBubble
            role={role}
            content={content}
            timestamp={timestamp}
            files={files}
            isStreaming={isStreaming && (!thinking || thinking.length <= 10)}
            relatedPapers={relatedPapers}
            onReferenceClick={onReferenceClick}
          />
        </div>

        <MessageActions
          isStreaming={isStreaming}
          messageId={messageId}
          currentVersionMessageId={currentVersionMessageId}
          content={content}
          onCopy={handleCopyClick}
          onRegenerate={handleRegenerateClick}
          copied={copied}
          canRegenerate={canRegenerate}
          isAiResponding={isAiResponding}
          totalVersions={totalVersions}
          currentVersion={currentVersion}
          onPreviousVersion={onPreviousVersion}
          onNextVersion={onNextVersion}
          isLiked={isLiked}
          isDisliked={isDisliked}
          onFeedbackSuccess={onFeedbackSuccess}
        />

        {/* 停止按钮 */}
        {onStopStreaming && (
          <StopStreamingButton
            onStop={onStopStreaming}
            hasThinking={!!thinking}
            isStreaming={isStreaming}
          />
        )}
      </div>
    </div>
  );
};
export default ChatMessage;