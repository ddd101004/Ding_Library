"use client";
import React, { useState } from "react";
import { SearchResult, ScholarResult, PatentResult } from "../../../types/types";
import AuthorDisplay from "./AuthorDisplay";
import CitationModal from "./CitationModal";
import PaperCard from "./PaperCard";
import { ScholarAvatar } from "./AuthorAvatar";

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
    scholars: {
      total: number;
      page: number;
      page_size: number;
      items: ScholarResult[];
      source: string;
    };
    patents: {
      total: number;
      page: number;
      page_size: number;
      items: PatentResult[];
      source: string;
    };
  } | null;
  loading: boolean;
  searchKeyword: string;
  onViewMorePapers: () => void;
  onViewMoreScholars: () => void;
  onViewMorePatents: () => void;
  onPaperClick: (paper: SearchResult) => void;
  onScholarClick: (scholar: ScholarResult) => void;
  onPatentClick: (patent: PatentResult) => void;
}

export default function ComprehensiveSearchTab({
  searchResults,
  loading,
  searchKeyword,
  onViewMorePapers,
  onViewMoreScholars,
  onViewMorePatents,
  onPaperClick,
  onScholarClick,
  onPatentClick,
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
              <img
                src="/paper/paper-clickopen.png"
                alt="查看更多中文论文"
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
            <img
              src="/paper/paper-clickopen.png"
              alt="查看更多外文论文"
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

      {/* 专利结果 */}
      {patentsItems.length > 0 && (
        <div className="mb-[30px] w-full max-w-none">
          <div className="flex items-center mb-6">
            <h3 className="font-medium text-[20px] text-[#333333]">
              全球专利共{patentsTotal}个
            </h3>
            <button
              onClick={onViewMorePatents}
              className="flex items-center justify-center ml-[10px] w-[20px] h-[20px] bg-[#CCCCCC] rounded-[10px] border-none cursor-pointer relative top-[2px]"
            >
              <img
                src="/paper/paper-clickopen.png"
                alt="查看更多专利"
                className="w-[10px] h-[10px]"
              />
            </button>
          </div>
          <div className="space-y-4">
            {patentsItems.map((patent, index) => (
              <div
                key={patent.id}
                className="hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer w-full min-h-[100px] sm:min-h-[110px] md:min-h-[120px] lg:min-h-[127px] bg-white border border-[#E0E1E5] rounded-[20px] p-0 flex flex-col justify-start"
                onClick={() => onPatentClick(patent)}
              >
                {/* 第一行：专利标题和标签 */}
                <div className="flex items-center mt-[15px] sm:mt-[18px] md:mt-[20px] lg:mt-[21px] ml-[15px] sm:ml-[18px] md:ml-[20px] lg:ml-[21px]">
                  <h4 className="font-medium text-base sm:text-lg md:text-xl m-0 overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-[#333333]">
                    {patent.title_zh || patent.title}
                  </h4>
                  <div className="relative w-[36px] sm:w-[40px] md:w-[42px] h-[18px] sm:h-[20px] ml-[6px] sm:ml-[8px] md:ml-[9px] flex-shrink-0">
                    {/* 绿色底色背景 */}
                    <div className="absolute top-0 left-0 w-full h-full bg-[#0D9488] rounded-[3px] sm:rounded-[4px] opacity-20" />
                    {/* 专利文字 */}
                    <span className="absolute top-0 left-0 w-full h-full inline-flex items-center justify-center font-medium text-xs sm:text-sm text-[#0D9488]">
                      专利
                    </span>
                  </div>
                </div>

                {/* 第二行：专业名称 */}
                <div className="text-sm sm:text-base text-[#666666] mt-[10px] sm:mt-[12px] md:mt-[15px] ml-[15px] sm:ml-[18px] md:ml-[20px] lg:ml-[21px] mb-[10px] overflow-hidden text-ellipsis whitespace-nowrap">
                  专业名称：
                  {patent.abstract
                    ? patent.abstract.substring(0, 40) +
                      (patent.abstract.length > 40 ? "..." : "")
                    : ""}
                </div>

                {/* 第三行：年份 */}
                <div className="text-sm sm:text-base text-[#666666] mt-[2px] sm:mt-[3px] ml-[15px] sm:ml-[18px] md:ml-[20px] lg:ml-[21px] mb-[15px]">
                  年份: {patent.year}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 学者结果 - 在综合搜索中 */}
      {scholarsItems.length > 0 && (
        <div className="mb-8 w-full max-w-none">
          <div className="flex items-center mb-6">
            <h3 className="font-medium text-[20px] text-[#333333]">
              学者共 {scholarsTotal}个
            </h3>
            <button
              onClick={onViewMoreScholars}
              className="flex items-center justify-center ml-[10px] w-[20px] h-[20px] bg-[#CCCCCC] rounded-[10px] border-none cursor-pointer relative top-[2px]"
            >
              <img
                src="/paper/paper-clickopen.png"
                alt="查看更多学者"
                className="w-[10px] h-[10px]"
              />
            </button>
          </div>
          <div className="w-full">
            {scholarsItems.length > 0 && (
              <div className="flex flex-wrap gap-[16px] sm:gap-[18px] md:gap-[20px] w-full">
                {scholarsItems.map((scholar, index) => {
                  return (
                    <div
                      key={scholar.id}
                      className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white rounded-[20px] border border-[#E0E1E5] p-3 sm:p-4 md:p-6 flex items-center shadow-[0px_2px_20px_0px_rgba(89,106,178,0.2)]"
                      style={{
                        width: "clamp(280px, calc(33.333% - 11px), 400px)",
                        height: "clamp(100px, 160px, 160px)",
                        flex: "1 1 clamp(280px, calc(33.333% - 11px), 400px)",
                        maxWidth: "400px",
                        minWidth: "280px",
                      }}
                      onClick={() => onScholarClick(scholar)}
                    >
                            {/* 学者头像 */}
                            <ScholarAvatar
                              scholar={scholar}
                              size="large"
                            />

                      {/* 学者信息 */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        {/* 学者姓名 - 使用宽度限制 */}
                        <h4
                          className="font-medium text-[16px] sm:text-[18px] md:text-[20px] mb-[6px] sm:mb-[8px] md:mb-[9px]"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {scholar.name_zh || scholar.name || ""}
                        </h4>

                        {/* 机构信息 - 使用宽度限制 */}
                        <div
                          className="text-[14px] sm:text-[15px] md:text-[16px] text-[#333333] mb-[6px] sm:mb-[8px] md:mb-[9px]"
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {scholar.org_zh ||
                            scholar.org ||
                            scholar.orgs?.[0] ||
                            "未知机构"}
                        </div>

                        {/* 被引用数 */}
                        <div className="text-[14px] sm:text-[15px] md:text-[16px] text-[#999999] flex items-center">
                          被引用数
                          <span className="ml-[6px] sm:ml-[8px] md:ml-[9px]">
                            {scholar.n_citation || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 无结果 */}
      {!papersZhItems.length &&
        !papersEnItems.length &&
        !scholarsItems.length &&
        !patentsItems.length && (
          <div className="text-center py-8 text-gray-500">未找到相关结果</div>
        )}

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
