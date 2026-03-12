import React from "react";

interface ToolbarProps {
  viewMode: "list" | "grid";
  onViewModeChange: (mode: "list" | "grid") => void;
  onCreateClick: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  viewMode,
  onViewModeChange,
  onCreateClick,
}) => {
  return (
    <div className="absolute right-[30px] top-[167px] flex items-center z-10">
      {/* 添加文件图标 */}
      <button
        onClick={onCreateClick}
        className="w-[40px] h-[40px] flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img
          src="/chat-page/chat-page-add-file@2x.png"
          alt="添加文件"
          width={40}
          height={40}
          className="w-full h-full"
        />
      </button>

      {/* 视图切换容器 */}
      <div className="flex items-center ml-5 w-20 h-10 bg-[#F7F8FA] rounded-[20px] border border-[#C8C9CC] justify-between p-0">
        {/* 列表视图图标 */}
        <button
          className={`w-[40px] h-[40px] rounded-[20px] m-0 flex items-center justify-center transition-all duration-200 ${
            viewMode === "list"
              ? "bg-white shadow-[0px_0px_10px_0px_rgba(89,106,178,0.1)]"
              : "hover:bg-gray-100"
          }`}
          onClick={() => onViewModeChange("list")}
        >
          <img
            src={
              viewMode === "list"
                ? "/slibar/list1.png"
                : "/slibar/slibar-list@2x.png"
            }
            alt="列表视图"
            width={24}
            height={25}
            className="w-[20px] h-[16px]"
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
          <img
            src={
              viewMode === "grid"
                ? "/slibar/photolist1.png"
                : "/slibar/slibar-photolist@2x.png"
            }
            alt="网格视图"
            width={25}
            height={25}
            className="w-[20px] h-[20px]"
          />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
