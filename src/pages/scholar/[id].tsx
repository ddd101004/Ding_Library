import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import WithSidebarLayout from "../../components/layout/WithSidebarLayout";
import ScholarDetail from "../../components/academicsearch/tabs/ScholarDetail";
import Head from "next/head";
import { apiGet } from "@/api/request";

export default function ScholarDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [scholarData, setScholarData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScholarDetail = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiGet(`/api/aminer/scholars/${id}`);

        if (response.code === 200 && response.data) {
          const scholar = response.data;

          // 转换数据格式以匹配组件期望的格式
          const transformedData = {
            id: scholar.id || id,
            name: scholar.name || "",
            name_zh: scholar.name_zh || scholar.name || "",
            org: scholar.orgs?.[0] || "",
            org_zh: scholar.org_zhs?.[0] || scholar.orgs?.[0] || "",
            position: scholar.position || scholar.position_zh || "",
            bio: scholar.bio_zh || scholar.bio || "",
            education: scholar.edu_zh || scholar.edu || "",
            work: `${scholar.position || scholar.position_zh || ""} · ${scholar.org_zhs?.[0] || scholar.orgs?.[0] || ""}`,
            papers: [] // 论文数据需要单独获取
          };

          setScholarData(transformedData);
        } else {
          setError("未找到学者信息");
        }
      } catch (error: any) {
        console.error("获取学者详情失败:", error);
        setError("获取学者信息失败，请稍后再试");
      } finally {
        setLoading(false);
      }
    };

    fetchScholarDetail();
  }, [id]);

  const handleBack = () => {
    router.back();
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

  if (error || !scholarData) {
    return (
      <WithSidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">{error || "未找到学者信息"}</div>
        </div>
      </WithSidebarLayout>
    );
  }

  return (
    <>
      <Head>
        <title>学者详情 - {scholarData.name_zh || scholarData.name}</title>
      </Head>
      <WithSidebarLayout backgroundColor="#FFFFFF">
        <ScholarDetail scholar={scholarData} onBack={handleBack} />
      </WithSidebarLayout>
    </>
  );
}