import AiReadingConversation from '../components/chat/AiReadingConversation';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import Head from 'next/head';

export default function aiReadingChat() {
  return (
    <>
      <Head>
        <title>AI智慧学术交互图书馆-AI伴读</title>
      </Head>
      <WithSidebarLayout>
        <AiReadingConversation/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}