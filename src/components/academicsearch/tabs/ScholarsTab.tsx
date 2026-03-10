"use client";
import React from "react";
import { ScholarResult } from "../../../types/types";

interface ScholarsTabProps {
  searchResults: {
    total: number;
    page: number;
    page_size: number;
    total_pages: number;
    items: ScholarResult[];
  } | null;
  loading: boolean;
  onScholarClick: (scholar: ScholarResult) => void;
}

export default function ScholarsTab({
  searchResults,
  loading,
  onScholarClick,
}: ScholarsTabProps) {

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

  const { items } = searchResults;

  return (
    <>
      {items.length > 0 ? (
        <div className="mb-8 w-full">
          <div className="flex flex-wrap justify-center gap-[20px] w-full">
            {items.map((scholar, index) => {
              return (
                <div
                  key={`${scholar.id}-${index}`}
                  className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white rounded-[20px] border border-[#E0E1E5] p-2 sm:p-3 md:p-4 flex items-center shadow-[0px_2px_20px_0px_rgba(89,106,178,0.2)]"
                  style={{
                    width: "calc(50% - 10px)",
                    height: "clamp(100px, 140px, 140px)",
                    flex: "0 0 calc(50% - 10px)",
                    minWidth: "200px",
                  }}
                  onClick={() => onScholarClick(scholar)}
                >
                        {/* 学者头像 */}
                        <div
                          className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px] lg:w-[90px] lg:h-[90px] xl:w-[100px] xl:h-[100px] flex-shrink-0 mr-[10px] sm:mr-[12px] md:mr-[15px] lg:mr-[18px] xl:mr-[20px]"
                        >
                          <img
                            src="/paper/paper-scholar-avartar.png"
                            alt={`${scholar.name_zh || scholar.name}的头像`}
                            className="w-full h-full object-cover rounded-full"
                          />
                        </div>

                        {/* 学者信息 */}
                        <div className="flex-1 flex flex-col justify-center min-w-0">
                          {/* 学者姓名 - 使用 overflow-hidden 和 text-ellipsis 限制宽度 */}
                          <h4
                            className="font-medium text-[16px] sm:text-[18px] md:text-[20px] mb-[6px] sm:mb-[8px] md:mb-[9px]"
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                          >
                            {scholar.name_zh || scholar.name || ""}
                          </h4>

                          {/* 机构信息 - 使用 overflow-hidden 和 text-ellipsis 限制宽度 */}
                          <div
                            className="text-[14px] sm:text-[15px] md:text-[16px] text-[#333333] mb-[6px] sm:mb-[8px] md:mb-[9px]"
                            style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                          >
                            {scholar.org_zh ||
                              scholar.org ||
                              scholar.orgs?.[0] ||
                              "未知机构"}
                          </div>

                          {/* 被引用数 */}
                          <div
                            className="text-[14px] sm:text-[15px] md:text-[16px] text-[#999999] flex items-center"
                          >
                            被引用数
                            <span className="ml-[6px] sm:ml-[8px] md:ml-[9px]">
                              {scholar.n_citation || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
          </div>

          {/* 显示提示信息 */}
          <div className="w-full py-4">
            <div className="text-center py-2 text-gray-400 text-sm">
              已显示全部 {items.length} 条学者信息
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          未找到相关学者
        </div>
      )}
    </>
  );
}