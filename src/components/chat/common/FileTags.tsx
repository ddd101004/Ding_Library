import React, { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Update the interface to use FileWithContent
interface FileWithContent {
  file: { name: string; type: string; size: number };
  fileId?: string;
  uploadedPaperId?: string;
  isUploading?: boolean; // 文件是否正在上传或解析中
}

interface FileTagsProps {
  files: FileWithContent[]; // Change from File[] to FileWithContent[]
  onRemoveFile: (index: number) => void;
  maxFiles?: number; // 最大文件数量限制
  onFileCountChange?: (count: number) => void; // 文件数量变化回调
}

export default function FileTags({ files, onRemoveFile, maxFiles = 5, onFileCountChange }: FileTagsProps) {
  // 过滤掉空文件（没有名称的文件）
  const validFiles = files.filter(file =>
    file.file?.name
  );

  // 限制文件数量
  const limitedFiles = validFiles.slice(0, maxFiles);

  const [currentPage, setCurrentPage] = useState(0);

  // 当文件数量变化时，重置分页状态并通知父组件
  useEffect(() => {
    // 如果文件数量减少到4个或更少，重置到第一页
    if (limitedFiles.length <= 4) {
      setCurrentPage(0);
    }

    // 通知父组件文件数量变化
    if (onFileCountChange) {
      onFileCountChange(limitedFiles.length);
    }
  }, [limitedFiles.length, onFileCountChange]);
  const filesPerPage = 4; // 每页显示4个文件

  if (limitedFiles.length === 0) return null;

  // 计算总页数
  const totalPages = Math.ceil(limitedFiles.length / filesPerPage);

  // 获取当前页的文件
  const getCurrentPageFiles = () => {
    // 对于5个文件的特殊情况，需要重叠显示
    if (limitedFiles.length === 5 && totalPages === 2) {
      if (currentPage === 0) {
        // 第一页：显示文件1、2、3、4
        return limitedFiles.slice(0, 4);
      } else {
        // 第二页：显示文件2、3、4、5
        return limitedFiles.slice(1, 5);
      }
    }

    // 其他情况：正常分页
    const startIndex = currentPage * filesPerPage;
    const endIndex = startIndex + filesPerPage;
    return limitedFiles.slice(startIndex, endIndex);
  };

  // 处理下一页
  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  // 处理上一页
  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  // 格式化文件名，超过12个字符显示...
  const formatFileName = (fileName: string | undefined) => {
    if (!fileName) return "未知文件";
    if (fileName.length <= 12) {
      return fileName;
    }
    return fileName.substring(0, 8) + '...';
  };

  const currentPageFiles = getCurrentPageFiles();

  // 判断是否需要分页显示（文件数量超过4个）
  const needsPagination = limitedFiles.length > 4;

  return (
    <TooltipProvider>
      <div className="absolute w-full top-[-30px] left-0 z-30 flex items-center px-4">
        {/* 上一个按钮 - 只在需要分页时显示 */}
        {needsPagination && currentPage > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handlePrev}
                className="w-[32px] h-[32px] mr-[10px] flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity rounded-full"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>上一个</p>
            </TooltipContent>
          </Tooltip>
        )}

      {/* 文件标签容器 */}
      <div className={`flex gap-[30px] ${needsPagination ? 'flex-1 justify-center' : ''}`}>
        {currentPageFiles.map((fileWithContent, pageIndex) => {
          // 找到在原始数组中的真实索引
          const realIndex = files.findIndex(file => file === fileWithContent);

          return (
            <div
              key={realIndex}
              className="relative w-[255px] h-[56px] bg-[#F7F8FA] rounded-[20px] border border-[#E0E1E5] flex items-center flex-shrink-0"
            >
              {/* 左侧图标区域 */}
              <div className="w-[56px] h-[54px] bg-white rounded-l-[20px] border-r border-[#E0E1E5] flex items-center justify-center">
                {(() => {
                  const fileName = fileWithContent.file.name || "未知文件";
                  const fileExtension = fileName.split('.').pop()?.toLowerCase();
                  const isUploading = fileWithContent.isUploading || false;

                  // 上传中显示加载动画
                  if (isUploading) {
                    return (
                      <div
                        className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-500 mx-[13px] my-[17px] ml-[17px]"
                      ></div>
                    );
                  }

                  // 上传完成显示文件类型图标
                  let iconSrc = '/slibar/slibar-word@2x.png';
                  if (fileExtension === 'pdf') {
                    iconSrc = '/slibar/slibar-pdf@2x.png';
                  } else if (fileExtension === 'txt') {
                    iconSrc = '/slibar/slibar-txt@2x.png';
                  }

                  return (
                    <img
                      src={iconSrc}
                      alt="文件类型"
                      className="w-[27px] h-[30px] mx-[13px] my-[13px] ml-[15px]"
                    />
                  );
                })()}

              </div>

              {/* 文件名 - 修复显示问题 */}
              <div className="flex-1 px-4 overflow-hidden flex items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="text-[16px] font-normal text-gray-700 truncate block max-w-[152px]"
                    >
                      {formatFileName(fileWithContent.file.name)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{fileWithContent.file.name || "未知文件"}</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* 关闭按钮 - 只在非上传状态时显示 */}
              {!fileWithContent.isUploading && (
                <button
                  onClick={() => onRemoveFile(realIndex)}
                  className="absolute right-[-6px] top-[0px] text-red-500 hover:text-gray-700 cursor-pointer"
                >
                  <img
                    src="/chat-page/cancel1.png"
                    alt="删除"
                    className="w-[12px] h-[12px]"
                  />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* 下一个按钮 - 只在需要分页时显示 */}
      {needsPagination && currentPage < totalPages - 1 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleNext}
              className="w-[32px] h-[32px] ml-[10px] flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity rounded-full"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 4.5l7.5 7.5-7.5 7.5"
                />
              </svg>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>下一个</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
    </TooltipProvider>
  );
}