import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import WithSidebarLayout from "../../components/layout/WithSidebarLayout";
import PaperDetail from "../../components/academicsearch/tabs/PaperDetail";
import Head from "next/head";
import { apiGet } from "@/api/request";

export default function PaperDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [paperData, setPaperData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaperDetail = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        // 先尝试获取用户上传的论文
        let response = await apiGet(`/api/uploaded-papers/${id}`);

        // 如果用户上传论文不存在，尝试获取第三方论文
        if (response.code !== 200) {
          response = await apiGet(`/api/papers/${id}`);
        }

        if (response.code === 200 && response.data) {
          const paper = response.data;

          // 转换数据格式以匹配组件期望的格式
          const transformedData = {
            id: paper.id || id,
            title: paper.title || "",
            title_zh: paper.title || "",
            authors: paper.authors || [],
            abstract: paper.abstract || "",
            abstract_zh: paper.abstract || "",
            year: paper.publicationYear || paper.year,
            n_citation: paper.n_citation || 0,
            venue: paper.publicationName || paper.venue || {},
            doi: paper.doi,
            keywords: paper.keywords || [],
            source: paper.source || "uploaded",
            url: paper.plink || paper.url,
            publicationName: paper.publicationName,
            publicationDate: paper.publicationDate,
            publicationType: paper.publicationType,
            hasFulltext: paper.hasFulltext || !!paper.parsed_content,
            pdfLink: paper.pdfLink || paper.file_path,
          };

          setPaperData(transformedData);
        } else {
          setError("未找到论文信息");
        }
      } catch (error: any) {
        console.error("获取论文详情失败:", error);
        setError("获取论文信息失败，请稍后再试");
      } finally {
        setLoading(false);
      }
    };

    fetchPaperDetail();
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

  if (error || !paperData) {
    return (
      <WithSidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">{error || "未找到论文信息"}</div>
        </div>
      </WithSidebarLayout>
    );
  }

  return (
    <>
      <Head>
        <title>论文详情 - {paperData.title_zh || paperData.title}</title>
      </Head>
      <WithSidebarLayout backgroundColor="#FFFFFF">
        <PaperDetail paper={paperData} onBack={handleBack} />
      </WithSidebarLayout>
    </>
  );
}