import AiReadingConversation from '../components/chat/AiReadingConversation';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import Head from 'next/head';

export default function aiReadingChat() {
  return (
    <>
      <Head>
        <title>临港科技智慧图书馆-AI伴读</title>
      </Head>
      <WithSidebarLayout>
        <AiReadingConversation/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}