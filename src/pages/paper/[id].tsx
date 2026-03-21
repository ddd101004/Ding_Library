import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import WithSidebarLayout from "../../components/layout/WithSidebarLayout";
import PaperDetail from "../../components/academicsearch/tabs/PaperDetail";
import SearchModal from "../../components/chat/common/SearchModal";
import Head from "next/head";
import { apiGet } from "@/api/request";

export default function PaperDetailPage() {
  const router = useRouter();
  const { id, source } = router.query;
  const [paperData, setPaperData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaperDetail = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        let response: any;

        // 根据 source 参数决定调用哪个API
        if (source === 'third-party') {
          // 第三方论文：直接调用第三方论文API
          console.log("第三方论文，直接调用第三方API...");
          response = await apiGet(`/api/papers/${id}`);
        } else {
          // 未知来源或用户上传：先尝试用户上传论文API
          let uploadedNotFound = false;

          try {
            response = await apiGet(`/api/uploaded-papers/${id}`, {
              silentError: true  // 静默处理错误，不显示toast
            } as any);
          } catch (uploadedError: any) {
            console.log("用户上传论文不存在，尝试第三方论文");
            uploadedNotFound = true;
          }

          // 如果用户上传论文不存在或出错，尝试获取第三方论文
          if (uploadedNotFound || (response && response.code !== 200)) {
            try {
              console.log("调用第三方论文API...");
              response = await apiGet(`/api/papers/${id}`, {
                silentError: true  // 静默处理错误
              } as any);
            } catch (thirdPartyError: any) {
              console.log("第三方论文API异常:", thirdPartyError);
              response = { code: 503 };
            }
          }
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

          console.log("论文数据转换成功:", transformedData);
          setPaperData(transformedData);
        } else {
          console.log("响应验证失败:", { code: response.code, hasData: !!response.data, response });
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
  }, [id, source]);

  const handleBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <>
        <WithSidebarLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-500">加载中...</div>
          </div>
        </WithSidebarLayout>
        <SearchModal />
      </>
    );
  }

  if (error || !paperData) {
    return (
      <>
        <WithSidebarLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-500">{error || "未找到论文信息"}</div>
          </div>
        </WithSidebarLayout>
        <SearchModal />
      </>
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
      <SearchModal />
    </>
  );
}