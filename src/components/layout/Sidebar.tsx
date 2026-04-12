import React from "react";
import { Search, Database, Folder, History, ChevronLeft, ChevronRight, Star, PlusCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  isSidebarOpen: boolean;
  activeIcon: string | null;
  recentConversations: any[];
  conversationsLoading: boolean;
  onToggleSidebar: (e: React.MouseEvent) => void;
  onMenuItemClick: (e: React.MouseEvent, path: string, icon: string) => void;
  onAcademicSearchClick: (e: React.MouseEvent) => void;
  onNewChatClick: (e: React.MouseEvent) => void;
  onRecentConversationClick: (conversationId: string, e: React.MouseEvent) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  activeIcon,
  recentConversations,
  conversationsLoading,
  onToggleSidebar,
  onMenuItemClick,
  onAcademicSearchClick,
  onNewChatClick,
  onRecentConversationClick,
}) => {
  const isMenuItemActive = (menuType: string) => activeIcon === menuType && isSidebarOpen;

  // 侧边栏收起时，点击菜单项或按钮只执行对应功能，不打开侧边栏
  const handleSidebarItemClick = (e: React.MouseEvent, action: () => void) => {
    // 侧边栏收起时，直接执行动作，不阻止事件冒泡
    if (!isSidebarOpen) {
      action();
      return;
    }
    // 侧边栏打开时，正常处理
    action();
  };

  return (
    <div className="w-full h-full flex flex-col items-center">
     {/* Logo区域 */}
<div className={`flex items-center justify-center mt-[33px] ${isSidebarOpen ? "w-[192px] mb-2" : "w-[70px] h-[66px] mb-2"}`}>
  {/* 核心修改：给内部容器添加 flex 和 items-center 实现同行对齐 */}
  <div className="flex items-center h-full">
    <img
      src="/logo/ai_logo.png"
      alt="AI学术交互系统"
      className="h-[40px] w-[40px] object-contain"
    />
    {isSidebarOpen && (
      <span className="text-[#0D9488] text-[24px] ml-2">AI学术系统</span>
    )}
  </div>
</div>

      {/* 新对话按钮 */}
      <div
        className={`flex items-center justify-center mt-[20px] transition-all duration-300 cursor-pointer ${
          isSidebarOpen ? "w-[192px] h-[36px] bg-gradient-to-r from-[#14B8A6] to-[#0D9488] rounded-[18px]" : "w-[38px] h-[58px]"
        }`}
        onClick={(e) => handleSidebarItemClick(e, () => onNewChatClick(e))}
      >
        {isSidebarOpen ? (
          <div className="flex items-center">
            <PlusCircle className="w-[26px] h-[26px] mr-[17px] text-white" strokeWidth={2} />
            <span className="text-white text-[16px]">新对话</span>
          </div>
        ) : (
          <PlusCircle className="w-[30px] h-[26px] text-[#374151]" strokeWidth={2} />
        )}
      </div>

      {/* 学术搜索 */}
      <div
        className={`flex items-center mt-[44px] cursor-pointer transition-all duration-200 ${
          isSidebarOpen ? `w-[192px] h-[36px] justify-start pl-4 rounded-[18px] ${isMenuItemActive("academic") ? "bg-white bg-opacity-40" : "hover:bg-white hover:bg-opacity-20"}` : "justify-center"
        }`}
        onClick={(e) => handleSidebarItemClick(e, () => onAcademicSearchClick(e))}
      >
        <Search
          className={`w-[22px] h-[22px] ${isMenuItemActive("academic") ? "text-[#0D9488]" : "text-gray-700"}`}
        />
        {isSidebarOpen && (
          <span className={`text-[16px] ml-2 ${isMenuItemActive("academic") ? "text-[#0D9488]" : "text-gray-700"}`}>学术搜索</span>
        )}
      </div>

      {/* 知识库 */}
      <div
        className={`flex items-center mt-[30px] cursor-pointer transition-all duration-200 ${
          isSidebarOpen ? `w-[192px] h-[36px] justify-start pl-4 rounded-[18px] ${isMenuItemActive("knowledge") ? "bg-white bg-opacity-40" : "hover:bg-white hover:bg-opacity-20"}` : "justify-center"
        }`}
        onClick={(e) => onMenuItemClick(e, "/knowledge-base", "knowledge")}
      >
        <Database
          className={`w-[21px] h-[20px] ${isMenuItemActive("knowledge") ? "text-[#0D9488]" : "text-gray-700"}`}
        />
        {isSidebarOpen && (
          <span className={`text-[16px] ml-2 ${isMenuItemActive("knowledge") ? "text-[#0D9488]" : "text-gray-700"}`}>知识库</span>
        )}
      </div>

      {/* 历史记录 */}
      <div
        className={`flex items-center mt-[30px] cursor-pointer transition-all duration-200 ${
          isSidebarOpen ? `w-[192px] h-[36px] justify-start pl-4 rounded-[18px] ${isMenuItemActive("history") ? "bg-white bg-opacity-40" : "hover:bg-white hover:bg-opacity-20"}` : "justify-center"
        }`}
        onClick={(e) => onMenuItemClick(e, "/history", "history")}
      >
        <History
          className={`w-[21px] h-[21px] ${isMenuItemActive("history") ? "text-[#0D9488]" : "text-gray-700"}`}
        />
        {isSidebarOpen && (
          <span className={`text-[16px] ml-2 ${isMenuItemActive("history") ? "text-[#0D9488]" : "text-gray-700"}`}>历史记录</span>
        )}
      </div>

      {/* 最近会话 - 只在侧边栏打开时显示 */}
      {isSidebarOpen && (
        <div className="w-full mt-[28px] pl-[60px] relative">
          <div className="absolute left-[38px] top-0 bottom-0 w-px bg-[#ADBDD9]"></div>
          <div className="space-y-[10px] relative">
            {/* 第一次加载时显示加载中 */}
            {conversationsLoading && recentConversations.length === 0 ? (
              <div className="text-gray-500 text-sm">加载中...</div>
            ) : (
              <>
                {recentConversations.length > 0 ? (
                  <TooltipProvider>
                    {recentConversations.slice(0, 5).map((conversation) => (
                      <div key={conversation.conversation_id} className="border-0 outline-none">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className="text-[14px] text-gray-700 cursor-pointer hover:text-[#0D9488] transition-colors duration-200 truncate max-w-[140px] border-0 outline-none focus:outline-none focus:ring-0 hover:bg-transparent hover:border-none"
                              onClick={(e) => onRecentConversationClick(conversation.conversation_id, e)}
                            >
                              {conversation.title || "未命名对话"}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{conversation.title || "未命名对话"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    ))}
                  </TooltipProvider>
                ) : (
                  <div className="text-gray-400 text-sm">暂无最近会话</div>
                )}

                {/* 如果正在加载且有数据，显示加载指示器但不隐藏现有数据 */}
                {conversationsLoading && recentConversations.length > 0 && (
                  <div className="text-gray-400 text-xs animate-pulse">更新中...</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* 侧边栏切换按钮 */}
      <button
        onClick={onToggleSidebar}
        className={`mt-auto mb-[30px] focus:outline-none cursor-pointer ${isSidebarOpen ? "self-end mr-8" : ""}`}
      >
        {isSidebarOpen ? (
          <ChevronLeft className="w-[18px] h-[20px]" />
        ) : (
          <ChevronRight className="w-[18px] h-[20px]" />
        )}
      </button>
    </div>
  );
};

export default Sidebar;