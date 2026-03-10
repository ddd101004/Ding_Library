import { useState, useCallback, useRef, useEffect } from "react";
import { apiPost, apiGet } from "@/api/request";

interface InfiniteScrollConfig<T> {
  apiKey: string;
  method?: "GET" | "POST";
  initialParams: Record<string, any>;
  pageSize?: number;
  responseMapper?: (data: any) => T[];
  totalMapper?: (data: any) => number;
  pageMapper?: (data: any) => number;
  totalPagesMapper?: (data: any) => number;
}

interface InfiniteScrollResult<T> {
  items: T[];
  total: number;
  page: number;
  total_pages: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reset: () => void;
  setParams: (params: Record<string, any>) => void;
}

export function useInfiniteScroll<T>({
  apiKey,
  method = "POST",
  initialParams,
  pageSize = 10,
  responseMapper = (data) => data.items || [],
  totalMapper = (data) => data.total || 0,
  pageMapper = (data) => data.page || 1,
  totalPagesMapper = (data) => data.totalPages || 1
}: InfiniteScrollConfig<T>): InfiniteScrollResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [total_pages, setTotalPages] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [params, setParams] = useState<Record<string, any>>(initialParams);

  // 重置状态
  const reset = useCallback(() => {
    setItems([]);
    setPage(1);
    setTotal(0);
    setTotalPages(0);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  // 获取数据
  const fetchData = useCallback(async (pageNum: number = 1, isLoadMore: boolean = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const requestParams = {
        ...params,
        page: pageNum,
        size: pageSize
      };

      let response;
      if (method === "GET") {
        // GET 请求：将参数拼接到 URL
        const queryString = new URLSearchParams(
          Object.entries(requestParams).reduce((acc, [key, value]) => {
            acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString();

        response = await apiGet(`${apiKey}?${queryString}`);
      } else {
        // POST 请求：发送请求体
        response = await apiPost(apiKey, requestParams);
      }

      if (response.code === 200 && response.data) {
        const newItems = responseMapper(response.data);
        const newTotal = totalMapper(response.data);
        const newPage = pageMapper(response.data);
        const newTotalPages = totalPagesMapper(response.data);

        if (isLoadMore) {
          // 追加数据模式
          setItems(prev => [...prev, ...newItems]);
          setPage(newPage);
          setTotalPages(newTotalPages);
        } else {
          // 替换数据模式
          setItems(newItems);
          setTotal(newTotal);
          setPage(newPage);
          setTotalPages(newTotalPages);
        }
      }
    } catch (error) {
      console.error("无限滚动加载数据失败:", error);
    } finally {
      if (isLoadMore) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [apiKey, method, params, pageSize, responseMapper, totalMapper, pageMapper, totalPagesMapper]);

  // 加载更多
  const loadMore = useCallback(() => {
    if (loadingMore || loading || !items.length) {
      return;
    }

    // 检查是否还有下一页
    if (page >= total_pages) {
      return;
    }

    fetchData(page + 1, true);
  }, [loadingMore, loading, items.length, page, total_pages, fetchData]);

  // 更新参数并重新获取数据
  const setParamsAndFetch = useCallback((newParams: Record<string, any>) => {
    setParams(newParams);
    reset();
  }, [reset]);

  // 参数变化时重新获取数据
  useEffect(() => {
    if (Object.keys(params).length > 0) {
      fetchData(1, false);
    }
  }, [params]);

  // 计算是否还有更多数据
  const hasMore = page < total_pages && items.length > 0;

  return {
    items,
    total,
    page,
    total_pages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    reset,
    setParams: setParamsAndFetch
  };
}

// 用于学术搜索的专用 Hook
export function useAcademicSearchInfiniteScroll<T>(
  searchType: "papers" | "scholars" | "patents" | "chinese" | "foreign",
  searchKeyword: string,
  additionalParams: Record<string, any> = {}
) {
  const searchConfigs = {
    papers: {
      apiKey: "/api/search/papers",
      method: "POST" as const,
      initialParams: {
        keyword: searchKeyword,
        source: "aminer",
        ...additionalParams
      },
      pageSize: 10
    },
    scholars: {
      apiKey: "/api/search/scholars",
      method: "POST" as const,
      initialParams: {
        name: searchKeyword,
        ...additionalParams
      },
      pageSize: 10
    },
    patents: {
      apiKey: "/api/search/patents",
      method: "POST" as const,
      initialParams: {
        keyword: searchKeyword,
        ...additionalParams
      },
      pageSize: 10
    },
    chinese: {
      apiKey: "/api/search/papers",
      method: "POST" as const,
      initialParams: {
        keyword: searchKeyword,
        source: "wanfang",
        sort_type: "中文发现",
        ...additionalParams
      },
      pageSize: 10
    },
    foreign: {
      apiKey: "/api/search/papers",
      method: "POST" as const,
      initialParams: {
        keyword: searchKeyword,
        source: "wanfang_en",
        sort_type: "外文发现",
        ...additionalParams
      },
      pageSize: 10
    }
  };

  const config = searchConfigs[searchType];

  return useInfiniteScroll<T>(config);
}