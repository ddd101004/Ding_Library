/**
 * 消息版本控制器 — 多版本AI回复的切换按钮（左箭头+版本号+右箭头）
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - 只有多版本(totalVersions>1)时才显示版本切换控件
 * - 显示当前版本号(currentVersion)和总版本数(totalVersions)
 * - 左箭头(ChevronUp)切换到上一版本，右箭头(ChevronDown)切换到下一版本
 * - 第1版本时禁用左箭头，最后版本时禁用右箭头
 * - 流式输出期间隐藏版本切换
 * - 版本号之间使用蓝色圆点(Dot图标)分隔
 *
 * 引用方：
 * - common/MessageActions — 消息操作栏中的版本切换区域
 */
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