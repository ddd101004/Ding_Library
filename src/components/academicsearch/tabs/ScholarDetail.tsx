"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { apiGet } from "@/api/request";

interface ScholarDetailProps {
  scholar: {
    id: string;
    name: string;
    name_zh?: string;
    org: string;
    org_zh?: string;
    position?: string;
    bio?: string;
    education?: string;
    work?: string;
    papers?: Array<{
      id: string;
      title: string;
      title_zh?: string;
      authors: string[];
      year: number;
      venue: string;
      n_citation?: number;
      abstract?: string;
    }>;
  };
  onBack: () => void;
  isSidebarOpen?: boolean;
  isSmallScreen?: boolean;
}

// 论文数据类型
interface PaperData {
  id: string;
  paper_aminer_id: string;
  title: string;
  title_zh: string;
}

// 专利数据类型
interface PatentData {
  id: string;
  patent_aminer_id: string;
  title: string;
  title_zh: string;
  abstract: string;
  abstract_zh: string;
  publication_date: string;
  inventor: string[];
  assignee: string;
}

export default function ScholarDetail({ scholar, onBack, isSidebarOpen, isSmallScreen }: ScholarDetailProps) {
  const [activeTab, setActiveTab] = useState<"papers" | "patents">("papers");
  const [papersData, setPapersData] = useState<{
    items: PaperData[];
    total: number;
    page: number;
    total_pages: number;
    loading: boolean;
    loadingMore: boolean;
  }>({
    items: [],
    total: 0,
    page: 1,
    total_pages: 0,
    loading: false,
    loadingMore: false,
  });
  const [patentsData, setPatentsData] = useState<{
    items: PatentData[];
    total: number;
    page: number;
    total_pages: number;
    loading: boolean;
    loadingMore: boolean;
  }>({
    items: [],
    total: 0,
    page: 1,
    total_pages: 0,
    loading: false,
    loadingMore: false,
  });

  const papersLoaderRef = useRef<HTMLDivElement>(null);
  const patentsLoaderRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 获取论文数据
  const fetchPapers = async (page: number = 1, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setPapersData(prev => ({ ...prev, loadingMore: true }));
    } else {
      setPapersData(prev => ({ ...prev, loading: true }));
    }

    try {
      const response = await apiGet<{
        total: number;
        page: number;
        size: number;
        total_pages: number;
        items: PaperData[];
      }>(`/api/aminer/scholars/${scholar.id}/papers?page=${page}&size=10`);

      if (response.code === 200 && response.data) {
        if (isLoadMore) {
          // 追加数据模式
          setPapersData(prev => ({
            ...prev,
            items: [...prev.items, ...response.data.items],
            page: response.data.page,
            total_pages: response.data.total_pages,
            loadingMore: false,
          }));
        } else {
          // 替换数据模式
          setPapersData({
            items: response.data.items,
            total: response.data.total,
            page: response.data.page,
            total_pages: response.data.total_pages,
            loading: false,
            loadingMore: false,
          });
        }
      }
    } catch (error) {
      console.error("获取学者论文失败:", error);
      setPapersData(prev => ({
        ...prev,
        loading: false,
        loadingMore: false,
      }));
    }
  };

  // 加载更多论文
  const loadMorePapers = useCallback(async () => {
    if (papersData.loadingMore || papersData.loading || !papersData.items.length) {
      return;
    }

    const { page, total_pages } = papersData;

    // 检查是否还有下一页
    if (page >= total_pages) {
      return;
    }

    await fetchPapers(page + 1, true);
  }, [papersData.loadingMore, papersData.loading, papersData.items.length, papersData.page, papersData.total_pages]);

  // 加载更多专利
  const loadMorePatents = useCallback(async () => {
    if (patentsData.loadingMore || patentsData.loading || !patentsData.items.length) {
      return;
    }

    const { page, total_pages } = patentsData;

    // 检查是否还有下一页
    if (page >= total_pages) {
      return;
    }

    await fetchPatents(page + 1, true);
  }, [patentsData.loadingMore, patentsData.loading, patentsData.items.length, patentsData.page, patentsData.total_pages]);

  // 设置 Intersection Observer 来检测滚动到底部
  useEffect(() => {
    // 清理之前的 observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // 根据当前活跃的标签选择对应的 loader ref 和回调函数
    let loaderRef: HTMLDivElement | null = null;
    let loadMoreCallback: () => void;
    let loadingMore: boolean;
    let loading: boolean;

    if (activeTab === "papers") {
      loaderRef = papersLoaderRef.current;
      loadMoreCallback = loadMorePapers;
      loadingMore = papersData.loadingMore;
      loading = papersData.loading;
    } else if (activeTab === "patents") {
      loaderRef = patentsLoaderRef.current;
      loadMoreCallback = loadMorePatents;
      loadingMore = patentsData.loadingMore;
      loading = patentsData.loading;
    } else {
      return;
    }

    if (!loaderRef || loadingMore || loading) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && !loadingMore && !loading) {
          loadMoreCallback();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    observerRef.current.observe(loaderRef);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMorePapers, loadMorePatents, papersData.loadingMore, papersData.loading, patentsData.loadingMore, patentsData.loading, activeTab]);

  // 获取专利数据
  const fetchPatents = async (page: number = 1, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setPatentsData(prev => ({ ...prev, loadingMore: true }));
    } else {
      setPatentsData(prev => ({ ...prev, loading: true }));
    }

    try {
      const response = await apiGet<{
        total: number;
        page: number;
        size: number;
        total_pages: number;
        items: PatentData[];
      }>(`/api/aminer/scholars/${scholar.id}/patents?page=${page}&size=10`);

      if (response.code === 200 && response.data) {
        if (isLoadMore) {
          // 追加数据模式
          setPatentsData(prev => ({
            ...prev,
            items: [...prev.items, ...response.data.items],
            page: response.data.page,
            total_pages: response.data.total_pages,
            loadingMore: false,
          }));
        } else {
          // 替换数据模式
          setPatentsData({
            items: response.data.items,
            total: response.data.total,
            page: response.data.page,
            total_pages: response.data.total_pages,
            loading: false,
            loadingMore: false,
          });
        }
      }
    } catch (error) {
      console.error("获取学者专利失败:", error);
      setPatentsData(prev => ({
        ...prev,
        loading: false,
        loadingMore: false,
      }));
    }
  };

  // 组件挂载时默认获取论文数据
  useEffect(() => {
    if (scholar.id) {
      fetchPapers();
    }
  }, [scholar.id]);

  // 切换标签时获取对应数据
  useEffect(() => {
    if (activeTab === "papers" && scholar.id && papersData.items.length === 0) {
      fetchPapers();
    } else if (activeTab === "patents" && scholar.id && patentsData.items.length === 0) {
      fetchPatents();
    }
  }, [activeTab, scholar.id]);

  return (
    <div className="w-full px-[20px] sm:px-[30px] md:px-[40px] lg:px-[50px] min-h-screen">
      {/* 返回按钮区域 */}
      <div
        className="flex items-center cursor-pointer hover:opacity-80 transition-opacity duration-200 mb-[20px] sm:mb-[23px]"
        onClick={onBack}
      >
        <img
          src="/paper/paper-details.png"
          alt="返回"
          className="w-[6px] h-[10px] mr-[8px]"
        />
        <span className="text-[14px] text-[#666666]">
          返回
        </span>
      </div>

      {/* 分割线 */}
      <div
        style={{
          width: "100%",
          height: "1px",
          background: "#E0E1E5",
          marginBottom: "40px",
        }}
      />

      <div className="flex relative">
        {/* 左侧个人信息和详细信息 - 响应式 */}
        <div className="mr-[20px] sm:mr-[25px] md:mr-[30px] sticky top-[20px] h-fit max-h-[calc(100vh-40px)] overflow-y-auto scrollbar-thin">
          {/* 学者个人信息框 */}
          <div className="w-[320px] sm:w-[400px] md:w-[480px] lg:w-[510px] h-[180px] sm:h-[190px] md:h-[200px] bg-gradient-to-br from-blue-100/30 to-blue-100/80 rounded-[20px] p-[20px] sm:p-[25px] mb-[20px] sm:mb-[30px] relative">
            {/* 学者头像 */}
            <img
              src="/paper/paper-scholar-avartar.png"
              alt="学者头像"
              className="absolute top-[20px] sm:top-[25px] md:top-[30px] left-[20px] sm:left-[25px] md:left-[30px] w-[70px] h-[70px] sm:w-[85px] sm:h-[85px] md:w-[100px] md:h-[100px] rounded-full object-cover"
            />

            <h2 className="font-semibold text-[18px] sm:text-[20px] md:text-[24px] text-[#333333] mb-[6px] sm:mb-[8px] ml-[90px] sm:ml-[100px] md:ml-[140px]">
              {scholar.name_zh || scholar.name}
            </h2>
            <div className="text-[14px] sm:text-[15px] md:text-[16px] text-[#666666] mb-[4px] sm:mb-[6px] ml-[90px] sm:ml-[100px] md:ml-[140px]">
              {scholar.org_zh || scholar.org}
            </div>
            {scholar.position && (
              <div className="text-[14px] sm:text-[15px] md:text-[16px] text-[#666666] ml-[90px] sm:ml-[100px] md:ml-[140px]">
                {scholar.position}
              </div>
            )}
          </div> {/* 修复：闭合学者信息框的div */}
          
          {/* 个人简介部分 */}
          <div>
            <h3 className="font-medium text-[18px] sm:text-[19px] md:text-[20px] text-[#333333] mb-[15px] sm:mb-[20px]">
              个人简介
            </h3>
            <div className="w-[300px] sm:w-[380px] md:w-[450px] lg:w-[480px] h-[100px] sm:h-[120px] md:h-[138px] text-[14px] sm:text-[15px] md:text-[16px] text-[#666666] leading-[1.6] overflow-y-auto overflow-x-hidden pr-[10px] scrollbar-thin">
              {scholar.bio || "暂无个人简介信息"}
            </div>
          </div>

          {/* 分割线 */}
          <div className="w-full h-[1px] bg-[#E0E1E5] my-[15px] sm:my-[20px] md:my-[23px]" />

          {/* 教育背景部分 */}
          <div>
            <h3 className="font-medium text-[18px] sm:text-[19px] md:text-[20px] text-[#333333] mb-[15px] sm:mb-[20px]">
              教育背景
            </h3>
            <div className="w-[300px] sm:w-[380px] md:w-[450px] lg:w-[480px] h-[100px] sm:h-[120px] md:h-[138px] text-[14px] sm:text-[15px] md:text-[16px] text-[#666666] leading-[1.6] overflow-y-auto overflow-x-hidden pr-[10px] scrollbar-thin">
              {scholar.education || "暂无教育背景信息"}
            </div>
          </div>

          {/* 分割线 */}
          <div className="w-full h-[1px] bg-[#E0E1E5] my-[15px] sm:my-[20px] md:my-[23px]" />

          {/* 工作经历部分 */}
          <div>
            <h3 className="font-medium text-[18px] sm:text-[19px] md:text-[20px] text-[#333333] mb-[15px] sm:mb-[20px]">
              工作经历
            </h3>
            <div className="w-[300px] sm:w-[380px] md:w-[450px] lg:w-[480px] h-[100px] sm:h-[120px] md:h-[138px] text-[14px] sm:text-[15px] md:text-[16px] text-[#666666] leading-[1.6] overflow-y-auto overflow-x-hidden pr-[10px] scrollbar-thin">
              {scholar.work || "暂无工作经历信息"}
            </div>
          </div>
        </div>

        {/* 竖线 */}
        <div className="w-[1px] h-[600px] sm:h-[750px] md:h-[900px] bg-[#E0E1E5] mr-[20px] sm:mr-[25px] md:mr-[29px]" />

        {/* 右侧论文和专利部分 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center mb-[15px] sm:mb-[20px]">
            {/* 论文标签 */}
            <div
              className={`cursor-pointer transition-all duration-200 border-b-2 ${
                activeTab === "papers"
                  ? "font-semibold text-[#1890ff] border-[#1890ff]"
                  : "font-medium text-[#333333] border-transparent"
              } pb-[2px] text-[16px] sm:text-[18px] md:text-[20px]`}
              onClick={() => setActiveTab("papers")}
            >
              论文
            </div>

            {/* 共多少篇 - 论文部分 */}
            <span className="ml-[6px] sm:ml-[8px] md:ml-[9px] text-[14px] sm:text-[15px] md:text-[16px] text-[#666666]">
              共{papersData.total}篇
            </span>

            {/* 专利标签 */}
            <div
              className={`cursor-pointer transition-all duration-200 border-b-2 ml-[30px] sm:ml-[40px] md:ml-[59px] ${
                activeTab === "patents"
                  ? "font-semibold text-[#1890ff] border-[#1890ff]"
                  : "font-medium text-[#333333] border-transparent"
              } pb-[2px] text-[16px] sm:text-[18px] md:text-[20px]`}
              onClick={() => setActiveTab("patents")}
            >
              专利
            </div>

            {/* 共多少篇 - 专利部分 */}
            <span className="ml-[6px] sm:ml-[8px] md:ml-[9px] text-[14px] sm:text-[15px] md:text-[16px] text-[#666666]">
              共{patentsData.total}篇
            </span>
          </div>

          {/* 论文和专利列表 */}
          <div className="space-y-0 w-full max-w-none">
            {/* 加载状态 - 首次加载 */}
            {(papersData.loading || patentsData.loading) && (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-gray-500">加载中...</span>
              </div>
            )}

            {/* 论文列表 */}
            {activeTab === "papers" && !papersData.loading && (
              <>
                {papersData.items.length > 0 ? (
                  <>
                    {papersData.items.map((paper, index) => (
                      <React.Fragment key={paper.id}>
                        <div className="bg-white rounded-lg transition-all duration-200 cursor-pointer py-4 sm:py-6 w-full">
                          <h4 className="font-semibold text-[16px] sm:text-[17px] md:text-[18px] mb-2 text-[#333333] leading-[1.4]">
                            {paper.title_zh || paper.title}
                          </h4>
                        </div>

                        {/* 分割线 - 最后一个论文后不显示 */}
                        {index < papersData.items.length - 1 && (
                          <div className="w-full h-[1px] bg-[#E0E1E5] my-[15px] sm:my-[20px]" />
                        )}
                      </React.Fragment>
                    ))}

                    {/* 加载更多触发元素 */}
                    <div ref={papersLoaderRef} className="w-full py-4">
                      {papersData.loadingMore && (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-gray-500">加载更多论文中...</div>
                          </div>
                        </div>
                      )}

                      {!papersData.loadingMore && papersData.page < papersData.total_pages && papersData.items.length > 0 && (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          已显示 {papersData.items.length} / {papersData.total} 篇论文，继续滚动加载更多
                        </div>
                      )}

                      {!papersData.loadingMore && papersData.page >= papersData.total_pages && papersData.items.length > 0 && (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          已显示全部 {papersData.items.length} 篇论文
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 text-center py-8">暂无论文信息</div>
                )}
              </>
            )}

            {/* 专利列表 */}
            {activeTab === "patents" && !patentsData.loading && (
              <>
                {patentsData.items.length > 0 ? (
                  <>
                    {patentsData.items.map((patent, index) => (
                      <React.Fragment key={patent.id}>
                        <div className="bg-white rounded-lg transition-all duration-200 cursor-pointer py-4 sm:py-6 w-full">
                          <h4 className="font-semibold text-[16px] sm:text-[17px] md:text-[18px] mb-2 text-[#333333] leading-[1.4]">
                            {patent.title_zh || patent.title}
                          </h4>

                          {patent.publication_date && (
                            <div className="text-[13px] sm:text-[14px] text-gray-600 mb-2">
                              发布日期: {patent.publication_date}
                            </div>
                          )}

                          {patent.inventor && patent.inventor.length > 0 && (
                            <div className="text-[13px] sm:text-[14px] text-gray-600 mb-2">
                              发明人: {patent.inventor.join(", ")}
                            </div>
                          )}

                          {patent.assignee && (
                            <div className="text-[13px] sm:text-[14px] text-gray-600 mb-3">
                              专利权人: {patent.assignee}
                            </div>
                          )}

                          {patent.abstract && (
                            <p className="text-gray-700 text-[13px] sm:text-[14px] leading-[1.6] text-[#666666]">
                              {patent.abstract.length > 120
                                ? patent.abstract.substring(0, 120) + "..."
                                : patent.abstract}
                            </p>
                          )}
                        </div>

                        {/* 分割线 - 最后一个专利后不显示 */}
                        {index < patentsData.items.length - 1 && (
                          <div className="w-full h-[1px] bg-[#E0E1E5] my-[15px] sm:my-[20px]" />
                        )}
                      </React.Fragment>
                    ))}

                    {/* 加载更多触发元素 */}
                    <div ref={patentsLoaderRef} className="w-full py-4">
                      {patentsData.loadingMore && (
                        <div className="flex items-center justify-center py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <div className="text-gray-500">加载更多专利中...</div>
                          </div>
                        </div>
                      )}

                      {!patentsData.loadingMore && patentsData.page < patentsData.total_pages && patentsData.items.length > 0 && (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          已显示 {patentsData.items.length} / {patentsData.total} 篇专利，继续滚动加载更多
                        </div>
                      )}

                      {!patentsData.loadingMore && patentsData.page >= patentsData.total_pages && patentsData.items.length > 0 && (
                        <div className="text-center py-2 text-gray-400 text-sm">
                          已显示全部 {patentsData.items.length} 篇专利
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 text-center py-8">暂无专利信息</div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}