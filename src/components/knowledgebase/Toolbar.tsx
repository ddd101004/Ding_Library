/**
 * Toolbar — 视图切换工具栏（列表/网格）
 *
 * 【前端】知识库模块通用组件
 *
 * 职责：
 * - 列表视图（List）和网格视图（LayoutGrid）切换按钮
 * - 当前激活视图高亮显示（白色背景+阴影 + 主题色图标）
 * - 固定定位在知识库页面右上角

 * 引用的子组件/hooks/API：
 * - List, LayoutGrid (lucide-react) — 视图切换图标
 *
 * 引用方：
 * - knowledgebase/KnowledgeBasePage.tsx — 知识库主页右上角
 */
import React from "react";
import { List, LayoutGrid } from "lucide-react";

interface ToolbarProps {
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  return (
    <div className="absolute right-[30px] top-[167px] flex items-center z-10">
      {/* 视图切换容器 */}
      <div className="flex items-center w-20 h-10 bg-[#F7F8FA] rounded-[20px] justify-between p-0">
        {/* 列表视图图标 */}
        <button
          className={`w-[40px] h-[40px] rounded-[20px] m-0 flex items-center justify-center transition-all duration-200 ${
            viewMode === "list"
              ? "bg-white shadow-[0px_0px_10px_0px_rgba(89,106,178,0.1)]"
              : "hover:bg-gray-100"
          }`}
          onClick={() => onViewModeChange("list")}
        >
          <List
            className="w-[20px] h-[20px]"
            strokeWidth={2}
            color={viewMode === "list" ? "#0D9488" : "#666666"}
          />
        </button>

        {/* 网格视图图标 */}
        <button
          className={`w-[40px] h-[40px] rounded-[20px] m-0 flex items-center justify-center transition-all duration-200 ${
            viewMode === "grid"
              ? "bg-white shadow-[0px_0px_10px_0px_rgba(89,106,178,0.1)]"
              : "hover:bg-gray-100"
          }`}
          onClick={() => onViewModeChange("grid")}
        >
          <LayoutGrid
            className="w-[20px] h-[20px]"
            strokeWidth={2}
            color={viewMode === "grid" ? "#0D9488" : "#666666"}
          />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
