"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { PatentResult } from "../../../types/types";

interface PatentsTabProps {
  searchResults: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: PatentResult[];
  } | null;
  loading: boolean;
  onPatentClick: (patent: PatentResult) => void;
  onLoadMore: (page: number) => void;
}

export default function GlobalPatentsTab({
  searchResults,
  loading,
  onPatentClick,
  onLoadMore,
}: PatentsTabProps) {
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastPageRef = useRef<number>(1);

  // 处理滚动到底部的加载逻辑
  const handleLoadMore = useCallback(async () => {
    if (!searchResults || loadingMore || loading) return;

    const { page, total_pages } = searchResults;
    const nextPage = page + 1;
    lastPageRef.current = page;

    // 检查是否还有下一页
    if (nextPage > total_pages) {
      return;
    }

    setLoadingMore(true);
    try {
      await onLoadMore(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }, [searchResults, loadingMore, loading, onLoadMore]);

  // 设置 Intersection Observer 来检测滚动到底部
  useEffect(() => {
    if (!loadMoreRef.current || loadingMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !loadingMore && !loading) {
          handleLoadMore();
        }
      },
      {
        threshold: 0.1, // 当目标元素进入视口10%时触发
        rootMargin: "100px", // 提前100px触发，提升用户体验
      }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleLoadMore, loadingMore, loading]);

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

  const { items, page, total_pages, total } = searchResults;

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        未找到相关专利
      </div>
    );
  }

  // 检查是否已加载所有页面
  const hasLoadedAllPages = page >= total_pages;

  return (
    <div className="mb-15">
      {/* 顶部显示总专利数 */}
      <div className="font-medium text-[20px] text-[#333333] mb-8">
        共找到 {total.toLocaleString()} 条专利
      </div>

      <div className="space-y-4">
        {items.map((patent, index) => (
          <div
            key={patent.id}
            className="hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer w-full min-h-[100px] sm:min-h-[110px] md:min-h-[120px] lg:min-h-[127px] bg-white border border-[#E0E1E5] rounded-[20px] p-0 flex flex-col justify-start"
            onClick={() => onPatentClick(patent)}
          >
            {/* 第一行：专利标题和标签 */}
            <div className="flex items-center mt-[15px] sm:mt-[18px] md:mt-[20px] lg:mt-[21px] ml-[15px] sm:ml-[18px] md:ml-[20px] lg:ml-[21px]">
              <h4
                className="font-medium text-base sm:text-lg md:text-xl m-0 overflow-hidden text-ellipsis whitespace-nowrap flex-1 text-[#333333]"
              >
                {patent.title_zh || patent.title}
              </h4>
              <div
                className="relative w-[36px] sm:w-[40px] md:w-[42px] h-[18px] sm:h-[20px] ml-[6px] sm:ml-[8px] md:ml-[9px] flex-shrink-0"
              >
                {/* 蓝色底色背景 */}
                <div
                  className="absolute top-0 left-0 w-full h-full bg-[#3B80FF] rounded-[3px] sm:rounded-[4px] opacity-20"
                />
                {/* 专利文字 */}
                <span
                  className="absolute top-0 left-0 w-full h-full inline-flex items-center justify-center font-medium text-xs sm:text-sm text-[#3B80FF]"
                >
                  专利
                </span>
              </div>
            </div>

            {/* 第二行：专业名称 */}
            <div className="text-sm sm:text-base text-[#666666] mt-[10px] sm:mt-[12px] md:mt-[15px] ml-[15px] sm:ml-[18px] md:ml-[20px] lg:ml-[21px] mb-[10px] overflow-hidden text-ellipsis whitespace-nowrap">
              专业名称：{patent.abstract ? (patent.abstract.substring(0, 40) + (patent.abstract.length > 40 ? "..." : "")) : ""}
            </div>

            {/* 第三行：年份 */}
            <div className="text-sm sm:text-base text-[#666666] mt-[2px] sm:mt-[3px] ml-[15px] sm:ml-[18px] md:ml-[20px] lg:ml-[21px] mb-[15px]">
              年份： {patent.year}
            </div>
          </div>
        ))}

        {/* 加载更多触发元素和状态显示 */}
        <div ref={loadMoreRef} className="w-full py-4">
          {loadingMore && (
            <div className="flex items-center justify-center py-4">
              <div className="text-gray-500">加载更多专利中...</div>
            </div>
          )}

          {!loadingMore && !hasLoadedAllPages && items.length > 0 && (
            <div className="text-center py-2 text-gray-400 text-sm">
              已显示 {items.length} / {searchResults.total} 条专利，继续滚动加载更多
            </div>
          )}

          {!loadingMore && hasLoadedAllPages && items.length > 0 && (
            <div className="text-center py-2 text-gray-400 text-sm">
              已显示全部 {items.length} 条专利
            </div>
          )}
        </div>
      </div>
    </div>
  );
}