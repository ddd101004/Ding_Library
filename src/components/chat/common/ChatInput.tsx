// ChatInput.tsx
import { useRef, useEffect, useImperativeHandle, useState } from 'react';
import React, { forwardRef } from 'react';

interface FileContent {
  content: string;
}

// 定义暴露给父组件的 ref 类型
export interface ChatInputRef {
  focusToEnd: () => void;
  focus: () => void;
  value?: string;
  selectionStart?: number | null;
  selectionEnd?: number | null;
  setSelectionRange?: (start: number, end: number) => void;
}

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxHeight?: number;
  className?: string;
  disabled?: boolean;
  files?: FileContent[];
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void; // 添加 onKeyDown 到 props 接口
}

export default forwardRef<ChatInputRef, ChatInputProps>(({
  value,
  onChange,
  placeholder = '请输入...',
  maxHeight = 150,
  className = '',
  disabled = false,
  onKeyDown, // 从 props 中解构 onKeyDown
}, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    const container = containerRef.current;
    if (!textarea || !container) return;

    // 保存当前光标位置和滚动位置
    const { selectionStart, selectionEnd, scrollTop } = textarea;

    // 重置高度
    textarea.style.height = 'auto';
    
    // 获取当前滚动高度
    const scrollHeight = textarea.scrollHeight;
    
    // 计算行高（基于实际内容）
    const computedStyle = window.getComputedStyle(textarea);
    const lineHeight = parseInt(computedStyle.lineHeight) || 24;
    
    // 计算当前行数
    const currentLines = Math.ceil(scrollHeight / lineHeight);
    
    // 设置高度和滚动
    // 计算最小高度（两行）
    const minHeight = lineHeight * 2;
    textarea.style.minHeight = `${minHeight}px`;

    if (currentLines <= 2) {
      // 2行以内：自动高度，隐藏滚动条
      textarea.style.height = 'auto';
      textarea.style.overflowY = 'hidden';
    } else {
      // 超过2行：设置最大高度，显示滚动条
      textarea.style.maxHeight = `${maxHeight}px`;
      textarea.style.height = 'auto';
      textarea.style.overflowY = 'auto';
    }

    // 恢复滚动位置和光标位置
    textarea.scrollTop = scrollTop;
    if (document.activeElement === textarea) {
      textarea.setSelectionRange(selectionStart, selectionEnd);
    }
  };

  useEffect(() => {
    if (!isComposing) {
      adjustHeight();
    }
  }, [value, isComposing, maxHeight]);

  
  // 监听容器宽度变化
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      adjustHeight();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!disabled) {
      onChange(e.target.value);
    }
  };

  // 设置光标到文字末尾的方法
  const focusToEnd = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => {
    const textarea = textareaRef.current;
    return {
      focusToEnd,
      focus: () => textarea?.focus(),
      value: textarea?.value,
      selectionStart: textarea?.selectionStart,
      selectionEnd: textarea?.selectionEnd,
      setSelectionRange: (start: number, end: number) => textarea?.setSelectionRange(start, end),
    };
  });

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = () => {
    setIsComposing(false);
    setTimeout(adjustHeight, 0);
  };

  return (
    <div ref={containerRef} className="w-full h-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
        onKeyDown={onKeyDown} 
        placeholder={placeholder}
        disabled={disabled}
        className={`text-xl text-gray-700 bg-transparent border-none focus:outline-none resize-none w-full ${className} ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        rows={1}
        style={{
          minHeight: '28px',
          lineHeight: '1.5',
          width: '100%',
        }}
      />
    </div>
  );
});