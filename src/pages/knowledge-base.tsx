import Head from 'next/head';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
/**
 * 知识库主页 /knowledge-base — 管理知识库和文件夹
 *
 * 【前端】路由：/knowledge-base
 *
 * 职责：
 * - 展示用户的所有知识库（文件夹）卡片
 * - 支持创建、编辑、删除知识库
 * - 点击进入文件夹详情页
 * - 使用WithSidebarLayout布局（isKnowledgeBase模式）
 */
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
        skipMainContent={true}
      >
        <KnowledgeBasePage />
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}