import React from 'react';
import Image from 'next/image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PaperInfo {
  id: string;
  type: string;
  title: string;
  authors: string[] | null;
  abstract: string | null;
  source: string;
  source_id: string;
  publication_name: string | null;
  publication_year: string | null;
  doi: string | null;
  create_time: string;
  file_name?: string;
}

interface ConversationItem {
  conversation_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  create_time: string;
  last_message_preview?: string;
  paper_info?: PaperInfo[];
}

type ConversationItemType = ConversationItem;

interface ConversationItemProps {
  conv: ConversationItemType;
  isSelected: boolean;
  onClick: (id: string) => void;
  onThreeDotClick: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onExport: (id: string, e: React.MouseEvent) => void;
  onAddToFolder?: (id: string, e: React.MouseEvent) => void;
  exporting?: string | null;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conv,
  isSelected,
  onClick,
  onThreeDotClick,
  onDelete,
  onExport,
  onAddToFolder,
  exporting,
}) => {
  const getDisplayContent = () => {
    return conv.last_message_preview || "";
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  const displayContent = getDisplayContent();
  const truncatedContent = truncateContent(displayContent, 50);

  return (
    <div
      className={`w-full p-4 border border-[#E0E1E5] rounded-[20px] cursor-pointer transition-all duration-200 relative ${
        isSelected
          ? 'shadow-[0px_2px_20px_0px_rgba(89,106,178,0.2)]'
          : 'hover:shadow-[0px_2px_20px_0px_rgba(89,106,178,0.2)]'
      }`}
      onClick={() => onClick(conv.conversation_id)}
    >
      {/* 图标 */}
      <div className="absolute left-[60px] top-1/2 -translate-y-1/2">
        <Image
          src="/chat-page/chat-page-history-commontag.png"
          alt="普通对话"
          width={40}
          height={50}
          className="w-[25px] h-[30px]"
        />
      </div>

      {/* 内容区域 */}
      <div className="flex justify-between items-start">
        <div className="ml-[125px] flex-1 pr-[200px]">
          <h4 className="font-bold text-[16px]">
            {conv.title}
          </h4>

          {/* 论文信息 - 显示 paper_info 数组中的论文标题，一行显示超出省略 */}
          {conv.paper_info && conv.paper_info.length > 0 && (
            <p className="text-[14px] text-[#666] mt-[10px] w-[850px] truncate">
              包含论文：
              {conv.paper_info.map((paper, index) => (
                <span key={paper.id}>
                  {index > 0 && "、"}
                  《{paper.title.split(" / ")[0]}》
                </span>
              ))}
            </p>
          )}
        </div>
      </div>

      {/* 显示最后消息预览或文件夹信息 */}
      {truncatedContent && (
        <p className="text-[16px] text-[#666666] mt-[10px] ml-[125px] pr-[200px] truncate">
          {truncatedContent}
        </p>
      )}

      {/* 操作按钮区域 */}
      <div className="flex items-center absolute top-1/2 -translate-y-1/2 right-[20px]">
        {isSelected ? (
          <TooltipProvider>
            <>
              {/* 导入知识库按钮 */}
              {onAddToFolder && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="w-5 h-5 flex items-center justify-center mr-[30px]"
                      onClick={(e) => onAddToFolder(conv.conversation_id, e)}
                    >
                      <Image
                        src="/slibar/slibar-createbase@2x.png"
                        alt="导入知识库"
                        width={20}
                        height={20}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>导入知识库</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {/* 导出按钮 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-5 h-5 flex items-center justify-center mr-[30px]"
                    onClick={(e) => onExport(conv.conversation_id, e)}
                    disabled={exporting === conv.conversation_id}
                  >
                    <Image
                      src="/slibar/settings-export@2x.png"
                      alt="导出"
                      width={20}
                      height={20}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>导出</p>
                </TooltipContent>
              </Tooltip>

              {/* 删除按钮 */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="w-5 h-5 flex items-center justify-center"
                    onClick={(e) => onDelete(conv.conversation_id, e)}
                  >
                    <Image
                      src="/settings/settings-delete@2x.png"
                      alt="删除"
                      width={20}
                      height={20}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>删除</p>
                </TooltipContent>
              </Tooltip>
            </>
          </TooltipProvider>
        ) : (
          /* 三个点图标 */
          <div
            className="w-6 h-1 flex items-center justify-center opacity-50 cursor-pointer py-5"
            onClick={(e) => onThreeDotClick(conv.conversation_id, e)}
          >
            <Image
              src="/settings/settins-details.svg"
              alt="更多"
              width={24}
              height={4}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationItem;
