/**
 * 对话详情页 /chatconversation — 查看指定对话的消息记录
 *
 * 【前端】路由：/chatconversation?id=xxx
 *
 * 职责：
 * - 根据URL参数conversationId加载对话消息
 * - 展示完整对话历史和AI回复
 * - 支持继续对话
 * - 使用WithSidebarLayout布局（skipMainContent模式）
 */
import ChatConversation from '../components/chat/ChatConversation';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import Head from 'next/head';
export default function chat() {
  return (
 <>
      <Head>
        <title>AI学术交互系统-AI对话</title>
      </Head>
      <WithSidebarLayout skipMainContent={true}>
        <ChatConversation/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}