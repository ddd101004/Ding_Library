# AI 伴读 PDF 阅读器技术方案

## 一、功能概述

根据需求，AI 伴读页面左侧需要实现一个 PDF 阅读器，具备以下核心功能：

1. **PDF 文件渲染** - 通过签名 URL 加载并渲染 PDF 文件
2. **文本选中** - 支持用户选中 PDF 中的文本内容
3. **右键/悬浮菜单** - 选中文本后显示操作菜单
4. **AI 功能集成** - 支持标亮、引用、翻译、AI 总结、名词解释等操作

## 二、技术选型

### 2.1 方案：`@react-pdf-viewer/core`

**选择理由：**

1. **内置文本选中支持** - 通过 `@react-pdf-viewer/selection-mode` 插件原生支持
2. **插件生态丰富** - 提供页面导航、缩放、搜索、书签等开箱即用的功能
3. **TypeScript 支持** - 完整的类型定义
4. **项目已有 pdf.js** - `package.json` 中已安装 `pdfjs-dist: ^5.4.394`，兼容性好
5. **活跃维护** - 社区活跃，文档完善

## 三、依赖安装

```bash
# 核心包
pnpm add @react-pdf-viewer/core

# 必要插件
pnpm add @react-pdf-viewer/default-layout    # 默认布局（含工具栏、侧边栏）
pnpm add @react-pdf-viewer/selection-mode    # 文本选中模式
pnpm add @react-pdf-viewer/highlight         # 高亮标注
pnpm add @react-pdf-viewer/search            # 搜索功能

# 样式（必须引入）
# 在组件中需要导入 CSS
```

## 四、核心实现方案

### 4.1 组件架构

```
src/components/ai-reading/
├── PdfViewer/
│   ├── index.tsx              # 主组件入口
│   ├── PdfViewerCore.tsx      # PDF 渲染核心
│   ├── SelectionPopover.tsx   # 选中文本后的悬浮菜单
│   ├── HighlightLayer.tsx     # 高亮标注层
│   └── hooks/
│       ├── useTextSelection.ts    # 文本选中 Hook
│       └── usePdfDocument.ts      # PDF 文档管理 Hook
├── types.ts                   # 类型定义
└── styles.css                 # 样式文件
```

### 4.2 核心组件实现

#### 4.2.1 主组件 `PdfViewer/index.tsx`

```tsx
"use client";
import React, { useState, useCallback } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import { highlightPlugin, Trigger } from "@react-pdf-viewer/highlight";

// 样式导入
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";

import SelectionPopover from "./SelectionPopover";
import { SelectionInfo, AIOperation } from "../types";

interface PdfViewerProps {
  fileUrl: string; // PDF 签名 URL
  onAIOperation: (
    // AI 操作回调
    operation: AIOperation,
    selectedText: string,
    context?: SelectionContext
  ) => void;
}

interface SelectionContext {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
}

const PdfViewer: React.FC<PdfViewerProps> = ({ fileUrl, onAIOperation }) => {
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });

  // 高亮插件配置
  const highlightPluginInstance = highlightPlugin({
    trigger: Trigger.TextSelection,
    renderHighlightTarget: (props) => (
      <div
        style={{
          position: "absolute",
          left: `${props.selectionRegion.left}%`,
          top: `${props.selectionRegion.top}%`,
          width: `${props.selectionRegion.width}%`,
          height: `${props.selectionRegion.height}%`,
        }}
      />
    ),
    renderHighlightContent: (props) => {
      // 获取选中的文本
      const selectedText = props.selectedText;

      if (selectedText && selectedText.trim()) {
        // 计算弹窗位置
        const rect = props.selectionRegion;
        setSelection({
          text: selectedText,
          pageNumber: props.pageIndex + 1,
        });
        setPopoverPosition({
          x: rect.left + rect.width,
          y: rect.top,
        });
      }

      return null;
    },
  });

  // 默认布局插件（可选，提供工具栏）
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: () => [], // 隐藏侧边栏
    toolbarPlugin: {
      fullScreenPlugin: {
        // 全屏配置
      },
    },
  });

  // 处理 AI 操作
  const handleAIOperation = useCallback(
    (operation: AIOperation) => {
      if (selection) {
        onAIOperation(operation, selection.text, {
          pageNumber: selection.pageNumber,
          startOffset: 0,
          endOffset: selection.text.length,
        });
        setSelection(null); // 操作后关闭弹窗
      }
    },
    [selection, onAIOperation]
  );

  // 关闭弹窗
  const handleClosePopover = useCallback(() => {
    setSelection(null);
  }, []);

  return (
    <div className="pdf-viewer-container h-full relative">
      {/* PDF.js Worker */}
      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
        <div className="h-full">
          <Viewer
            fileUrl={fileUrl}
            plugins={[highlightPluginInstance, defaultLayoutPluginInstance]}
            defaultScale={1}
            theme={{
              theme: "light",
            }}
          />
        </div>
      </Worker>

      {/* 选中文本后的悬浮菜单 */}
      {selection && (
        <SelectionPopover
          position={popoverPosition}
          selectedText={selection.text}
          onOperation={handleAIOperation}
          onClose={handleClosePopover}
        />
      )}
    </div>
  );
};

export default PdfViewer;
```

#### 4.2.2 悬浮菜单 `SelectionPopover.tsx`

```tsx
import React from "react";
import { AIOperation } from "../types";

interface SelectionPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  onOperation: (operation: AIOperation) => void;
  onClose: () => void;
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
}) => {
  return (
    <>
      {/* 背景遮罩，点击关闭 */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* 悬浮菜单 */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[100px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translateX(10px)",
        }}
      >
        {OPERATIONS.map((op) => (
          <button
            key={op.key}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            onClick={() => onOperation(op.key)}
          >
            {op.label}
          </button>
        ))}
      </div>
    </>
  );
};

export default SelectionPopover;
```

#### 4.2.3 类型定义 `types.ts`

```tsx
// AI 操作类型
export type AIOperation =
  | "highlight" // 标亮
  | "cite" // 引用
  | "translate" // 翻译
  | "summarize" // AI总结
  | "explain"; // 名词解释

// 选中信息
export interface SelectionInfo {
  text: string;
  pageNumber: number;
  startOffset?: number;
  endOffset?: number;
}

// 高亮标注
export interface Highlight {
  id: string;
  text: string;
  pageNumber: number;
  color: string;
  createdAt: Date;
  position: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

// PDF 文档信息
export interface PdfDocumentInfo {
  numPages: number;
  title?: string;
  author?: string;
}
```

### 4.3 集成到 AI 伴读页面

修改 `AiReadingConversation.tsx`，将左侧文本显示区域替换为 PDF 阅读器：

```tsx
// 在 AiReadingConversation.tsx 中

import PdfViewer from "@/components/ai-reading/PdfViewer";
import { AIOperation } from "@/components/ai-reading/types";

// ... 其他代码

// 处理 AI 操作
const handleAIOperation = useCallback(
  (
    operation: AIOperation,
    selectedText: string,
    context?: SelectionContext
  ) => {
    switch (operation) {
      case "highlight":
        // 添加高亮标注（可存储到后端）
        console.log("添加高亮:", selectedText);
        break;

      case "cite":
        // 将选中文本作为引用添加到输入框
        setCurrentInputText((prev) => prev + `\n\n> ${selectedText}\n\n`);
        break;

      case "translate":
        // 发送翻译请求
        sendMessageWithOperation("translate", selectedText, context);
        break;

      case "summarize":
        // 发送总结请求
        sendMessageWithOperation("summarize", selectedText, context);
        break;

      case "explain":
        // 发送解释请求
        sendMessageWithOperation("explain", selectedText, context);
        break;
    }
  },
  [sendMessageWithId, conversationId]
);

// 发送带操作类型的消息
const sendMessageWithOperation = async (
  operationType: string,
  contextText: string,
  context?: SelectionContext
) => {
  if (!conversationId) return;

  // 构建请求，包含 context_text 和 operation_type
  // ... 发送到 /api/chat/messages/stream
};

// 渲染 - 将左侧替换为 PDF 阅读器
return (
  <div className="flex w-full h-full gap-0">
    {/* 左侧 - PDF 阅读器 */}
    <div className="w-[830px] pr-[50px] overflow-hidden">
      {paperInfo?.file_url ? (
        <PdfViewer
          fileUrl={paperInfo.file_url}
          onAIOperation={handleAIOperation}
        />
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">正在加载论文...</p>
        </div>
      )}
    </div>

    {/* 中间分隔线 */}
    <div className="w-[1px] h-full bg-[#E2E3E7]" />

    {/* 右侧 - AI 对话 */}
    <div className="w-[700px] pl-[30px] flex flex-col">
      {/* ... 对话内容 */}
    </div>
  </div>
);
```

## 五、注意事项

确保 Worker 版本与 `pdfjs-dist` 版本匹配：

```tsx
// 将 pdf.worker.min.js 复制到 public 目录，下载地址：https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js
<Worker workerUrl="/pdf.worker.min.js">
```

## 六、参考资源

- [react-pdf-viewer 官方文档](https://react-pdf-viewer.dev/)
