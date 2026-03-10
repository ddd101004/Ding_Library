import Head from "next/head";
import ChatHome from '../components/chat/ChatHome';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import FullTextDeliveryToast from '../components/notice/fullTextDeliveryToast';

export default function ChatPage() {
  return (
    <>
      <Head>
        <title>临港科技智慧图书馆-AI对话</title>
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