/**
 * 学术搜索页 /academic-search — 万方论文检索
 *
 * 【前端】路由：/academic-search
 *
 * 职责：
 * - 学术论文搜索界面（关键词/标题/作者/摘要/关键词字段）
 * - 搜索结果列表展示
 * - 论文详情查看
 * - 使用WithSidebarLayout布局
 */
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
          <title>AI学术交互系统-学术搜索</title>
        </Head>

        <AcademicSearch />
      </WithSidebarLayout>
      <SearchModal />
    </>
  );
}
