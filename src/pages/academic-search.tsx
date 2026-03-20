import { useRouter } from "next/router";
import WithSidebarLayout from "../components/layout/WithSidebarLayout";
import SearchModal from "../components/chat/common/SearchModal";
import AcademicSearch from "../components/academicsearch/AcademicSearch";
import Head from "next/head";

export default function academicSearch() {
  const router = useRouter();
  const { q } = router.query;

  return (
    <>
      <WithSidebarLayout
        title="学术搜索"
        backgroundColor="#FFFFFF" // 学术搜索页面使用纯白背景
      >
        <Head>
          <title>AI智慧学术交互系统-学术搜索</title>
        </Head>

        <AcademicSearch />
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}
