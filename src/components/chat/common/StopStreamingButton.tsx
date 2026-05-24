/**
 * 停止流式输出按钮 — 流式输出期间显示的停止按钮，点击终止SSE连接
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - 流式输出中(isStreaming=true)显示停止按钮(图标+文字)
 * - 点击调用onStop回调终止SSE连接和流式渲染
 * - 使用图片icon(/chat-page/chat-page-stopchat@2x.png)作为按钮图标
 * - 非流式状态或onStop未定义时不渲染(返回null)
 *
 * 引用方：
 * - common/ChatMessage — AI消息流式输出中显示
 */
import React from "react";

interface StopStreamingButtonProps {
  onStop?: () => void;
  hasThinking?: boolean;
  isStreaming?: boolean;
}

const StopStreamingButton: React.FC<StopStreamingButtonProps> = ({
  onStop,
  hasThinking = false,
  isStreaming = true,
}) => {
  if (!isStreaming || !onStop) {
    return null;
  }

  return (
    <div className="mt-4">
      <button
        className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors bg-white border border-[#C8C9CC] rounded-[20px] px-4 py-2"
        style={{
          width: "140px",
          height: "40px",
          background: "#FFFFFF",
          borderRadius: "20px",
          border: "1px solid #C8C9CC",
        }}
        onClick={onStop}
      >
        <img
          src="/chat-page/chat-page-stopchat@2x.png"
          alt="停止输出"
          className="w-4 h-4 mr-2"
        />
        <span>停止输出</span>
      </button>
    </div>
  );
};

export default StopStreamingButton;