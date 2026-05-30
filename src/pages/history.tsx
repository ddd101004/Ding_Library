/**
 * 历史记录页 /history — 查看所有对话历史
 *
 * 【前端】路由：/history
 *
 * 职责：
 * - 分页展示用户的所有对话记录
 * - 支持搜索、删除对话
 * - 点击对话进入详情页
 * - 使用WithSidebarLayout布局
 */
import HistoryPage from '../components/history/HistoryPage';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import Head from 'next/head';
export default function History() {
  return (
 <>
      <Head>
        <title>AI学术交互系统-历史记录</title>
      </Head>
      <WithSidebarLayout>
        <HistoryPage/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}