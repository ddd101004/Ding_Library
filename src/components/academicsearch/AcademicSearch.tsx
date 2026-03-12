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

  // 相关标签状态（从综合搜索响应中获取）
  const [relatedTags, setRelatedTags] = useState<string[]>([]);

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

  const getRelatedTagsCache = (): string[] => {
    try {
      const cached = sessionStorage.getItem('relatedTagsCache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('读取相关标签缓存失败:', error);
    }
    return [];
  };

  const setRelatedTagsCache = (tags: string[]) => {
    try {
      sessionStorage.setItem('relatedTagsCache', JSON.stringify(tags));
    } catch (error) {
      console.warn('保存相关标签缓存失败:', error);
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

  // 清空标签函数
  const clearRelatedTags = () => {
    setRelatedTags([]);
  };

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

      // 恢复相关标签（仅综合搜索）
      if (currentTab === "综合") {
        const cachedTags = getRelatedTagsCache();
        if (cachedTags.length > 0) {
          setRelatedTags(cachedTags);
        }
      }

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
          // 从响应中提取标签，显示所有标签
          if (response.tags) {
            const tags = response.tags.slice(0, 15); // 最多显示15个标签
            setRelatedTags(tags);
            // 缓存相关标签
            setRelatedTagsCache(tags);
          }
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
      if (currentTab === "综合") {
        clearRelatedTags();
      }
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

  // 当搜索关键词变化时，清空标签（将在搜索时更新）
  useEffect(() => {
    if (!searchKeyword.trim()) {
      clearRelatedTags();
    }
  }, [searchKeyword]);

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
        q: searchKeyword
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

  // 五种背景颜色
  const tagColors = ACADEMIC_SEARCH_CONFIG.TAG_COLORS;

  // 检查是否是需要居中显示的标签页
  const isCenterTab = CENTER_TABS.includes(currentTab);

  // 检查是否是固定宽度布局的标签页（中文发现、外文发现）
  const isFixedWidthTab = currentTab === "中文发现" || currentTab === "外文发现";

  return (
    <>
    {/* 头像组件 - 固定在右上角 */}
    <AvatarHoverMenu />

    {/* 主容器，使用自适应布局 */}
    <div
        className={`
          px-2 sm:px-3 md:px-4 py-4 sm:py-6 md:py-8 min-h-full
          ${isCenterTab
            ? "w-full" // 居中标签页使用全宽度
            : "w-full min-w-0" // 其他标签页确保充分利用剩余空间
          }
        `}
      >
        {/* 搜索框区域 - 根据标签页类型使用不同布局 */}
        {isFixedWidthTab ? (
          // 固定宽度布局（中文发现、外文发现）：居中显示，固定宽度1199px
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
        ) : (
          // 固定宽度布局（综合）：搜索框固定宽度1810px，左对齐，不居中
          <div className="flex gap-3 sm:gap-4 md:gap-6 lg:gap-8 min-w-0">
            {/* 搜索框区域 - 固定宽度1810px */}
            <div className="w-[1810px] min-w-0">
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

                {/* 标签栏和排序切换 - 严格的左对齐布局 */}
                <div className={`flex items-center justify-between ${isScrolled ? "mb-4" : "mb-6"}`}>
                  {/* 导航标签 */}
                  <div className="flex items-center">
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
          </div>
        )}

        {/* 搜索结果和标签区域 - 根据标签页类型使用不同布局 */}
        {isFixedWidthTab ? (
          // 固定宽度布局（中文发现、外文发现）：居中显示，固定宽度1199px
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
          </div>
        ) : (
          // 固定宽度布局（综合）：搜索框和内容固定宽度1810px，左对齐，不居中
          <div className="flex gap-3 sm:gap-4 md:gap-6 lg:gap-8 min-w-0">
            {/* 主要搜索结果区域 - 固定宽度1810px */}
            <div className="w-[1810px] min-w-0">
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

            {/* 相关标签区域 - 只在综合选项下显示，响应式宽度 */}
            {currentTab === "综合" && (
              <div className="w-[100px] sm:w-[150px] md:w-[220px] lg:w-[320px] xl:w-[300px] min-w-[100px] flex-shrink-0 mt-0 overflow-hidden">
                <div className="font-medium text-base sm:text-lg md:text-xl text-gray-700 flex items-center mb-[12px] sm:mb-[15px] md:mb-[20px] lg:mb-[25px] xl:mb-[30px] w-full whitespace-nowrap">
                  相关标签
                </div>
                {relatedTags.length > 0 ? (
                  <div className="flex flex-wrap gap-[6px] sm:gap-[8px] md:gap-[10px] lg:gap-[12px] xl:gap-[20px]">
                    {relatedTags.map((tag, index) => {
                      // 基于标签文本生成一致的颜色索引，确保每次渲染颜色相同
                      const colorIndex = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % tagColors.length;
                      const colorClass = tagColors[colorIndex];

                      return (
                        <span
                          key={index}
                          onClick={() => handleTagClick(tag)}
                          title={tag}
                          className={`inline-block h-[28px] sm:h-[30px] md:h-[32px] lg:h-[36px] xl:h-[40px] max-w-[70px] sm:max-w-[90px] md:max-w-[120px] lg:max-w-[150px] xl:max-w-[180px] ${colorClass} rounded-[12px] sm:rounded-[14px] md:rounded-[16px] lg:rounded-[18px] xl:rounded-[20px] px-[12px] py-[2px] text-xs sm:text-xs md:text-sm lg:text-sm xl:text-base text-[#333333] whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer transition-colors flex-shrink-0 hover:opacity-80 leading-[24px] sm:leading-[26px] md:leading-[28px] lg:leading-[32px] xl:leading-[36px] box-border`}
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    暂无标签
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}