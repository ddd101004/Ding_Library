import Head from 'next/head';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import KnowledgeBasePage from '@/components/knowledgebase/KnowledgeBasePage';

export default function KnowledgeBase() {
  return (
    <>
      <WithSidebarLayout
        title="知识库"
        backgroundColor="#FFFFFF" // 知识库页面使用纯白背景
        isKnowledgeBase={true} // 标识为知识库页面
      >
        <Head>
          <title>AI智慧学术交互图书馆-知识库</title>
        </Head>
        <KnowledgeBasePage />
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}