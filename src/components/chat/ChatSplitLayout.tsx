/**
 * 对话分屏布局 — 管理消息列表区与论文搜索侧栏的双栏/单栏切换
 *
 * 【前端】对话模块布局组件
 *
 * 职责：
 * - 论文搜索开启时：左侧消息列表+右侧RelatedPapers面板，中间分割线
 * - 论文搜索关闭时：单栏消息列表+底部输入区
 * - 管理三个滚动容器分别使用useAutoHideScrollbar（消息列表、论文面板、单栏模式）
 * - 遍历messages渲染ChatMessage，关联每条消息的relatedPapers
 * - 仅最新AI消息显示重新生成按钮（canRegenerate逻辑）
 *
 * 引用的子组件：
 * - common/ChatMessage — 单条消息渲染
 * - common/RelatedPapers — 论文搜索侧栏
 *
 * 引用方：
 * - chat/ChatConversation — 作为布局容器传入消息区和输入区内容
 */
import React, { useEffect } from "react";
import { useRouter } from "next/router";
import ChatMessage from "./common/ChatMessage";
import RelatedPapers from "./common/RelatedPapers";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  files?: any[];
  thinking?: string;
  isThinkingCollapsed?: boolean;
  backendId?: string | null;
  totalVersions?: number;
  currentVersion?: number;
  isLiked?: boolean;
  isDisliked?: boolean;
}

export interface MessagePapers {
  messageId: string;
  papers: Array<{
    id: string;
    title: string;
    authors: string[];
    publication_name?: string;
    publication_year?: number;
    abstract?: string;
    doi?: string;
    source: string;
    source_id: string;
    index: number;
    doc_delivery_status?: {
      request_id: string;
      status: number;
      status_text: string | null;
      fulltext_url: string | null;
      create_time: string;
    };
  }>;
  keywords: string[];
  search_query: string;
}

interface ChatSplitLayoutProps {
  showRelatedPapers: boolean;
  messages: Message[];
  relatedPapersList: MessagePapers[];
  messageError: string | null;
  copiedMessageId: string | null;
  userInfo: { username: string } | null;
  isAiResponding: boolean;
  conversationId: string | string[] | undefined;
  isSidebarOpen: boolean;
  onToggleCollapse: (messageId: string) => void;
  onCopy: (messageId: string) => void;
  onRegenerate: (messageId: string) => void;
  onStopStreaming: () => void;
  onPreviousVersion: (messageId: string) => void;
  onNextVersion: (messageId: string) => void;
  onReferenceClick: (paperIndex: number, element: HTMLElement) => void;
  singleColumnContent: React.ReactNode;
  inputAreaContent: React.ReactNode;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onFeedbackSuccess?: (messageId: string, feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike') => void;
  currentVersionMessageIds?: Record<string, string>;
  latestAiMessageId?: string | null;
}

export default function ChatSplitLayout({
  showRelatedPapers,
  messages,
  relatedPapersList,
  messageError,
  copiedMessageId,
  userInfo,
  isAiResponding,
  conversationId,
  isSidebarOpen,
  onToggleCollapse,
  onCopy,
  onRegenerate,
  onStopStreaming,
  onPreviousVersion,
  onNextVersion,
  onReferenceClick,
  singleColumnContent,
  inputAreaContent,
  messagesEndRef,
  onFeedbackSuccess,
  currentVersionMessageIds = {},
  latestAiMessageId,
}: ChatSplitLayoutProps) {
  const router = useRouter();

  // 为三个滚动容器分别使用 Hook，传入自定义配置
  // 增大 proximity 范围，使鼠标靠近滚动条时更容易显示；减少 delay 时间，滚动时立即显示
  const { containerRef: scrollContainerRef1 } = useAutoHideScrollbar({ delay: 1000, proximity: 50 });
  const { containerRef: scrollContainerRef2 } = useAutoHideScrollbar({ delay: 1000, proximity: 50 });
  const { containerRef: scrollContainerRef3 } = useAutoHideScrollbar({ delay: 1000, proximity: 50 });

  const renderMessageList = () => (
    <>
      {messageError && (
        <div className="text-red-500 text-center py-10">
          {messageError}
        </div>
      )}

      <div className="space-y-5 pb-[10px]">
        {messages.map((message) => {
          const actualMessageId = message.backendId || message.id;
          const currentVersionMessageId = message.backendId
            ? (currentVersionMessageIds[message.backendId] || message.backendId)
            : undefined;

          // 只有最新AI消息才显示重新生成按钮
          const canRegenerate = message.role === 'assistant' && message.backendId === latestAiMessageId;

          const messageRelatedPapers = relatedPapersList.find(
            (mp) => mp.messageId === actualMessageId
          )?.papers || null;

          return (
            <ChatMessage
              key={message.id}
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
              copied={copiedMessageId === message.id}
              onToggleCollapse={onToggleCollapse}
              onCopy={onCopy}
              onRegenerate={onRegenerate}
              onStopStreaming={onStopStreaming}
              isAiResponding={isAiResponding}
              onPreviousVersion={onPreviousVersion}
              onNextVersion={onNextVersion}
              totalVersions={message.totalVersions}
              currentVersion={message.currentVersion}
              thinkingMaxWidth="1037px"
              relatedPapers={messageRelatedPapers}
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
    </>
  );

  const renderRelatedPapers = () => (
    <>
      {relatedPapersList.map((messagePapers, messageIndex) => (
        <React.Fragment key={messagePapers.messageId}>
          <RelatedPapers
            papers={messagePapers.papers}
            keywords={messagePapers.keywords}
            search_query={messagePapers.search_query}
            conversationId={conversationId as string}
            messageId={messagePapers.messageId}
            isVisible={showRelatedPapers}
          />
          {messageIndex < relatedPapersList.length - 1 && (
            <div
              style={{
                width: '500px',
                height: '3px',
                background: '#E0E1E5',
                marginLeft: '40px',
                marginTop: '10px',
                marginBottom: '30px'
              }}
            ></div>
          )}
        </React.Fragment>
      ))}
    </>
  );

  return (
    <div className="h-screen overflow-hidden bg-[#d5f4cff] flex flex-col">
      <div
        className="flex-1 flex overflow-hidden"
      >
        {showRelatedPapers ? (
          <div className="flex w-full h-full justify-center">
            <div className="flex pl-5" style={{ maxWidth: '1759px', width: '100%', height: '100%' }}>
              <div className="flex-1 pr-[15px] flex flex-col h-full" style={{ maxWidth: '1148px' }}>
                <div
                  ref={scrollContainerRef1}
                  className="flex-1 overflow-y-auto overflow-x-hidden auto-hide-scrollbar"
                >
                  {renderMessageList()}
                </div>
                <div className="flex-shrink-0 pb-2">
                  {inputAreaContent}
                </div>
              </div>

              <div className="w-[1px] h-full bg-[#E2E3E7] flex-shrink-0"></div>

              <div className="min-w-[350px] max-w-[610px] pl-[0px] flex flex-col h-full flex-shrink-0 lg:w-[35vw] md:w-[40vw] w-[45vw]" style={{ backgroundColor: '#F7F8FA' }}>
                {/* 固定头部 */}
                <div
                  className="w-full"
                  style={{
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#F7F8FA',
                    zIndex: 10,
                    paddingTop: '32px',
                    paddingLeft: 'clamp(20px, 5vw, 40px)',
                    paddingRight: 'clamp(10px, 3vw, 20px)',
                    paddingBottom: '20px'
                  }}
                >
                  <h3
                    className="text-left"
                    style={{
                      fontWeight: 500,
                      fontSize: 'clamp(16px, 2vw, 20px)',
                      color: '#333333'
                    }}
                  >
                    搜索结果
                  </h3>
                  {/* 横线 */}
                  <div className="mt-[31px]">
                    <div
                      className="w-full"
                      style={{
                        height: '1px',
                        background: '#E0E1E5',
                        borderRadius: '1px'
                      }}
                    />
                  </div>
                  {/* "以下是寻找到的论文:" 文字 */}
                  <div className="mt-[30px]">
                    <p
                      className="text-left"
                      style={{
                        fontWeight: 500,
                        fontSize: 'clamp(14px, 1.5vw, 16px)',
                        color: '#333333'
                      }}
                    >
                      以下是寻找到的论文:
                    </p>
                  </div>
                </div>
                {/* 滚动内容区域 */}
                <div
                  ref={scrollContainerRef2}
                  className="flex-1 overflow-y-auto overflow-x-hidden auto-hide-scrollbar pb-20"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {renderRelatedPapers()}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            ref={scrollContainerRef3}
            className="flex-1 overflow-y-auto overflow-x-hidden auto-hide-scrollbar"
            style={{ maxHeight: 'calc(100vh - 220px)' }}
          >
            {singleColumnContent}
          </div>
        )}
      </div>

      {!showRelatedPapers && inputAreaContent}
    </div>
  );
}
