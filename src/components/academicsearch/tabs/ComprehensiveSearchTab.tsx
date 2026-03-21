"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SearchResult } from "../../../types/types";
import AuthorDisplay from "./AuthorDisplay";
import CitationModal from "./CitationModal";
import PaperCard from "./PaperCard";

interface ComprehensiveSearchTabProps {
  searchResults: {
    keyword: string;
    tags: string[];
    papers_zh: {
      total: number;
      page: number;
      page_size: number;
      items: SearchResult[];
      source: string;
    };
    papers_en: {
      total: number;
      page: number;
      page_size: number;
      items: SearchResult[];
      source: string;
    };
    scholars?: {
      total: number;
      page: number;
      page_size: number;
      items: any[];
      source: string;
    };
    patents?: {
      total: number;
      page: number;
      page_size: number;
      items: any[];
      source: string;
    };
  } | null;
  loading: boolean;
  searchKeyword: string;
  onViewMorePapers: () => void;
  onPaperClick: (paper: SearchResult) => void;
}

export default function ComprehensiveSearchTab({
  searchResults,
  loading,
  searchKeyword,
  onViewMorePapers,
  onPaperClick,
}: ComprehensiveSearchTabProps) {
  const [selectedPaper, setSelectedPaper] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | undefined>(undefined);

  const handleQuoteClick = (paper: SearchResult, event: React.MouseEvent) => {
    setSelectedPaper(paper);
    // 记录点击位置
    setClickPosition({
      x: event.clientX,
      y: event.clientY
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPaper(null);
    setClickPosition(undefined);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">搜索中...</div>
      </div>
    );
  }

  if (!searchResults) {
    return (
      <div className="text-center py-8 text-gray-500">请输入搜索关键词</div>
    );
  }

  // 验证 searchResults 结构是否正确
  if (
    !searchResults.papers_zh &&
    !searchResults.papers_en &&
    !searchResults.scholars &&
    !searchResults.patents
  ) {
    console.warn("searchResults 结构异常:", searchResults);
    return (
      <div className="text-center py-8 text-gray-500">
        搜索结果格式异常，请重试
      </div>
    );
  }

  const { papers_zh, papers_en, scholars, patents } = searchResults;

  // 安全访问数据，防止 undefined 错误
  const papersZhItems = papers_zh?.items || [];
  const papersEnItems = papers_en?.items || [];
  const scholarsItems = scholars?.items || [];
  const patentsItems = patents?.items || [];

  // 安全获取总数，防止 undefined 错误
  const papersZhTotal = papers_zh?.total || 0;
  const papersEnTotal = papers_en?.total || 0;
  // 学者总数：如果小于10则显示真实数据，如果大于等于10就显示10
  const scholarsTotal = scholars?.total ? (scholars.total < 10 ? scholars.total : 10) : 0;
  const patentsTotal = patents?.total || 0;

  return (
    <>
      <div className="mb-8 w-full max-w-none">
        {/* 中文发现论文列表 */}
        <div className="mb-8 w-full max-w-none">
          {/* 中文发现标题 - 总是显示 */}
          <div className="flex items-center mb-6">
            <h3 className="font-medium text-[20px] text-[#333333]">
              中文发现共{papersZhTotal}篇
            </h3>
            <button
              onClick={() => {
                // 跳转到中文发现页面
                if (typeof window !== 'undefined') {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', '中文发现');
                  url.searchParams.set('q', searchKeyword || '');
                  window.location.href = url.toString();
                }
              }}
              className="flex items-center justify-center ml-[10px] w-[20px] h-[20px] bg-[#CCCCCC] rounded-[10px] border-none cursor-pointer relative top-[2px]"
            >
              <ChevronRight
                className="w-[10px] h-[10px]"
              />
            </button>
          </div>
          {/* 只有当有论文时才显示论文列表 */}
          {papersZhItems.length > 0 && (
            <div className="space-y-5">
              {papersZhItems.map((paper, index) => (
                <PaperCard
                  key={paper.id}
                  paper={paper}
                  onQuoteClick={handleQuoteClick}
                  onClick={onPaperClick}
                  displayMode="chinese"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 外文发现论文结果 */}
      <div className="mb-8 w-full max-w-none">
        {/* 外文发现标题 - 总是显示 */}
        <div className="flex items-center mb-6">
          <h3 className="font-medium text-[20px] text-[#333333]">
            外文发现共{papersEnTotal}篇
          </h3>
          <button
            onClick={() => {
              // 跳转到外文发现页面
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', '外文发现');
                url.searchParams.set('q', searchKeyword || '');
                window.location.href = url.toString();
              }
            }}
            className="flex items-center justify-center ml-[10px] w-[20px] h-[20px] bg-[#CCCCCC] rounded-[10px] border-none cursor-pointer relative top-[2px]"
          >
            <ChevronRight
              className="w-[10px] h-[10px]"
            />
          </button>
        </div>
        {/* 只有当有论文时才显示论文列表 */}
        {papersEnItems.length > 0 && (
          <div className="space-y-5">
            {papersEnItems.map((paper, index) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                onQuoteClick={handleQuoteClick}
                onClick={onPaperClick}
                displayMode="foreign"
              />
            ))}
          </div>
        )}
      </div>

      {/* 无结果 */}
      {!papersZhItems.length &&
        !papersEnItems.length &&
        <div className="text-center py-8 text-gray-500">未找到相关结果</div>
      }

      {/* 引用弹窗 */}
      <CitationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        paperTitle={selectedPaper?.title_zh || selectedPaper?.title || ''}
        authors={selectedPaper?.authors || []}
        year={selectedPaper?.year}
        publicationName={
          (selectedPaper as any)?.publication_name ||
          selectedPaper?.venue?.raw ||
          selectedPaper?.venue?.raw_zh
        }
        paperId={selectedPaper?.id}
      />
    </>
  );
}
