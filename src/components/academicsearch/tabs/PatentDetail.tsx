"use client";
import React from "react";
import { AlignLeft, Eye, Download } from "lucide-react";

interface PatentDetailProps {
  patent: {
    id: string;
    title: string;
    title_zh?: string;
    abstract?: string;
    year?: number;
    inventors?: Array<{
      name: string;
      name_zh?: string;
    }>;
    assignees?: Array<{
      name: string;
      name_zh?: string;
    }>;
    n_citation?: number;
    patent_type?: string;
    application_date?: string;
    publication_date?: string;
    ipc?: string[];
    keywords?: string[];
    source?: string;
  };
  onBack: () => void;
}

export default function PatentDetail({ patent, onBack }: PatentDetailProps) {
  // 处理专利标题，将专利标签放在标题末尾
  const renderPatentTitleWithTag = () => {
    const title = patent.title_zh || patent.title;
    if (!title) return null;

    return (
      <div className="flex items-center flex-wrap gap-x-[9px]">
        <span className="font-medium text-xl text-[#333333]">
          {title}
        </span>
        <PatentTag />
      </div>
    );
  };

  // 专利标签组件
  const PatentTag = () => (
    <div className="relative w-[36px] sm:w-[40px] md:w-[42px] h-[18px] sm:h-[20px] flex-shrink-0">
      {/* 绿色底色背景 */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0D9488] rounded-[3px] sm:rounded-[4px] opacity-20" />
      {/* 专利文字 */}
      <span className="absolute top-0 left-0 w-full h-full inline-flex items-center justify-center font-medium text-xs sm:text-sm text-[#0D9488]">
        专利
      </span>
    </div>
  );

  return (
    <div className="min-h-screen bg-white relative w-full">
      {/* 头部：返回图标和文字 */}
      <div
        className="flex items-center cursor-pointer ml-[20px] sm:ml-[50px] md:ml-[100px] lg:ml-[200px] xl:ml-[305px]"
        onClick={onBack}
      >
        {/* 返回图标 */}
        <AlignLeft
          className="w-[6px] h-[10px]"
        />
        {/* 返回文字 */}
        <span className="ml-[10px] text-[14px] text-[#666666]">
          返回
        </span>
      </div>

      {/* 分隔线 */}
      <div className="w-full h-[1px] bg-[#E0E1E5] mt-[24px]" />

      {/* 专利名称和按钮容器 */}
      <div className="mt-[42px] ml-[20px] sm:ml-[50px] md:ml-[100px] lg:ml-[200px] xl:ml-[305px] mr-[20px] sm:mr-[50px] md:mr-[100px]">
        {/* 专利标题区域 */}
        <div className="relative">
          {renderPatentTitleWithTag()}

          {/* 操作按钮区域 - 相对于标题定位，保持30px间距 */}
          <div className="absolute left-[300px] top-[calc(100%+30px)] sm:right-[-50px] md:right-[-100px] flex items-center justify-center">
        {/* 预览按钮 */}
        <div
          className="flex items-center cursor-not-allowed opacity-50 w-[100px] sm:w-[110px] md:w-[120px] lg:w-[128px] h-[36px] sm:h-[38px] md:h-[40px] bg-white rounded-[16px] sm:rounded-[18px] md:rounded-[20px] border border-[#E0E1E5] pl-[20px] sm:pl-[25px] md:pl-[30px] lg:pl-[37px] pr-[8px] sm:pr-[12px] md:pr-[14px] lg:pr-[16px] py-[8px] sm:py-[10px] md:py-[12px]"
          title="功能待开发中"
        >
          <Eye
            className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px]"
          />
          <span className="ml-[8px] sm:ml-[9px] md:ml-[10px] lg:ml-[11px] text-sm sm:text-base text-[#666666]">
            预览
          </span>
        </div>

        {/* 下载按钮 */}
        <div
          className="flex items-center cursor-not-allowed opacity-50 w-[100px] sm:w-[110px] md:w-[120px] lg:w-[128px] h-[36px] sm:h-[38px] md:h-[40px] bg-white rounded-[16px] sm:rounded-[18px] md:rounded-[20px] border border-[#E0E1E5] ml-[15px] sm:ml-[18px] md:ml-[20px] pl-[20px] sm:pl-[25px] md:pl-[30px] lg:pl-[37px] pr-[8px] sm:pr-[12px] md:pr-[14px] lg:pr-[16px] py-[8px] sm:py-[10px] md:py-[12px]"
          title="功能待开发中"
        >
          <Download
            className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] md:w-[16px] md:h-[16px]"
          />
          <span className="ml-[8px] sm:ml-[9px] md:ml-[10px] lg:ml-[11px] text-sm sm:text-base text-[#666666]">
            下载
          </span>
        </div>
          </div>
        </div>
      </div>

      {/* 年份信息 */}
      <div className="mt-[80px] ml-[20px] sm:ml-[50px] md:ml-[100px] lg:ml-[200px] xl:ml-[305px] mr-[20px] sm:mr-[50px] md:mr-[100px]">
        <span className="text-base text-[#333333]">
          年份：
        </span>
        <span className="text-base text-[#333333]">
          {patent.year || "未知年份"}
        </span>
      </div>

      {/* 摘要信息 */}
      <div className="mt-[18px] ml-[20px] sm:ml-[50px] md:ml-[100px] lg:ml-[200px] xl:ml-[305px] mr-[20px] sm:mr-[50px] md:mr-[100px]">
        <span className="text-base text-[#333333]">
          摘要：
        </span>
        <span className="text-base text-[#333333]">
          {patent.abstract || "暂无摘要"}
        </span>
      </div>
    </div>
  );
}
