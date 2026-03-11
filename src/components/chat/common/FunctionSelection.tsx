import React from 'react';
import { useRouter } from 'next/router';

interface FunctionSelectionProps {
  functionType: string;
  onClose: (e: React.MouseEvent) => void; // 统一的关闭处理函数
  isFileParsing?: boolean; // 文件解析状态
}

// 功能类型到图标和标签的映射
const functionConfig = {
  quickQA: {
    icon: '/chat-page/qqqa1.png',
    label: '快问快答'
  },
  deepStudy: {
    icon: '/chat-page/deepstudy1.png',
    label: '深度学习'
  },
  aiReading: {
    icon: '/chat-page/chat-page-reading@2x.png',
    label: 'AI伴读'
  },
  more: {
    icon: '/chat-page/chat-page-more.png',
    label: '更多'
  }
};

const FunctionSelection: React.FC<FunctionSelectionProps> = ({ functionType, onClose, isFileParsing = false }) => {
  const config = functionConfig[functionType as keyof typeof functionConfig];

  if (!config) return null;

  return (
    <div className="relative inline-flex items-center mr-2">
      {/* 功能选择容器 */}
      <div
        className="flex items-center"
        style={{
          width: "140px",
          height: "40px",
          background: "rgba(255,255,255,0)",
          borderRadius: "20px",
          border: "2px solid #6FCF97",
          opacity: 0.7
        }}
      >
        <img
          src={config.icon}
          alt={config.label}
          className="mr-[9px]"
          style={{
            width: "18px",
            height: "18px",
            marginLeft: "28px"
          }}
        />
        <span
          className="font-normal"
          style={{
            fontWeight: 400,
            fontSize: "16px",
            color: "#6FCF97",
            lineHeight: "40px",
          }}
        >
          {config.label}
        </span>
      </div>

      {/* 关闭按钮 */}
      <div className="absolute" style={{ left: "123px", bottom: "28px" }}>
        {isFileParsing ? (
          <>
            {/* 文件解析中：禁用的关闭按钮 */}
            <div
              className="flex items-center justify-center"
              style={{
                width: "18px",
                height: "18px",
                opacity: 0.5,
                cursor: "not-allowed"
              }}
              title="文件解析中，请稍后再关闭"
            >
              <img
                src="/chat-page/cancel1.png"
                alt="关闭"
                className="w-[12px] h-[12px]"
              />
            </div>
          </>
        ) : (
          <>
            {/* 正常状态：可点击的关闭按钮 */}
            <button
              onClick={onClose}
              className="flex items-center justify-center cursor-pointer"
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: "#e0f2e0",
                borderRadius: "10px",
                border: "1px solid #6FCF97"
              }}
            >
              <img
                src="/chat-page/cancel1.png"
                alt="关闭"
                className="w-[10px] h-[10px]"
              />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FunctionSelection;
