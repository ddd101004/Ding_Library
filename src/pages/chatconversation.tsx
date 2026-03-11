import ChatConversation from '../components/chat/ChatConversation';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import Head from 'next/head';
export default function chat() {
  return (
 <>
      <Head>
        <title>AI智慧学术交互图书馆-AI对话</title>
      </Head>
      <WithSidebarLayout skipMainContent={true}>
        <ChatConversation/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}