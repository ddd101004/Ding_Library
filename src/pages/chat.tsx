/**
 * 聊天首页 /chat — AI对话主界面
 *
 * 【前端】路由：/chat
 *
 * 职责：
 * - 展示聊天输入区（ChatHome）
 * - 文献检索模式下展示论文推荐面板
 * - 使用WithSidebarLayout布局（isChatHome模式）
 */
import Head from "next/head";
import ChatHome from '../components/chat/ChatHome';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';

export default function ChatPage() {
  return (
    <>
      <Head>
        <title>AI学术交互系统-AI对话</title>
      </Head>
      <WithSidebarLayout
        isChatHome={true}
        backgroundImage="" // ChatHome 使用背景图
      >
        <ChatHome />
      </WithSidebarLayout>
      <SearchModal />
  ))
    </>
  );
}
