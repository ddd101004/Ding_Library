import React from 'react';
import { useRouter } from 'next/router';
import { MessageSquare, GraduationCap, X } from 'lucide-react';

interface FunctionSelectionProps {
  functionType: string;
  onClose: (e: React.MouseEvent) => void; // 统一的关闭处理函数
  isFileParsing?: boolean; // 文件解析状态
}

// 功能类型到图标和标签的映射
const functionConfig = {
  quickQA: {
    icon: MessageSquare,
    label: '快问快答'
  },
  deepStudy: {
    icon: GraduationCap,
    label: '深度学习'
  },
  more: {
    icon: MessageSquare, // 暂时使用 MessageSquare，可根据需要修改
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
        {React.createElement(config.icon, {
          className: "mr-[9px]",
          style: {
            width: "18px",
            height: "18px",
            marginLeft: "28px",
            color: "#0D9488"
          }
        })}
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
              <X
                className="w-[12px] h-[12px]"
                style={{ color: "#EC4899" }}
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
              <X
                className="w-[10px] h-[10px]"
                style={{ color: "#EC4899" }}
              />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FunctionSelection;
