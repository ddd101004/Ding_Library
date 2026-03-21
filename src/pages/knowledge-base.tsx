import Head from 'next/head';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import KnowledgeBasePage from '@/components/knowledgebase/KnowledgeBasePage';

export default function KnowledgeBase() {
  return (
    <>
      <Head>
        <title>AI智慧学术交互系统-知识库</title>
      </Head>
      <WithSidebarLayout
        title="知识库"
        backgroundColor="#FFFFFF"
        isKnowledgeBase={true}
      >
        <KnowledgeBasePage />
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}