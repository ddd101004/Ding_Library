import Head from "next/head";
import ChatHome from '../components/chat/ChatHome';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import FullTextDeliveryToast from '../components/notice/fullTextDeliveryToast';

export default function ChatPage() {
  return (
    <>
      <Head>
        <title>AI智慧学术交互系统-AI对话</title>
      </Head>
      <WithSidebarLayout
        isChatHome={true}
        backgroundImage="" // ChatHome 使用背景图
      >
        <ChatHome />
      </WithSidebarLayout>
      <SearchModal />

      {/* 全文传递完成通知 */}
      <FullTextDeliveryToast />
    </>
  );
}