import React, { useState, useCallback, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CopyButtonProps {
  content: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "text" | "button";
  children?: React.ReactNode;
  disabled?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  showStatusIndicator?: boolean;
}

// 尺寸配置
const SIZE_CONFIG = {
  sm: { width: 16, height: 16 },
  md: { width: 21, height: 20 },
  lg: { width: 24, height: 24 },
} as const;

/**
 * 封装的复制按钮组件
 *
 * 功能特性：
 * - 支持多种样式和尺寸
 * - 自动处理复制成功/失败状态
 * - 集成 sonner toast 通知
 * - 支持自定义成功/错误回调
 * - 兼容性检测和降级处理
 * - 防重复点击保护
 * - 可选的状态指示器
 */
const CopyButton: React.FC<CopyButtonProps> = ({
  content,
  className = "",
  size = "md",
  variant = "icon",
  children,
  disabled = false,
  successMessage = "已复制到剪贴板",
  errorMessage = "复制失败，请重试",
  onSuccess,
  onError,
  showStatusIndicator = true,
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 清除定时器
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // 重置状态
  const resetState = useCallback(() => {
    setIsCopied(false);
    setError(null);
    clearTimer();
  }, [clearTimer]);

  // 检查剪贴板API可用性
  const isClipboardAvailable = useCallback(() => {
    return (
      typeof navigator !== "undefined" &&
      "clipboard" in navigator &&
      "writeText" in navigator.clipboard
    );
  }, []);

  // 降级复制方法（兼容旧浏览器）
  const fallbackCopy = useCallback(async (text: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);

        if (successful) {
          resolve();
        } else {
          reject(new Error("降级复制方法失败"));
        }
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  // 执行复制操作
  const performCopy = useCallback(async (text: string): Promise<void> => {
    // 优先使用现代 Clipboard API
    if (isClipboardAvailable()) {
      return navigator.clipboard.writeText(text);
    }

    // 降级到传统方法
    return fallbackCopy(text);
  }, [isClipboardAvailable, fallbackCopy]);

  // 处理复制点击
  const handleCopy = useCallback(async () => {
    if (isCopying || disabled) {
      return;
    }

    if (!content) {
      toast.warning("内容为空，无法复制");
      return;
    }

    setIsCopying(true);
    setError(null);
    clearTimer();

    try {
      // 去除内容首尾空白
      const textToCopy = content.trim();

      if (!textToCopy) {
        toast.warning("内容为空，无法复制");
        return;
      }

      // 执行复制
      await performCopy(textToCopy);

      // 设置成功状态
      setIsCopied(true);

      // 显示成功提示
      if (showStatusIndicator) {
        toast.success(successMessage);
      }

      // 调用成功回调
      onSuccess?.();

      // 3秒后自动重置状态，恢复默认图标
      timeoutRef.current = setTimeout(() => {
        resetState();
      }, 3000);


    } catch (error) {
      
      const errorObj = error as Error;
      setError(errorObj.message);

      // 显示错误提示
      const displayMessage = errorMessage.includes("{error}")
        ? errorMessage.replace("{error}", errorObj.message)
        : errorMessage;

      toast.error(displayMessage);

      // 调用错误回调
      onError?.(errorObj);

      // 3秒后重置错误状态
      timeoutRef.current = setTimeout(() => {
        resetState();
      }, 3000);

    } finally {
      setIsCopying(false);
    }
  }, [
    isCopying,
    disabled,
    content,
    clearTimer,
    performCopy,
    showStatusIndicator,
    successMessage,
    errorMessage,
    onSuccess,
    onError,
    resetState,
  ]);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  // 渲染不同变体
  if (variant === "text" && children) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              disabled={disabled || isCopying}
              className={`inline-flex items-center gap-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80 ${className}`}
            >
              {children}
              {showStatusIndicator && isCopied && (
                <span className="text-green-600 text-sm font-medium">已复制</span>
              )}
              {showStatusIndicator && error && (
                <span className="text-red-600 text-sm">复制失败</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? "已复制" : "复制内容"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "button" && children) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleCopy}
              disabled={disabled || isCopying}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 ${className}`}
            >
              {isCopying ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                isCopied ? (
                  <Check
                    width={SIZE_CONFIG[size].width}
                    height={SIZE_CONFIG[size].height}
                    className="text-green-600"
                  />
                ) : (
                  <Copy
                    width={SIZE_CONFIG[size].width}
                    height={SIZE_CONFIG[size].height}
                  />
                )
              )}
              <span>{children}</span>
              {showStatusIndicator && isCopied && (
                <span className="text-green-600 text-sm">✓</span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isCopied ? "已复制" : "复制内容"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // 默认图标变体
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            disabled={disabled || isCopying}
            className={`cursor-pointer transition-all duration-200 disabled:opacity-60 hover:opacity-80 ${className}`}
            style={{
              width: `${sizeConfig.width}px`,
              height: `${sizeConfig.height}px`,
            }}
          >
            {isCopying ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mx-auto"></div>
            ) : (
              isCopied ? (
                <Check
                  width={sizeConfig.width}
                  height={sizeConfig.height}
                  className="block text-green-600"
                />
              ) : (
                <Copy
                  width={sizeConfig.width}
                  height={sizeConfig.height}
                  className="block"
                />
              )
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{isCopied ? "已复制" : "复制内容"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default CopyButton;