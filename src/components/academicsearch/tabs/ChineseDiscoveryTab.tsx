"use client";
import React, { useState, useEffect, useRef } from "react";
import { SearchResult } from "../../../types/types";
import AuthorDisplay from "./AuthorDisplay";
import CitationModal from "./CitationModal";

interface PapersTabProps {
  searchResults: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: SearchResult[];
  } | null;
  loading: boolean;
  onPaperClick: (paper: SearchResult) => void;
  onLoadMore?: (page: number) => void;
}

export default function ChineseDiscoveryTab({
  searchResults,
  loading,
  onPaperClick,
  onLoadMore,
}: PapersTabProps) {
  const [displayedItems, setDisplayedItems] = useState<SearchResult[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | undefined>(undefined);
  const loaderRef = useRef<HTMLDivElement>(null);
  const paperRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  // 当搜索结果更新时，重置或更新显示的数据
  useEffect(() => {
    if (searchResults?.items) {
      // 如果是新搜索（页数为1），重置数据；否则追加数据
      if (searchResults.page === 1) {
        setDisplayedItems(searchResults.items);
        // 重置 ref 数组
        paperRefs.current = new Array(searchResults.items.length).fill(null);
      } else {
        // 追加新论文，避免重复
        setDisplayedItems(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = searchResults.items.filter(item => !existingIds.has(item.id));
          return [...prev, ...newItems];
        });
      }
    }
  }, [searchResults?.items, searchResults?.page]);

  // 监听滚动事件，实现无限滚动
  useEffect(() => {
    const currentLoaderRef = loaderRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore && searchResults && displayedItems.length < searchResults.total) {
          loadMorePapers();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '200px', // 提前200px开始加载
      }
    );

    if (currentLoaderRef) {
      observer.observe(currentLoaderRef);
    }

    return () => {
      if (currentLoaderRef) {
        observer.unobserve(currentLoaderRef);
      }
    };
  }, [isLoadingMore, searchResults, displayedItems.length]);

  // 加载更多论文
  const loadMorePapers = async () => {
    if (!searchResults || isLoadingMore || displayedItems.length >= searchResults.total) {
      return;
    }

    setIsLoadingMore(true);
    // 基于已加载的论文数量计算下一页
    const nextPage = Math.ceil(displayedItems.length / searchResults.page_size) + 1;

    try {
      if (onLoadMore) {
        await onLoadMore(nextPage);
        setIsLoadingMore(false);
      } else {
        setIsLoadingMore(false);
      }
    } catch (error) {
      console.error("加载更多中文论文失败:", error);
      setIsLoadingMore(false);
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">搜索中...</div>
      </div>
    );
  }

  if (!searchResults) {
    return null;
  }

  const { total } = searchResults;

  if (displayedItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        未找到相关论文
      </div>
    );
  }

  return (
    <>
      <div
        className="font-medium text-[18px] sm:text-[20px] text-[#333333] mb-8"
      >
        共找到 {total} 个结果
      </div>
      <div className="mb-8">
        <div className="space-y-4">
          {displayedItems.map((paper, index) => (
            <div
              key={paper.id}
              ref={el => {
                paperRefs.current[index] = el;
              }}
              className="w-full min-h-[240px] sm:min-h-[270px] bg-white rounded-[20px] border border-[#E0E1E5] hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer p-4 sm:p-[21px] relative"
              onClick={(e) => {
                // 如果点击的是收藏按钮，不触发论文点击
                if ((e.target as HTMLElement).closest('.favorite-button')) {
                  return;
                }
                onPaperClick(paper);
              }}
            >
              {/* 引用按钮 */}
              <div
                className="favorite-button absolute flex items-center justify-center cursor-pointer hover:shadow-md transition-all duration-200 w-[52px] sm:w-[56px] h-[34px] sm:h-[36px] bg-white border border-[#C8C9CC] rounded-[18px] bottom-[15px] sm:bottom-[20px] right-[15px] sm:right-[20px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuoteClick(paper, e);
                }}
              >
                <img
                  src="/paper/paper-quote@2x.png"
                  alt="引用"
                  className="w-[15px] h-[14px] sm:w-[17px] sm:h-[16px]"
                />
              </div>
              {/* 标题显示 */}
              <h4 className="font-medium text-[18px] sm:text-[20px] mb-2">
                {paper.title_zh || paper.title}
              </h4>
              {/* 显示前两个作者，包含首字母头像 */}
              <AuthorDisplay
                authors={(paper.authors as any) || []}
                publicationName={(paper as any)?.periodical_title || paper.publication_name}
                abstract={paper.abstract}
                publicationDate={(paper as any)?.publish_year || paper.year}
              />
            </div>
          ))}
        </div>

        {/* 滚动触发器 - 无限滚动 */}
        {displayedItems.length < total && (
          <div
            ref={loaderRef}
            className="flex justify-center items-center py-2 min-h-[40px]"
          >
            {isLoadingMore && (
              <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        )}
      </div>

      {/* 引用弹窗 */}
      <CitationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        paperTitle={selectedPaper?.title_zh || selectedPaper?.title || ''}
        authors={selectedPaper?.authors || []}
        year={selectedPaper?.year}
        publicationName={
          (selectedPaper as any)?.periodical_title ||
          (selectedPaper as any)?.publication_name ||
          selectedPaper?.venue?.raw ||
          selectedPaper?.venue?.raw_zh
        }
        paperId={selectedPaper?.id}
      />
    </>
  );
}