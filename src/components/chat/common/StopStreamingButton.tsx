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