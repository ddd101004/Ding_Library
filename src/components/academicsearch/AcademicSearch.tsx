"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useSearch } from "../../components/contexts/SearchContext";
import { apiPost, apiGet } from "@/api/request";
import AvatarHoverMenu from "../chat/common/AvatarHoverMenu";
import {
  ComprehensiveSearchTab,
  ChineseDiscoveryTab,
  ForeignDiscoveryTab,
  SearchResult,
  ComprehensiveSearchResponse,
} from "./tabs";
import {
  ACADEMIC_SEARCH_CONFIG,
  SEARCH_TABS,
  CENTER_TABS
} from "../../config/academicSearchConfig";

export default function AcademicSearchPage() {
  const [currentTab, setCurrentTab] = useState("综合");
  const { searchHistory } = useSearch();
  const router = useRouter();
  // 从路由参数获取搜索关键词和标签
  const initialKeyword = router.query.q as string;
  const initialTab = router.query.tab as string;
  // 本地维护搜索框输入值（解决路由参数同步问题）
  const [searchKeyword, setSearchKeyword] = useState(initialKeyword || "");

  const modalRef = useRef<HTMLDivElement>(null);

  // 滚动固定相关状态
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > ACADEMIC_SEARCH_CONFIG.SCROLL.HEADER_SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 搜索结果状态
  const [searchResults, setSearchResults] =
    useState<ComprehensiveSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // 搜索结果缓存 - 使用 sessionStorage 持久化存储（只保留最近一次搜索）
  const getSearchCache = (tab: string): ComprehensiveSearchResponse | null => {
    try {
      const cacheKey = `academicSearchCache_${tab}`;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('读取搜索缓存失败:', error);
    }
    return null;
  };

  const setSearchCache = (tab: string, data: ComprehensiveSearchResponse) => {
    try {
      const cacheKey = `academicSearchCache_${tab}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
    } catch (error) {
      console.warn('保存搜索缓存失败:', error);
    }
  };

  // 防重复调用标志
  const searchInProgressRef = useRef<Set<string>>(new Set());

  // AbortController 用于取消请求
  const abortControllerRef = useRef<AbortController | null>(null);

  // 防抖标记 - 防止短时间内重复触发搜索
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 标签列表
  const tabs = SEARCH_TABS;

  // 根据当前标签发起不同的API请求
  const performSearch = async (keyword: string) => {
    if (!keyword.trim()) return;

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 创建新的 AbortController
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // 获取当前缓存
    const cachedResult = getSearchCache(currentTab);

    // 检查缓存（只有关键词相同时才使用缓存）
    if (cachedResult && cachedResult.keyword === keyword.trim()) {
      setSearchResults(cachedResult);
      setLoading(false);
      return;
    }

    // 防重复调用检查
    const searchKey = `${keyword.trim()}_${currentTab}`;
    if (searchInProgressRef.current.has(searchKey)) {
      return;
    }
    searchInProgressRef.current.add(searchKey);
    setLoading(true);

    try {
      let response: ComprehensiveSearchResponse | null = null;

      switch (currentTab) {
        case "综合":
          // 综合搜索
          const apiResponse = await apiPost<ComprehensiveSearchResponse>(
            "/api/search/comprehensive",
            {
              keyword: keyword.trim(),
              page_size: 5,
            },
            abortController.signal
          );
          response = apiResponse.data; // 提取实际的数据部分
          break;

        case "中文发现":
          // 中文发现搜索
          const chinesePapersApiResponse = await apiPost<any>("/api/search/papers", {
            keyword: keyword.trim(),
            page_size: 10,
            sort_type: "中文发现",
            source: "wanfang",
          }, abortController.signal);
          const chinesePapersData = chinesePapersApiResponse.data;
          // 转换为综合搜索响应格式
          response = {
            keyword: keyword.trim(),
            tags: [],
            papers_zh: {
              total: chinesePapersData.total || 0,
              page: chinesePapersData.page || 1,
              page_size: chinesePapersData.page_size || 10,
              total_pages: chinesePapersData.totalPages || 1,
              items: chinesePapersData.items || [],
              source: "wanfang",
            },
            papers_en: {
              total: 0,
              page: 1,
              page_size: 5,
              total_pages: 0,
              items: [],
              source: "wanfang_en",
            },
            scholars: {
              total: 0,
              page: 1,
              page_size: 5,
              total_pages: 0,
              items: [],
              source: "aminer",
            },
            patents: {
              total: 0,
              page: 1,
              page_size: 5,
              total_pages: 0,
              items: [],
              source: "aminer",
            },
          };
          break;

        case "外文发现":
          // 外文发现搜索
          const foreignPapersApiResponse = await apiPost<any>("/api/search/papers", {
            keyword: keyword.trim(),
            page_size: 10,
            sort_type: "外文发现",
            source: "wanfang_en",
          }, abortController.signal);
          const papersData = foreignPapersApiResponse.data;
          // 转换为综合搜索响应格式
          response = {
            keyword: keyword.trim(),
            tags: [],
            papers_zh: {
              total: 0,
              page: 1,
              page_size: 5,
              total_pages: 0,
              items: [],
              source: "wanfang",
            },
            papers_en: {
              total: papersData.total || 0,
              page: papersData.page || 1,
              page_size: papersData.page_size || 10,
              total_pages: papersData.totalPages || 1,
              items: papersData.items || [],
              source: "wanfang_en",
            },
            scholars: {
              total: 0,
              page: 1,
              page_size: 5,
              total_pages: 0,
              items: [],
              source: "aminer",
            },
            patents: {
              total: 0,
              page: 1,
              page_size: 5,
              total_pages: 0,
              items: [],
              source: "aminer",
            },
          };
          break;

        default:
          response = null;
      }

      setSearchResults(response);

      // 缓存搜索结果（只保留该 tab 的最近一次搜索）
      if (response) {
        setSearchCache(currentTab, response as ComprehensiveSearchResponse);
      }
    } catch (error: any) {
      // 如果是主动取消的请求,不显示错误
      if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
        console.log('请求已取消');
        return;
      }
      console.error("搜索失败:", error);
      setSearchResults(null);
    } finally {
      // 清除搜索进行中的标志
      searchInProgressRef.current.delete(searchKey);
      setLoading(false);
    }
  };

  // 处理URL中的tab参数和初始标签设置
  useEffect(() => {
    if (initialTab && tabs.includes(initialTab)) {
      setCurrentTab(initialTab);
    } else {
      // 默认使用综合标签页
      setCurrentTab("综合");
    }
  }, [initialTab]);

  // 路由参数变化时同步到搜索框
  useEffect(() => {
    if (router.query.q !== searchKeyword) {
      setSearchKeyword((router.query.q as string) || "");
    }
  }, [router.query.q]);

  // 统一的搜索逻辑 - 当 URL 参数或标签变化时执行搜索
  useEffect(() => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // 获取当前应该搜索的关键词（优先使用路由参数）
    const keywordToSearch = initialKeyword || searchKeyword;

    if (!keywordToSearch.trim()) {
      setSearchResults(null);
      return;
    }

    // 使用防抖延迟执行搜索，避免短时间内多次触发
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(keywordToSearch);
    }, 100); // 100ms 延迟

    // 清理函数
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKeyword, currentTab]); // 仅依赖 initialKeyword 和 currentTab

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
  };

  // 处理搜索（回车或手动触发）
  const handleSearch = () => {
    if (searchKeyword.trim()) {
      const keyword = searchKeyword.trim();

      // 始终切换到综合标签页
      setCurrentTab("综合");

      // 更新 URL（会触发 useEffect 执行搜索）
      router.replace({
        pathname: "/academic-search",
        query: {
          q: keyword,
          tab: "综合",
        },
      }, undefined, { shallow: true });
    }
  };

  // 处理回车事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // 处理标签点击
  const handleTagClick = (tag: string) => {
    setSearchKeyword(tag);

    router.push({
      pathname: "/academic-search",
      query: {
        q: tag,
        tab: currentTab,
      },
    });
  };

  // 处理论文点击
  const handlePaperClick = (paper: SearchResult) => {
    // 跳转到论文详情页，带上当前标签和搜索关键词
    router.push({
      pathname: `/paper/${paper.id}`,
      query: {
        tab: currentTab,
        q: searchKeyword,
        source: 'third-party'  // 标识这是第三方论文
      }
    });
  };

  // 处理标签切换
  const handleTabChange = (tab: string) => {
    setCurrentTab(tab);

    // 如果有关键词，更新URL
    if (searchKeyword.trim()) {
      router.push({
        pathname: "/academic-search",
        query: {
          q: searchKeyword,
          tab: tab,
        },
      });
    }
  };

  // 处理论文查看更多点击
  const handleViewMorePapers = () => {
    // 跳转到外文发现页面
    router.push({
      pathname: "/academic-search",
      query: {
        q: searchKeyword,
        tab: "外文发现",
      },
    });
  };

  // 处理加载更多中文论文
  const handleLoadMoreChinesePapers = async (page: number) => {
    if (!searchKeyword.trim()) return;

    try {
      const response = await apiPost<any>("/api/search/papers", {
        keyword: searchKeyword.trim(),
        page: page,
        page_size: 10,
        sort_type: "中文发现",
        source: "wanfang",
      });

      const newPapers = response.data.items || [];

      // 更新搜索结果中的中文论文数据，追加新论文而不是替换
      setSearchResults(prev => {
        if (!prev) return prev;
        const updatedItems = [...prev.papers_zh.items, ...newPapers];
        return {
          ...prev,
          papers_zh: {
            ...prev.papers_zh,
            items: updatedItems,
            // 更新当前页，总数保持不变
            page: response.data.page || page,
          }
        };
      });
    } catch (error: any) {
      console.error("加载更多中文论文失败:", error);
    }
  };

  // 处理加载更多外文论文
  const handleLoadMoreForeignPapers = async (page: number) => {
    if (!searchKeyword.trim()) return;

    try {
      const response = await apiPost<any>("/api/search/papers", {
        keyword: searchKeyword.trim(),
        page: page,
        page_size: 10,
        sort_type: "外文发现",
        source: "wanfang_en",
      });

      const newPapers = response.data.items || [];

      // 更新搜索结果中的外文论文数据，追加新论文而不是替换
      setSearchResults(prev => {
        if (!prev) return prev;
        const updatedItems = [...prev.papers_en.items, ...newPapers];
        return {
          ...prev,
          papers_en: {
            ...prev.papers_en,
            items: updatedItems,
            // 更新当前页，总数保持不变
            page: response.data.page || page,
          }
        };
      });
    } catch (error: any) {
      console.error("加载更多外文论文失败:", error);
    }
  };

  // 检查是否是需要居中显示的标签页
  const isCenterTab = CENTER_TABS.includes(currentTab);

  return (
    <>
    {/* 头像组件 - 固定在右上角 */}
    <AvatarHoverMenu />

    {/* 主容器，使用自适应布局 */}
    <div
        className={`
          px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8 min-h-full
        `}
      >
        {/* 搜索框区域 - 所有标签页统一布局：居中显示，固定宽度1199px */}
        <div className="mx-auto w-[1199px]">
            <div
              ref={headerRef}
              className={`${isScrolled ? "fixed top-0 left-0 right-0 z-50 bg-white shadow-lg py-4" : "mb-8"} transition-all duration-300`}
            >
              <div className="mb-4 h-[60px]">
                <div
                  className="flex items-center gap-3 w-full h-full bg-[#F7F8FA] rounded-[20px] border border-[#C8C9CC]"
                >
                  <img
                    src="/slibar/slibar-questions-answers.png"
                    alt="学术搜索"
                    className="w-5 h-5 ml-6"
                  />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="一站式学术搜索-文献/期刊/学者/用户"
                    className="flex-1 h-full p-4 text-lg focus:outline-none border-none bg-transparent"
                  />
                </div>
              </div>

              {/* 标签栏 - 左对齐 */}
              <div className={`flex items-center ${isScrolled ? "mb-4" : "mb-6"}`}>
                {tabs.map((tab, index) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`relative flex items-center justify-center font-medium text-xl ${
                      currentTab === tab ? "text-[#0D9488]" : "text-[#333333]"
                    } ${
                      index < tabs.length - 1 ? "mr-[50px]" : "mr-0"
                    } border-none bg-transparent cursor-pointer pb-[5px]`}
                  >
                    {tab}
                    {currentTab === tab && (
                      <div className="absolute bottom-[-5px] w-[30px] h-[4px] bg-[#0D9488] rounded-[2px]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* 占位元素，当头部固定时防止内容上移 */}
            {isScrolled && (
              <div
                style={{
                  height: headerRef.current ? headerRef.current.offsetHeight : 0
                }}
                className="block"
              />
            )}
          </div>

        {/* 搜索结果区域 - 居中显示，固定宽度1199px */}
        <div className="mx-auto w-[1199px]">
            {/* 中文发现 */}
            {currentTab === "中文发现" && (
              <ChineseDiscoveryTab
                searchResults={searchResults?.papers_zh || null}
                loading={loading}
                onPaperClick={handlePaperClick}
                onLoadMore={handleLoadMoreChinesePapers}
              />
            )}

            {/* 外文发现 */}
            {currentTab === "外文发现" && (
              <ForeignDiscoveryTab
                searchResults={searchResults?.papers_en || null}
                loading={loading}
                onPaperClick={handlePaperClick}
                onLoadMore={handleLoadMoreForeignPapers}
              />
            )}

            {/* 综合搜索 */}
            {currentTab === "综合" && (
              <ComprehensiveSearchTab
                searchResults={searchResults}
                loading={loading}
                searchKeyword={searchKeyword}
                onViewMorePapers={handleViewMorePapers}
                onPaperClick={handlePaperClick}
              />
            )}
          </div>
      </div>
    </>
  );
}
