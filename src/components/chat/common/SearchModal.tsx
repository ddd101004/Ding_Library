"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useSearch } from "../../contexts/SearchContext";

export default function SearchModal() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const {
    isSearchModalOpen,
    closeSearchModal,
    searchHistory,
    addToSearchHistory,
    clearSearchHistory,
    removeFromSearchHistory,
  } = useSearch();

  // 计算弹框高度：基础高度 + 历史记录项高度
  const calculateModalHeight = () => {
    const baseHeight = 140; // 基础高度（搜索框 + 标题 + 间距）
    const historyItemHeight = 60; // 每个历史记录项的高度（包含间距）
    const maxHeight = 600; // 最大高度限制

    const calculatedHeight = baseHeight + (searchHistory.length > 0 ? Math.ceil(searchHistory.length / 6) * historyItemHeight : 0);
    return Math.min(calculatedHeight, maxHeight);
  };

  // 点击弹窗外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        closeSearchModal();
        setSearchKeyword("");
      }
    };

    if (isSearchModalOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSearchModalOpen, closeSearchModal]);

  const handleSearch = () => {
    if (searchKeyword.trim()) {
      addToSearchHistory(searchKeyword.trim());
      router.push({
        pathname: "/academic-search",
        query: {
          q: searchKeyword.trim(),
          tab: "综合"
        },
      });
      closeSearchModal();
      setSearchKeyword("");
    }
  };

  const handleHistoryClick = (keyword: string) => {
    setSearchKeyword(keyword);
    // 将光标定位到输入框文字末尾
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleRemoveHistory = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    removeFromSearchHistory(keyword);
  };

  if (!isSearchModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2] w-[1000px] p-6 max-h-[600px]"
        style={{
          height: `${calculateModalHeight()}px`,
        }}
      >
        {/* 搜索框 */}
        <div className="mb-2 -mt-1">
          <div className="flex items-center gap-3">
            <img
              src="/slibar/slibar-questions-answers.png"
              alt="学术搜索"
              className="w-5 h-5"
            />
            <input
              ref={inputRef}
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="一站式学术搜索-文献/期刊/学者/用户"
              className="flex-1 p-4 text-lg focus:outline-none border-none border-none border-none border-none"
                          />
          </div>
        </div>

        {/* 分隔线 - 在搜索图标下方30px */}
        <div
          className="w-[940px] h-[1px] bg-[#E0E1E5] rounded-[1px] mx-auto mt-[15px]"
        ></div>

        {/* 搜索历史 */}
        <div className="-mt-3">
          {searchHistory.length > 0 && (
            <>
              <div className="flex justify-between items-center px-[40px] mt-4">
                <h3
                  className="text-primary text-[16px] font-normal leading-[40px] font-[500] text-[#333333]"
                >
                  搜索历史
                </h3>
                <button
                  onClick={clearSearchHistory}
                  className="flex items-center justify-center hover:opacity-70 transition-opacity"
                >
                  <img
                    src="/settings/settings-delete.png"
                    alt="清空历史"
                    className="w-[19px] h-[22px]"
                  />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mt-1 px-[40px] pb-4">
                {searchHistory.map((keyword: any, index: any) => (
                  <div
                    key={index}
                    className="relative group w-[120px] h-[40px] bg-white rounded-[20px] border border-[#C8C9CC] hover:border-[#3B80FF] transition-colors"
                  >
                    <button
                      onClick={() => handleHistoryClick(keyword)}
                      className="w-full h-full flex items-center justify-center px-3 text-gray-700 hover:text-[#3B80FF] transition-colors rounded-[20px] text-primary text-[16px] font-normal leading-[40px]"
                    >
                      <span className="truncate block text-center" title={keyword}>{keyword}</span>
                    </button>
                    <button
                      onClick={(e) => handleRemoveHistory(e, keyword)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center text-[10px] text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors group-hover:opacity-100 border border-[#C8C9CC]"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {searchHistory.length === 0 && (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              暂无搜索历史
            </div>
          )}
        </div>
      </div>
    </div>
  );
}