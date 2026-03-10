import React, { useState, useEffect, useRef } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartFileTagsProps {
  files: Array<{
    file?: { name?: string };
    name?: string; // 论文标题
    fileName?: string; // 文件名
  }>;
  selectedFileIndex: number;
  setSelectedFileIndex: (index: number) => void;
  onBackToChat: () => void;
  getFileNameWithoutExtension: (filename: string) => string;
}

export const SmartFileTags: React.FC<SmartFileTagsProps> = ({
  files,
  selectedFileIndex,
  setSelectedFileIndex,
  onBackToChat,
  getFileNameWithoutExtension,
}) => {
  const [visibleCount, setVisibleCount] = useState(files.length);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // 获取显示名称：优先使用论文标题，其次使用文件名
  const getDisplayName = (file: any, index: number) => {
    // 优先使用论文标题 (name 字段)
    if (file.name && file.name.trim()) {
      return file.name.trim();
    }
    // 其次使用 fileName 字段
    if (file.fileName && file.fileName.trim()) {
      return getFileNameWithoutExtension(file.fileName.trim());
    }
    // 最后使用 file.name 字段
    if (file.file?.name && file.file.name.trim()) {
      return getFileNameWithoutExtension(file.file.name.trim());
    }
    // 都没有的话使用默认名称
    return `文件${index + 1}`;
  };

  useEffect(() => {
    const calculateVisibleCount = () => {
      if (!containerRef.current || !measureRef.current || files.length <= 1) {
        return;
      }

      const containerWidth = containerRef.current.offsetWidth;
      const backIconWidth = 17; // 6px + 11px margin
      const separatorWidth = 8; // / separator width
      const fontSize = 16;

      let currentWidth = backIconWidth;
      let count = 0;

      for (let i = 0; i < files.length; i++) {
        const displayName = getDisplayName(files[i], i);
        // 估算文本宽度（中文约等于字体大小，英文约为字体大小的0.6倍）
        const textWidth = Math.ceil(displayName.length * fontSize * 0.8);

        const needsSeparator = i > 0;
        const isLastInFirstLine = i === count; // 当前尝试的是第一行的最后一个位置
        const hasMoreFiles = i < files.length - 1; // 后面还有文件
        const needsExtraSeparator = isLastInFirstLine && hasMoreFiles; // 第一行最后且后面还有文件

        const itemWidth = textWidth + (needsSeparator ? separatorWidth : 0) + (needsExtraSeparator ? separatorWidth : 0);

        if (currentWidth + itemWidth <= containerWidth - 20) { // 留20px缓冲
          currentWidth += itemWidth;
          count++;
        } else {
          break;
        }
      }

      setVisibleCount(count);
    };

    calculateVisibleCount();

    // 监听窗口大小变化
    const handleResize = () => {
      calculateVisibleCount();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [files, getFileNameWithoutExtension]);

  // 如果所有文件都能放在第一行，使用简单布局
  if (visibleCount >= files.length) {
    return (
      <TooltipProvider>
        <div className="flex items-center flex-wrap" ref={containerRef}>
          <Tooltip>
            <TooltipTrigger asChild>
              <img
                src="/paper/paper-details.png"
                alt="返回首页"
                className="cursor-pointer"
                style={{
                  width: '6px',
                  height: '11px',
                  marginRight: '11px',
                  flexShrink: 0
                }}
                onClick={onBackToChat}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>返回首页</p>
            </TooltipContent>
          </Tooltip>
          {files.map((file, index) => (
            <React.Fragment key={index}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className="cursor-pointer transition-colors"
                    style={{
                      fontWeight: 500,
                      fontSize: '16px',
                      color: selectedFileIndex === index ? '#333333' : '#999999',
                      marginRight: index < files.length - 1 ? '8px' : '0',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => setSelectedFileIndex(index)}
                    onMouseEnter={(e) => {
                      if (selectedFileIndex !== index) {
                        e.currentTarget.style.color = '#333333';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedFileIndex !== index) {
                        e.currentTarget.style.color = '#999999';
                      }
                    }}
                  >
                    {getDisplayName(file, index)}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{getDisplayName(file, index)}</p>
                </TooltipContent>
              </Tooltip>
              {index < files.length - 1 && (
                <span className="text-gray-400" style={{color: '#999999', marginRight: '8px'}}> / </span>
              )}
            </React.Fragment>
          ))}
        </div>
      </TooltipProvider>
    );
  }

  // 智能布局：第一行放尽可能多的标签，剩余标签在第二个标签下方左对齐
  return (
    <TooltipProvider>
      <div>
      {/* 隐藏的测量元素 */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute',
          visibility: 'hidden',
          height: 'auto',
          width: 'auto',
          fontSize: '16px',
          fontWeight: 500,
          whiteSpace: 'nowrap'
        }}
      >
        {files.map((file, index) => (
          <React.Fragment key={index}>
            <span>
              {getDisplayName(file, index)}
            </span>
            {index < files.length - 1 && <span> / </span>}
          </React.Fragment>
        ))}
      </div>

      {/* 第一行：返回图标 + 能放的标签 */}
      <div className="flex items-center" ref={containerRef}>
        <Tooltip>
          <TooltipTrigger asChild>
            <img
              src="/paper/paper-details.png"
              alt="返回首页"
              className="cursor-pointer"
              style={{
                width: '6px',
                height: '11px',
                marginRight: '11px',
                flexShrink: 0
              }}
              onClick={onBackToChat}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>返回首页</p>
          </TooltipContent>
        </Tooltip>
        {files.slice(0, visibleCount).map((file, index) => (
          <React.Fragment key={index}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="cursor-pointer transition-colors"
                  style={{
                    fontWeight: 500,
                    fontSize: '16px',
                    color: selectedFileIndex === index ? '#333333' : '#999999',
                    marginRight: (index < visibleCount - 1 || (index === visibleCount - 1 && files.length > visibleCount)) ? '8px' : '0',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => setSelectedFileIndex(index)}
                  onMouseEnter={(e) => {
                    if (selectedFileIndex !== index) {
                      e.currentTarget.style.color = '#333333';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedFileIndex !== index) {
                      e.currentTarget.style.color = '#999999';
                    }
                  }}
                >
                  {getDisplayName(file, index)}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getDisplayName(file, index)}</p>
              </TooltipContent>
            </Tooltip>
            {index < visibleCount - 1 && (
              <span className="text-gray-400" style={{color: '#999999', marginRight: '8px'}}> / </span>
            )}
            {index === visibleCount - 1 && files.length > visibleCount && (
              <span className="text-gray-400" style={{color: '#999999', marginRight: '8px'}}> / </span>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* 后续标签：在第一个标签下方左对齐 */}
      {files.length > visibleCount && (
        <div style={{marginLeft: '17px', marginTop: '4px'}}>
          {files.slice(visibleCount).map((file, index) => {
            const actualIndex = visibleCount + index;
            return (
              <React.Fragment key={actualIndex}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="cursor-pointer transition-colors"
                      style={{
                        fontWeight: 500,
                        fontSize: '16px',
                        color: selectedFileIndex === actualIndex ? '#333333' : '#999999',
                        marginRight: actualIndex < files.length - 1 ? '8px' : '0',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => setSelectedFileIndex(actualIndex)}
                      onMouseEnter={(e) => {
                        if (selectedFileIndex !== actualIndex) {
                          e.currentTarget.style.color = '#333333';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedFileIndex !== actualIndex) {
                          e.currentTarget.style.color = '#999999';
                        }
                      }}
                    >
                      {getDisplayName(file, actualIndex)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{getDisplayName(file, actualIndex)}</p>
                  </TooltipContent>
                </Tooltip>
                {actualIndex < files.length - 1 && (
                  <span className="text-gray-400" style={{color: '#999999', marginRight: '8px'}}> / </span>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
};