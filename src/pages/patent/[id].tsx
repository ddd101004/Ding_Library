import { useRouter } from "next/router";
import WithSidebarLayout from "../../components/layout/WithSidebarLayout";
import { useEffect, useState } from "react";
import { apiGet } from "@/api/request";
import Head from "next/head";
import PatentDetail from "../../components/academicsearch/tabs/PatentDetail";

export default function PatentDetailPage() {
  const router = useRouter();
  const { id, tab, q } = router.query;
  const [patent, setPatent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatentDetail = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // 调用 AMiner 专利详情 API
        const response = await apiGet(`/api/aminer/patents/${id}`);

        if (response.code === 200 && response.data) {
          const patent = response.data;

          // 转换数据格式以匹配组件期望的格式
          const transformedData = {
            id: patent.id || id,
            title: patent.title || "",
            title_zh: patent.title_zh || patent.title || "",
            abstract: patent.abstract || "",
            year: patent.year,
            n_citation: patent.n_citation || 0,
            inventors: patent.inventors || [],
            assignees: patent.assignees || [],
            patent_type: patent.patent_type,
            application_date: patent.application_date,
            publication_date: patent.publication_date,
            ipc: patent.ipc || [],
            keywords: patent.keywords || [],
            source: patent.source || "aminer"
          };

          setPatent(transformedData);
        } else {
          setError("未找到专利信息");
        }
      } catch (error: any) {
        console.error("获取专利详情失败:", error);
        setError("获取专利信息失败，请稍后再试");
      } finally {
        setLoading(false);
      }
    };

    fetchPatentDetail();
  }, [id]);

  const handleBack = () => {
    if (tab && typeof tab === "string") {
      router.push({
        pathname: "/academic-search",
        query: {
          tab: tab,
          q: q || ""
        }
      });
    } else {
      router.push("/academic-search");
    }
  };

  if (loading) {
    return (
      <WithSidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">加载中...</div>
        </div>
      </WithSidebarLayout>
    );
  }

  if (error || !patent) {
    return (
      <WithSidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">{error || "未找到专利信息"}</div>
        </div>
      </WithSidebarLayout>
    );
  }

  return (
    <>
      <Head>
        <title>专利详情 - {patent.title_zh || patent.title}</title>
      </Head>
      <WithSidebarLayout backgroundColor="#FFFFFF">
        <PatentDetail patent={patent} onBack={handleBack} />
      </WithSidebarLayout>
    </>
  );
}