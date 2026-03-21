import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import WithSidebarLayout from "../../../components/layout/WithSidebarLayout";
import { apiGet } from "@/api/request";
import SearchModal from "../../../components/chat/common/SearchModal";

export default function FileDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileDetail = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await apiGet(`/api/uploaded-papers/${id}`);

        if (response.code === 200 && response.data) {
          setFileData(response.data);
        } else {
          setError("未找到文件信息");
        }
      } catch (error: any) {
        console.error("获取文件详情失败:", error);
        setError("获取文件信息失败，请稍后再试");
      } finally {
        setLoading(false);
      }
    };

    fetchFileDetail();
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
        <SearchModal />
      </WithSidebarLayout>
    );
  }

  if (error || !fileData) {
    return (
      <WithSidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">{error || "未找到文件信息"}</div>
        </div>
        <SearchModal />
      </WithSidebarLayout>
    );
  }

  return (
    <WithSidebarLayout>
      <style jsx global>{`
        .file-content-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .file-content-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .file-content-scrollbar::-webkit-scrollbar-thumb {
          background: #CBD5E1;
          border-radius: 4px;
        }
        .file-content-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94A3B8;
        }
      `}</style>
      <div className="relative">
        {/* 头部：返回按钮和标题 */}
        <div className="flex items-center cursor-pointer ml-[105px]" onClick={handleBack}>
          <img src="/paper/paper-details.png" alt="详情" className="w-[6px] h-[10px]" />
          <span className="ml-[10px] text-sm text-[#666666]">文件详情</span>
        </div>

        {/* 分隔线 */}
        <div className="w-full h-px bg-[#E0E1E5] mt-6" />

        {/* 内容容器 */}
        <div className="relative mt-[23px] ml-[105px] mr-[305px] w-[calc(100vw-410px)] min-h-[600px]">
          {/* 文件标题 */}
          <div className="mt-[22px]">
            <h1 className="text-2xl font-medium text-[#333333]">{fileData.title}</h1>
          </div>

          {/* 文件信息卡片 */}
          <div className="w-full bg-white rounded-2xl border border-[#E0E1E5] mt-8 p-6">
            <div className="flex flex-col gap-4">
              {/* 文件名 */}
              <div className="flex items-center">
                <span className="text-base text-[#999999] w-[120px]">文件名</span>
                <span className="text-base text-[#333333] flex-1">{fileData.file_name}</span>
              </div>

              {/* 分隔线 */}
              <div className="w-full h-px bg-[#E0E1E5]" />

              {/* 文件大小 */}
              <div className="flex items-center">
                <span className="text-base text-[#999999] w-[120px]">文件大小</span>
                <span className="text-base text-[#333333] flex-1">
                  {(fileData.file_size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>

              {/* 分隔线 */}
              <div className="w-full h-px bg-[#E0E1E5]" />

              {/* 文件类型 */}
              <div className="flex items-center">
                <span className="text-base text-[#999999] w-[120px]">文件类型</span>
                <span className="text-base text-[#333333] flex-1">
                  {fileData.file_type?.toUpperCase() || "未知"}
                </span>
              </div>

              {/* 分隔线 */}
              <div className="w-full h-px bg-[#E0E1E5]" />

              {/* 解析状态 */}
              <div className="flex items-center">
                <span className="text-base text-[#999999] w-[120px]">解析状态</span>
                <span
                  className={`text-base flex-1 ${
                    fileData.parse_status === "completed"
                      ? "text-green-600"
                      : fileData.parse_status === "parsing"
                      ? "text-blue-600"
                      : fileData.parse_status === "failed"
                      ? "text-red-600"
                      : "text-gray-600"
                  }`}
                >
                  {fileData.parse_status === "completed"
                    ? "解析完成"
                    : fileData.parse_status === "parsing"
                    ? "正在解析"
                    : fileData.parse_status === "failed"
                    ? "解析失败"
                    : "等待解析"}
                </span>
              </div>
            </div>
          </div>

          {/* 解析内容区域 */}
          {fileData.parse_status === "completed" && fileData.parsed_content && (
            <div className="mt-8">
              <h2 className="text-xl font-medium text-[#333333] mb-4">文件内容</h2>
              <div className="w-full bg-white rounded-2xl border border-[#E0E1E5] p-6">
                <div className="file-content-scrollbar text-base text-[#666666] leading-[1.8] whitespace-pre-wrap max-h-[800px] overflow-y-scroll overflow-x-scroll">
                  {fileData.parsed_content}
                </div>
              </div>
            </div>
          )}

          {/* 解析失败提示 */}
          {fileData.parse_status === "failed" && (
            <div className="mt-8">
              <div className="w-full bg-red-50 rounded-2xl border border-red-200 p-6">
                <p className="text-base text-red-600">
                  文件解析失败，请确认文件格式是否支持（PDF、DOCX）。
                </p>
              </div>
            </div>
          )}

          {/* 正在解析提示 */}
          {fileData.parse_status === "parsing" && (
            <div className="mt-8">
              <div className="w-full bg-blue-50 rounded-2xl border border-blue-200 p-6">
                <p className="text-base text-blue-600">文件正在解析中，请稍后刷新页面查看...</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <SearchModal />
    </WithSidebarLayout>
  );
}
