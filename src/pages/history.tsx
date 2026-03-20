import HistoryPage from '../components/history/HistoryPage';
import WithSidebarLayout from '../components/layout/WithSidebarLayout';
import SearchModal from '../components/chat/common/SearchModal';
import Head from 'next/head';
export default function History() {
  return (
 <>
      <Head>
        <title>AI智慧学术交互系统-历史记录</title>
      </Head>
      <WithSidebarLayout>
        <HistoryPage/>
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}