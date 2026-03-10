import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageVersionControlProps {
  totalVersions: number;
  currentVersion: number;
  onPreviousVersion: () => void;
  onNextVersion: () => void;
  isStreaming?: boolean;
}

const MessageVersionControl: React.FC<MessageVersionControlProps> = ({
  totalVersions,
  currentVersion,
  onPreviousVersion,
  onNextVersion,
  isStreaming = false,
}) => {
  // 如果只有一个版本或正在流式输出，不显示版本控制
  if (totalVersions <= 1 || isStreaming) {
    return null;
  }

  return (
    <TooltipProvider>
      <div className="flex items-center">
        {/* 上一个版本按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onPreviousVersion}
              disabled={currentVersion <= 1}
              className={`transition-opacity ${
                currentVersion <= 1
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:opacity-80"
              }`}
              style={{
                padding: 0,
                background: "none",
                border: "none",
              }}
            >
              <img
                src="/paper/paper-details.png"
                alt="上一个版本"
                style={{ width: "12px", height: "12px" }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>上一个版本</p>
          </TooltipContent>
        </Tooltip>

        {/* 版本计数器 */}
        <span className="text-sm text-gray-600 mx-2 select-none whitespace-nowrap">
          {currentVersion}/{totalVersions}
        </span>

        {/* 下一个版本按钮 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onNextVersion}
              disabled={currentVersion >= totalVersions}
              className={`transition-opacity ${
                currentVersion >= totalVersions
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer hover:opacity-80"
              }`}
              style={{
                padding: 0,
                background: "none",
                border: "none",
              }}
            >
              <img
                src="/paper/paper-last.png"
                alt="下一个版本"
                style={{ width: "12px", height: "12px" }}
              />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>下一个版本</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default MessageVersionControl;