import React from "react";
import { AIOperation } from "../types";

interface SelectionPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  onOperation: (operation: AIOperation) => void;
  onClose: () => void;
  isAiResponding?: boolean; // AI是否正在回复
}

const OPERATIONS: { key: AIOperation; label: string; icon?: string }[] = [
  { key: "highlight", label: "标亮" },
  { key: "cite", label: "引用" },
  { key: "translate", label: "翻译" },
  { key: "summarize", label: "AI总结" },
  { key: "explain", label: "名词解释" },
];

const SelectionPopover: React.FC<SelectionPopoverProps> = ({
  position,
  selectedText,
  onOperation,
  onClose,
  isAiResponding = false,
}) => {
  // 阻止事件冒泡，防止触发父容器的 onMouseUp
  const handleClick = (e: React.MouseEvent, operation: AIOperation) => {
    e.stopPropagation();
    // 如果AI正在回复且是需要禁用的操作，则不执行
    if (isAiResponding && ['translate', 'summarize', 'explain'].includes(operation)) {
      return;
    }
    onOperation(operation);
  };

  // 判断操作是否应该被禁用
  const isOperationDisabled = (operation: AIOperation) => {
    return isAiResponding && ['translate', 'summarize', 'explain'].includes(operation);
  };

  // 获取按钮的样式类
  const getButtonClass = (operation: AIOperation) => {
    const baseClass = "w-full px-4 py-2 text-left text-sm transition-colors ";

    if (isOperationDisabled(operation)) {
      return baseClass + "text-gray-400 cursor-not-allowed";
    }

    return baseClass + "text-gray-700 hover:bg-blue-50 hover:text-blue-600";
  };

  // 获取按钮的提示文本
  const getButtonTitle = (operation: AIOperation) => {
    if (isOperationDisabled(operation)) {
      return "AI正在回复中";
    }
    return undefined;
  };

  return (
    <>
      {/* 背景遮罩，点击关闭 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* 悬浮菜单 */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 w-[120px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translateX(10px)",
        }}
        onMouseUp={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
      >
        {OPERATIONS.map((op) => (
          <button
            key={op.key}
            className={getButtonClass(op.key)}
            onClick={(e) => handleClick(e, op.key)}
            title={getButtonTitle(op.key)}
            disabled={isOperationDisabled(op.key)}
          >
            {op.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default SelectionPopover;
