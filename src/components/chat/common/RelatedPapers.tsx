"use client";
import React, { useState } from "react";
import CitationModal from "@/components/academicsearch/tabs/CitationModal";

interface Author {
  name: string;
  name_zh?: string;
}


interface RelatedPaper {
  index: number;
  id: string;
  title: string;
  authors: (string | Author)[];
  publication_name?: string;
  publication_year?: number;
  abstract?: string;
  doi?: string;
  source: string;
  source_id: string;
}

interface RelatedPapersProps {
  papers?: RelatedPaper[];
  keywords?: string[];
  search_query?: string;
  conversationId?: string;
  isVisible: boolean;
  className?: string;
  messageId?: string;
}

export default function RelatedPapers({
  papers,
  keywords,
  search_query,
  conversationId,
  isVisible,
  className = "",
  messageId,
}: RelatedPapersProps) {
  // 引用弹窗状态
  const [isCitationModalOpen, setIsCitationModalOpen] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<RelatedPaper | null>(null);

  // 处理引用点击
  const handleCitationClick = (paper: RelatedPaper) => {
    setSelectedPaper(paper);
    setIsCitationModalOpen(true);
  };

  // 关闭引用弹窗
  const handleCloseCitationModal = () => {
    setIsCitationModalOpen(false);
    setSelectedPaper(null);
  };

  // 如果组件不可见，不渲染内容
  if (!isVisible) {
    return <></>;
  }

  return (
    <>
      <div className="overflow-visible w-full" style={{ backgroundColor: 'transparent' }}>
        <div className="pl-[clamp(20px,4vw,40px)] pr-[clamp(10px,2vw,20px)]">
          {!papers || papers.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-gray-400 mb-2">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-500">暂无相关论文</p>
                <p className="text-gray-400 text-sm mt-1">等待AI回复生成相关论文推荐</p>
              </div>
            </div>
          ) : (
            // 修复：移除了多余的闭合 div 标签
            <div className="mt-[10px]">
              {papers.map((paper, index) => (
                <div key={paper.id}>
                  <div
                    data-message-id={messageId && messageId !== "undefined" && messageId !== "unknown" ? messageId : null}
                    data-paper-index={paper.index}
                    className="paper-card paper-card-bg mb-7 w-full max-w-[500px] h-full max-h-[280px]"
                  >
                    {/* 论文内容 */}
                    <div className="px-4 sm:px-6" style={{ paddingTop: '16px' }}>
                      <div className="flex items-start mt-3">
                        {/* 蓝色圆点 */}
                        <div className="blue-dot mt-2 ml-2.5 mr-2.5" />

                        {/* 引用标记 */}
                        <span className="reference-tag mt-0.5 mr-2.5 text-[clamp(12px,2vw,14px)]">
                          [{paper.index}]
                        </span>

                        <div className="flex-1 min-w-0">
                          <h4 className="mb-4 truncate font-semibold text-[clamp(14px,2.5vw,18px)] text-text-primary leading-[1.4]">
                            {paper.title}
                          </h4>

                          {/* 作者和发表时间在同一行 */}
                          {(paper.authors && paper.authors.length > 0) && (
                            <div className="authors-container text-[clamp(11px,1.8vw,14px)] -ml-11">
                              {/* 作者列表 */}
                              <div className="flex items-center">
                                {paper.authors.slice(0, 2).map((author, authorIndex) => (
                                  <React.Fragment key={authorIndex}>
                                    <span className="truncate">{typeof author === "string" ? author : author.name}</span>
                                    {authorIndex === 0 && paper.authors.length > 1 && (
                                      <div className="author-divider" />
                                    )}
                                  </React.Fragment>
                                ))}
                                {paper.authors.length > 2 && (
                                  <span className="ml-0.5 flex-shrink-0">...</span>
                                )}
                              </div>

                              {/* 发表时间在作者右边5px处 */}
                              {paper.publication_year && (
                                <span className="ml-1.5 flex-shrink-0">
                                  ({paper.publication_year})
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 摘要区域 - 在作者下方15px */}
                      <div className="abstract-container abstract-container-sm ml-2.5 mt-4">
                        <span className="abstract-text text-[clamp(12px,2vw,16px)]">
                          {paper.abstract || '暂无摘要'}
                        </span>
                      </div>

                      {/* 分隔线 - 在摘要下方10px */}
                      <div className="divider-horizontal  mt-5 w-[calc(100%-50px)]" />

                      {/* 按钮组 - 在分隔线下方10px */}
                      <div className="flex items-center gap-2.5 ml-2.5 mt-5">
                        {/* 引用按钮 */}
                        <div
                          onClick={() => handleCitationClick(paper)}
                          className="action-button flex-shrink-0 pr-4"
                        >
                          <img
                            src="/paper/quote1.png"
                            alt="quote"
                            className="icon-sm"
                          />
                          <span className="ml-2.5 text-base text-gray-500">
                            引用
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 引用弹窗 */}
      {selectedPaper && (
        <CitationModal
          isOpen={isCitationModalOpen}
          onClose={handleCloseCitationModal}
          paperTitle={selectedPaper.title}
          authors={selectedPaper.authors}
          year={selectedPaper.publication_year}
          publicationName={selectedPaper.publication_name}
          paperId={selectedPaper.id}
        />
      )}
    </>
  );
}