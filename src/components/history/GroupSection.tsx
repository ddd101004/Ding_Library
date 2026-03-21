// GroupSection.tsx
import React from 'react';
import ConversationItem from './ConversationItem';

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

interface HistoryItem {
  conversation_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  create_time: string;
  last_message_preview?: string;
  folder_info?: {
    folder_id: string;
    folder_name: string;
  } | null;
  dateGroup?: 'recent' | 'within30Days' | 'earlier';
  paper_info?: PaperInfo[];
}

interface GroupSectionProps {
  title: string;
  conversations: HistoryItem[];
  selectedConversation: string | null;
  onClick: (id: string) => void;
  onThreeDotClick: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onExport: (id: string, e: React.MouseEvent) => void;
  onAddToFolder?: (id: string, e: React.MouseEvent) => void;
  loading: boolean;
  error: string | null;
  exporting?: string | null;
}

const GroupSection: React.FC<GroupSectionProps> = ({
  title,
  conversations,
  selectedConversation,
  onClick,
  onThreeDotClick,
  onDelete,
  onExport,
  onAddToFolder,
  loading,
  error,
  exporting,
}) => {
  if (loading) {
    return (
      <div className="mb-6 mt-[10px]">
        <h3 className="font-medium text-[20px] text-[#333333] leading-[30px] mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 mt-[10px]">
        <h3 className="font-medium text-[20px] text-[#333333] leading-[30px] mb-4">{title}</h3>
        <div className="text-center text-red-500 py-8">{error}</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="mb-6 mt-[10px]">
        <h3 className="font-medium text-[20px] text-[#333333] leading-[30px] mb-4">{title}</h3>
        <div className="text-center text-gray-500 py-8">暂无{title === '最近7天' ? '最近' : title === '30天内' ? '30天内' : '更早的'}历史记录</div>
      </div>
    );
  }

  return (
    <div className={title === '30天内' ? 'mt-[80px]' : 'mb-6 mt-[10px]'}>
      <h3 className="font-medium text-[20px] text-[#333333] leading-[30px] mb-4">{title}</h3>
      <div className="space-y-3">
        {conversations.map((conv) => (
          <ConversationItem
            key={conv.conversation_id}
            conv={conv}
            isSelected={selectedConversation === conv.conversation_id}
            onClick={onClick}
            onThreeDotClick={onThreeDotClick}
            onDelete={onDelete}
            onExport={onExport}
            onAddToFolder={onAddToFolder}
            exporting={exporting}
          />
        ))}
      </div>
    </div>
  );
};

export default GroupSection;