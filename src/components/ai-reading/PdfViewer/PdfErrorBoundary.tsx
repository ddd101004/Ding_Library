"use client";
import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * PDF 阅读器错误边界组件
 * 捕获 PDF 渲染和交互过程中的 JavaScript 错误，防止整个应用崩溃
 *
 * 主要处理场景：
 * 1. @react-pdf-viewer/highlight 插件的 IndexSizeError
 *    - 当选区边界落在 br/span 等空元素上时触发
 *    - 错误信息：Failed to execute 'setStart' on 'Range': There is no child at offset X
 * 2. PDF 渲染错误
 * 3. PDF 页面切换时的内存错误
 */
class PdfErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 检查是否是可以忽略的选区错误
    const isIgnorableSelectionError =
      error.name === "IndexSizeError" ||
      error.message.includes("setStart") ||
      error.message.includes("setEnd") ||
      error.message.includes("There is no child at offset");

    // 对于选区相关的错误，不显示错误界面，静默处理
    if (isIgnorableSelectionError) {
      console.warn("[PdfErrorBoundary] 忽略选区错误:", error.message);
      return { hasError: false, error: null };
    }

    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 检查是否是可以忽略的错误
    const isIgnorableError =
      error.name === "IndexSizeError" ||
      error.message.includes("setStart") ||
      error.message.includes("setEnd") ||
      error.message.includes("There is no child at offset") ||
      error.message.includes("getRectFromOffsets");

    if (isIgnorableError) {
      // 静默处理，只记录警告
      console.warn("[PdfErrorBoundary] PDF选区错误（已静默处理）:", error.message);
      return;
    }

    // 其他错误正常处理
    console.error("[PdfErrorBoundary] PDF组件错误:", error);
    console.error("[PdfErrorBoundary] 错误堆栈:", errorInfo.componentStack);

    // 调用外部错误处理回调
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              PDF 加载出现问题
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || "文档加载过程中发生错误"}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PdfErrorBoundary;
