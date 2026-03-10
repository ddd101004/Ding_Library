"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiDel } from "@/api/request";

interface SearchContextType {
  isSearchModalOpen: boolean;
  openSearchModal: () => void;
  closeSearchModal: () => void;
  searchHistory: string[];
  addToSearchHistory: (keyword: string) => void;
  clearSearchHistory: () => void;
  removeFromSearchHistory: (keyword: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  // 从API获取搜索历史
  const fetchSearchHistory = useCallback(async () => {
    try {
      const response = await apiGet('/api/user/search-history', {
        params: {
          size: 50 // 获取更多历史记录用于去重
        }
      });

      if (response.code === 200 && response.data && response.data.items) {
        // 提取关键词列表，去重并限制数量
        const keywords = response.data.items
          .filter((item: any) => item.keyword && item.keyword.trim())
          .map((item: any) => item.keyword.trim())
          .reduce((unique: string[], keyword: string) => {
            // 只有当关键词不在列表中时才添加
            if (!unique.includes(keyword)) {
              unique.push(keyword);
            }
            return unique;
          }, [])
          .slice(0, 18); // 去重后只保留前18条
        setSearchHistory(keywords);
      }
    } catch (error) {
      console.error('获取搜索历史失败:', error);
    }
  }, []);

  // 懒加载：只在第一次打开搜索模态框时获取搜索历史
  useEffect(() => {
    if (isSearchModalOpen && searchHistory.length === 0) {
      fetchSearchHistory();
    }
  }, [isSearchModalOpen, searchHistory.length, fetchSearchHistory]);

  const addToSearchHistory = useCallback(async (keyword: string) => {
    if (!keyword.trim()) return;

    try {
      // 注意：搜索历史是在执行搜索时自动创建的，这里只需要立即刷新历史记录
      // 重新获取搜索历史
      await fetchSearchHistory();
    } catch (error) {
      console.error('刷新搜索历史失败:', error);
    }
  }, [fetchSearchHistory]);

  const clearSearchHistory = useCallback(async () => {
    try {
      // 调用API清空搜索历史
      await apiDel('/api/user/search-history', { data: { clear_all: true } });
      setSearchHistory([]);
    } catch (error) {
      console.error('清空搜索历史失败:', error);
    }
  }, []);

  const removeFromSearchHistory = useCallback(async (keyword: string) => {
    try {
      // 直接按关键词调用API删除记录
      await apiDel('/api/user/search-history', { data: { keyword } });

      // 从本地状态中移除该关键词
      setSearchHistory(prev => prev.filter(k => k !== keyword));
    } catch (error) {
      console.error('删除搜索历史失败:', error);
      // 失败时恢复历史记录
      await fetchSearchHistory();
    }
  }, [fetchSearchHistory]);

  const openSearchModal = () => setIsSearchModalOpen(true);
  const closeSearchModal = () => setIsSearchModalOpen(false);

  return (
    <SearchContext.Provider
      value={{
        isSearchModalOpen,
        openSearchModal,
        closeSearchModal,
        searchHistory,
        addToSearchHistory,
        clearSearchHistory,
        removeFromSearchHistory,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
}