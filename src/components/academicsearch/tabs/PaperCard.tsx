"use client";
import React from "react";
import { Quote, Languages } from "lucide-react";
import { SearchResult } from "../../../types/types";
import AuthorDisplay from "./AuthorDisplay";

interface PaperCardProps {
  paper: SearchResult;
  onQuoteClick: (paper: SearchResult, event: React.MouseEvent) => void;
  onClick: (paper: SearchResult) => void;
  showChineseTitle?: boolean;
  showLanguageIcon?: boolean;
  displayMode?: "comprehensive" | "chinese" | "foreign";
}

export default function PaperCard({
  paper,
  onQuoteClick,
  onClick,
  showChineseTitle = false,
  showLanguageIcon = false,
  displayMode = "comprehensive"
}: PaperCardProps) {

  // 处理单击事件，排除收藏按钮
  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".favorite-button")) {
      return;
    }
    onClick(paper);
  };

  // 处理引用按钮点击
  const handleQuoteButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuoteClick(paper, e);
  };

  // 根据显示模式渲染标题
  const renderTitle = () => {
    if (displayMode === "foreign") {
      // 外文发现模式：优先显示英文标题 + 中文标题
      const englishTitle = (paper as any).title_en || paper.title;
      const chineseTitle = paper.title_zh || paper.title;

      // 如果英文标题和中文标题不同，则分两行显示
      if (englishTitle && chineseTitle && englishTitle !== chineseTitle) {
        return (
          <div className="mb-3">
            <h4 className="text-lg font-semibold text-[16px] sm:text-[18px] font-[600] leading-[1.4] max-h-[50px] overflow-hidden text-ellipsis line-clamp-2">
              {englishTitle}
            </h4>
            <h5 className="font-normal text-[14px] sm:text-[16px] text-[#0D9488] leading-[1.4] max-h-[50px] overflow-hidden text-ellipsis line-clamp-2 mt-1 flex items-center">
              <Languages
                className="w-[15px] h-[15px] sm:w-[17px] sm:h-[17px] mr-1 flex-shrink-0"
              />
              {chineseTitle}
            </h5>
          </div>
        );
      }

      // 只有一个标题或标题相同时
      return (
        <h4 className="text-lg font-semibold mb-3 text-[16px] sm:text-[18px] font-[600] mb-[12px] leading-[1.4] max-h-[50px] overflow-hidden text-ellipsis line-clamp-2">
          {englishTitle}
        </h4>
      );
    }

    // 其他显示模式
    const title = paper.title_zh || paper.title;
    return (
      <h4 className="text-lg font-semibold mb-3 text-[16px] sm:text-[18px] font-[600] mb-[12px] leading-[1.4] max-h-[50px] overflow-hidden text-ellipsis line-clamp-2">
        {title}
      </h4>
    );
  };

  // 根据显示模式渲染作者信息
  const renderAuthors = () => {
    if (displayMode === "foreign" || displayMode === "chinese") {
      return (
        <AuthorDisplay
          authors={(paper.authors as any) || []}
          publicationName={
            displayMode === "chinese"
              ? (paper as any)?.periodical_title || paper.publication_name
              : (paper as any)?.periodical_title_en || (paper as any)?.periodical_title || paper.publication_name
          }
          abstract={displayMode === "chinese" ? paper.abstract : (paper as any)?.abstract_en || paper.abstract}
          publicationDate={
            displayMode === "chinese"
              ? (paper as any)?.publish_year || paper.year
              : (paper as any)?.publish_year || paper.publication_date
          }
        />
      );
    }

    return (
      <div className="text-sm text-gray-600 mb-2">
        {paper.authors?.map((author, idx) => (
          <span key={idx}>
            {author.name_zh || author.name}
            {idx < (paper.authors?.length || 0) - 1 && "; "}
          </span>
        ))}
      </div>
    );
  };

  // 根据显示模式使用不同的样式
  const getCardClassName = () => {
    const baseClasses = "hover:shadow-lg transition-all duration-200 cursor-pointer bg-white rounded-[20px] border border-[#E0E1E5] p-4 sm:p-6 relative shadow-[0px_2px_20px_0px_rgba(89,106,178,0.2)]";

    if (displayMode === "comprehensive") {
      // 综合模式：使用最小高度，因为有摘要需要自适应
      return `${baseClasses} w-full min-h-[240px] sm:min-h-[270px]`;
    }

    if (displayMode === "chinese" || displayMode === "foreign") {
      // 中文/外文发现模式：使用最小高度，让内容自适应
      return `${baseClasses} w-full min-h-[240px] sm:min-h-[270px]`;
    }

    return baseClasses;
  };

  return (
    <div
      className={getCardClassName()}
      onClick={handleClick}
    >
      {/* 引用按钮 - 向上移动5px */}
      <div
        className="favorite-button absolute flex items-center justify-center cursor-pointer hover:shadow-md transition-all duration-200 w-[52px] sm:w-[56px] h-[34px] sm:h-[36px] bg-white border border-[#C8C9CC] rounded-[18px] bottom-[15px] right-[15px] sm:right-[20px]"
        onClick={handleQuoteButtonClick}
      >
        <Quote
          className="w-[15px] h-[14px] sm:w-[17px] sm:h-[16px]"
        />
      </div>

      {/* 标题 */}
      {renderTitle()}

      {/* 作者信息 */}
      {renderAuthors()}

      {/* 发表信息 - 只在综合模式下显示，其他模式由 AuthorDisplay 处理 */}
      {(displayMode === "comprehensive") && (
        <div className="text-sm text-gray-500 mb-4">
          <span>{paper.year}</span>
          {paper.venue?.raw_zh && (
            <span> · {paper.venue.raw_zh}</span>
          )}
          <span> · 引用: {paper.n_citation || 0}</span>
        </div>
      )}
    </div>
  );
}