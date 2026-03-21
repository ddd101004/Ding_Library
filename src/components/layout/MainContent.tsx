import React from "react";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";

interface MainContentProps {
  children: React.ReactNode;
  isChatHome: boolean;
  isCheckedChat: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  username: string;
  functionType?: string;
  isHydrated: boolean;
  isSmallScreen?: boolean;
  isSidebarOpen?: boolean;
  isKnowledgeBase?: boolean;
}

const MainContent: React.FC<MainContentProps> = ({
  children,
  isChatHome,
  isCheckedChat,
  backgroundImage,
  backgroundColor = "#f0faf6", // 默认值改为浅绿
  username,
  functionType,
  isSmallScreen = false,
  isSidebarOpen = false,
  isKnowledgeBase = false,
}) => {
  const { containerRef: scrollContainerRef } = useAutoHideScrollbar();

  // 根据时间生成问候语
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) return "早上好";
    if (hour >= 9 && hour < 12) return "上午好";
    if (hour >= 12 && hour < 14) return "中午好";
    if (hour >= 14 && hour < 18) return "下午好";
    return "晚上好"; // 18:00-次日06:00统一为晚上
  };

  // 根据功能类型获取标题和描述
  const getFunctionTitleAndDescription = () => {
    switch (functionType) {
      case "quickQA":
        return {
          title: "快问快答",
          description: "更懂人的AI学术系统，遇见对你有用的知识",
        };
      case "deepStudy":
        return {
          title: "深度学习",
          description: "带您遨游知识的海洋",
        };
      default:
        return {
          title: "深度学习",
          description: "带您探索遨游知识的海洋",
        };
    }
  };

  const functionInfo = getFunctionTitleAndDescription();

  return (
    <div
      className={`flex-1 flex flex-col ${
        isKnowledgeBase
          ? "" // 知识库页面：不需要圆角和背景
          : "rounded-[20px]" // 移除原有的白色背景类，改为通过style控制
      } ${
        isSmallScreen
          ? "mx-0 min-w-0" // 小屏幕时移除边距限制，允许充分利用空间
          : "flex-1 min-w-0" // 大屏幕时确保充分利用剩余空间
      }`}
      style={{
        backgroundImage: isKnowledgeBase ? "none" : (backgroundImage ? `url('${backgroundImage}')` : "none"),
        // 调整背景色逻辑：知识库透明，其他情况使用传入的背景色（默认浅绿）
        backgroundColor: isKnowledgeBase 
          ? "transparent" 
          : (backgroundColor || "#F0FDF4"), // 默认浅绿 #F0FDF4
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        // 添加轻微的边框，增强视觉层次感
        border: isKnowledgeBase ? "none" : "1px solid #d4ede4",
        // 非知识库页面添加轻微阴影
        boxShadow: isKnowledgeBase ? "none" : "0 2px 8px rgba(198, 242, 224, 0.2)",
      }}
    >
      {isChatHome ? (
        <div className={`flex-1 flex justify-center items-center w-full max-w-7xl mx-auto ${
          isSmallScreen ? "px-4" : ""
        }`}>
          <div className="relative responsive-container">
            {children}
          </div>
        </div>
      ) : isCheckedChat ? (
        <div className={`flex-1 flex justify-center items-center w-full max-w-7xl mx-auto ${
          isSmallScreen ? "px-4" : ""
        }`}>
          <div className="relative responsive-container w-full">
            <div className={`absolute text-gray-900 flex flex-col items-center gap-[20px] z-30 ${
              isSmallScreen
                ? "left-0 top-[-120px] w-full text-center"
                : "left-1/2 top-[-280px] transform -translate-x-1/2"
            }`}>
              <div className={`${isSmallScreen ? "text-[36px]" : "text-[60px]"} font-medium`}>
                {functionInfo.title}
              </div>
              <div className={`${isSmallScreen ? "text-[16px] px-4" : "text-[24px]"} text-center`}>
                {functionInfo.description}
              </div>
            </div>
            {children}
          </div>
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className={`flex-1 overflow-x-hidden ${
            isKnowledgeBase
              ? "" // 知识库页面：不需要滚动条
              : "overflow-y-auto auto-hide-scrollbar" // 其他页面：保留滚动条
          } ${
            isKnowledgeBase
              ? ""
              : isSmallScreen ? "p-2 sm:p-3 md:p-4" : "p-6 sm:p-7 md:p-8"
          }`}
          // 滚动容器添加轻微的背景色，增强可读性
          style={{
            backgroundColor: isKnowledgeBase ? "transparent" : "rgba(255, 255, 255, 0.85)",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default MainContent;