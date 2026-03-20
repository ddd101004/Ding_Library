import React, { useState, useEffect, useRef } from "react";
import { apiGetAuth, apiDownloadFile } from "@/api/request";
import { toast } from "sonner";

interface CitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  paperTitle: string;
  authors?: (string | { name: string; name_zh?: string })[];
  year?: number;
  publicationName?: string;
  paperId?: string;
}

type CitationFormat = "APA" | "MLA" | "Chicago" | "BibTeX" | "RIS";
type DownloadFormat = "BibTeX" | "RIS";

interface CitationData {
  format: CitationFormat;
  formatted_text: string;
  download_formats: {
    bibtex: string;
    ris: string;
  };
}

export default function CitationModal({
  isOpen,
  onClose,
  paperTitle,
  authors,
  year,
  publicationName,
  paperId,
}: CitationModalProps) {
  const [citationFormat, setCitationFormat] = useState<CitationFormat>("APA");
  const [citationData, setCitationData] = useState<CitationData | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>("BibTeX");
  const [isLoading, setIsLoading] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitializedRef = useRef(false);

  const citationFormats: CitationFormat[] = [
    "APA",
    "MLA",
    "Chicago",
    "BibTeX",
    "RIS",
  ];
  const downloadFormats: DownloadFormat[] = ["BibTeX", "RIS"];

  // 处理不同格式的作者数据
  const getAuthorNames = () => {
    if (!authors || authors.length === 0) return [];
    return authors.map((author) => {
      if (typeof author === "string") {
        return author;
      } else if (typeof author === "object" && author.name) {
        return author.name_zh || author.name;
      }
      return String(author);
    });
  };

  const authorNames = getAuthorNames();

  
  // 处理下载
  const handleDownload = async () => {
    if (!paperId) return false;

    try {
      await apiDownloadFile(
        "/api/chat/citations/download",
        {
          paper_id: paperId,
          format: downloadFormat.toLowerCase(),
        },
        `citation.${downloadFormat.toLowerCase()}`
      );
      return true;
    } catch (error: any) {
      console.error("下载失败:", error);
      // apiDownloadFile已经处理了错误提示，这里只需要记录日志
      return false;
    }
  };

  // 处理确认按钮
  const handleConfirm = async () => {
    // 立即关闭弹窗
    onClose();

    // 在后台下载文件
    const success = await handleDownload();

    // 下载成功后显示提示
    if (success) {
      toast.success(`引用文件已成功下载为 ${downloadFormat} 格式`);
    }
  };

  // 当弹窗打开时，重置为 APA 格式并获取引用
  useEffect(() => {
    if (isOpen && paperId) {
      // 重置为 APA 格式
      setCitationFormat("APA");
      isInitializedRef.current = false;
      fetchCitationFormatWithFormat("APA");
      // 延迟设置初始化完成标志，避免立即触发第二个 useEffect
      setTimeout(() => {
        isInitializedRef.current = true;
      }, 0);
    }

    // 组件卸载时取消进行中的请求
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isOpen, paperId]);

  // 当格式改变时重新获取引用内容
  useEffect(() => {
    // 只有在弹窗已打开且已完成初始化时才触发
    if (isOpen && paperId && isInitializedRef.current) {
      fetchCitationFormatWithFormat(citationFormat);
    }
  }, [citationFormat, isOpen, paperId]);

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowFormatDropdown(false);
      }
    };

    if (showFormatDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showFormatDropdown]);

  // 通用的获取引用格式函数
  const fetchCitationFormatWithFormat = async (format: CitationFormat) => {
    if (!paperId) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    try {
      const response = await apiGetAuth<{
        format: CitationFormat;
        formatted_text: string;
        download_formats: {
          bibtex: string;
          ris: string;
        };
      }>("/api/chat/citations/format", {
        params: {
          paper_id: paperId,
          format: format,
        },
        signal: abortController.signal,
      });

      // 只有请求没有被取消时才更新状态
      if (!abortController.signal.aborted && response.code === 200 && response.data) {
        setCitationData(response.data);
      }
    } catch (error: any) {
      // 如果是主动取消的请求，不显示错误
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('引用格式请求已取消');
        return;
      }
      console.error("获取引用格式失败:", error);
      // 如果是认证错误，显示提示
      if (error.isAuthError) {
        // 认证错误已经被request.ts自动处理，这里不需要额外处理
      }
    } finally {
      // 只有请求没有被取消时才清除加载状态
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-start justify-center z-50 pt-[10vh]">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 弹窗主体 */}
      <div className=" mt-[100px] relative bg-white shadow-lg flex flex-col w-[864px] h-[593px] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2]">
        {/* 引用标题 */}
        <div className="font-medium mt-[26px] ml-[32px] font-[500] text-[30px] text-[#333333]">
          引用
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute z-10 hover:opacity-70 transition-opacity flex items-center justify-center top-[31px] right-[31px] w-[18px] h-[18px] p-0 bg-transparent border-none cursor-pointer"
        >
          <img
            src="/paper/paper-critationclose.png"
            alt="关闭"
            className="w-full h-full object-contain"
          />
        </button>

        {/* 横线 */}
        <div className="w-[803px] h-[1px] bg-[#E0E1E5] rounded-[1px] mt-[26px] ml-[26px]" />

        {/* 选择区域 */}
        <div className="flex items-center justify-start mx-[30px] mt-[30px]">
          {/* 引用格式选择 */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => {
                setShowFormatDropdown(!showFormatDropdown);
              }}
              className="flex items-center justify-between w-[300px] h-[36px] bg-[#F7F8FA] rounded-[4px] border border-[#C8C9CC] px-[20px] text-base"
            >
              <span>{citationFormat}</span>
              <img
                src="/chat-page/chat-page-open.png"
                alt="下拉"
                width={10}
                height={6}
                className={`w-[10px] h-[6px] transition-transform duration-200 ${
                  showFormatDropdown ? "rotate-180" : ""
                }`}
              />
            </button>

            {showFormatDropdown && (
              <div className="absolute top-full left-0 bg-white shadow-lg z-10 w-[300px] border border-[#C8C9CC] border-t-0 rounded-b-[4px]">
                {citationFormats.map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      setCitationFormat(format);
                      setShowFormatDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 text-base text-[#333333]"
                  >
                    {format}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 引用内容区域 */}
        <div className="w-[804px] h-[100px] bg-[#F7F8FA] rounded-[4px] border border-[#C8C9CC] my-[20px] mx-auto mt-[20px] mb-0 p-[12px] overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="text-base text-[#999999] text-center leading-[76px]">
              加载中...
            </div>
          ) : (
            <div className="text-base text-[#333333] whitespace-pre-wrap">
              {citationData?.formatted_text || "暂无引用内容"}
            </div>
          )}
        </div>

        {/* 下载文字 */}
        <div className="ml-[30px] mt-[39px] font-[500] text-base text-[#333333]">
          下载
        </div>

        {/* 下载说明文字 */}
        <div className="ml-[30px] mt-[18px] text-base text-[#999999]">
          下载可以被引用管理软件(如 BibTex、EndNote、ProCite、RefWorks 和
          ReferenceManager)导入的 BibTex 或 RIS 格式的引用文件。
        </div>

        {/* 下载格式选择 */}
        <div className="flex items-center ml-[30px] mt-[25px]">
          {downloadFormats.map((format, index) => (
            <React.Fragment key={format}>
              {index > 0 && <div className="w-[39px]" />}
              <button
                onClick={() => setDownloadFormat(format as "BibTeX" | "RIS")}
                className="flex items-center"
              >
                {downloadFormat === format ? (
                  <img
                    src="/chat-page/point1.png"
                    alt="选中"
                    width={20}
                    height={20}
                    className="w-[20px] h-[20px]"
                  />
                ) : (
                  <div className="w-[20px] h-[20px] bg-white rounded-[10px] border border-[#C8C9CC]" />
                )}
                <span className="ml-[11px] text-base text-[#333333]">
                  {format}
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* 按钮区域 */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-end p-[30px]">
          {/* 取消按钮 */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-[128px] h-[40px] bg-white rounded-[20px] border border-[#C8C9CC] text-base text-[#666666] cursor-pointer mr-[20px]"
          >
            取消
          </button>
          {/* 确认按钮 */}
          <button
            onClick={handleConfirm}
            className="flex items-center justify-center w-[128px] h-[40px] bg-[#0D9488] rounded-[20px] text-base text-white border-none cursor-pointer hover:bg-[#0D9488] hover:text-white hover:scale-[1.01] transition-transform"
          >
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
