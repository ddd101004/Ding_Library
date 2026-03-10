"use client";
import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useReducer,
} from "react";
import { Viewer, Worker, CharacterMap, PdfJs, SpecialZoomLevel } from "@react-pdf-viewer/core";
import { highlightPlugin, Trigger } from "@react-pdf-viewer/highlight";
import { selectionModePlugin } from "@react-pdf-viewer/selection-mode";
import { PDFJS_CMAP_URL, PDFJS_STANDARD_FONT_DATA_URL } from "@/constants";
import {
  PdfHighlightArea,
  normalizeHighlightAreas,
} from "@/utils/pdfHighlight";
import SelectionPopover from "./SelectionPopover";
import PdfErrorBoundary from "./PdfErrorBoundary";
import { SelectionInfo, AIOperation, SelectionContext } from "../types";

// 样式导入
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";
import "@react-pdf-viewer/highlight/lib/styles/index.css";
import "@react-pdf-viewer/selection-mode/lib/styles/index.css";

// CMap 配置 - 用于支持 CJK（中日韩）字符正确显示
const characterMap: CharacterMap = {
  isCompressed: true,
  url: PDFJS_CMAP_URL,
};

// 扩展 GetDocumentParams 类型以包含 PDF.js 额外参数
// PDF.js 底层支持这些参数，但 @react-pdf-viewer 类型定义中未声明
interface ExtendedGetDocumentParams extends PdfJs.GetDocumentParams {
  standardFontDataUrl?: string;
}

// 转换 PDF.js 文档加载参数，添加标准字体和字符映射支持
const transformGetDocumentParams = (
  options: PdfJs.GetDocumentParams
): PdfJs.GetDocumentParams => {
  const extendedOptions = options as ExtendedGetDocumentParams;
  return {
    ...extendedOptions,
    // 标准字体支持
    standardFontDataUrl: PDFJS_STANDARD_FONT_DATA_URL,
  } as PdfJs.GetDocumentParams;
};

// 选中区域信息（包含坐标）
interface SelectionWithArea extends SelectionInfo {
  areas: PdfHighlightArea[]; // 选中区域可能跨多行
}

interface PdfViewerProps {
  fileUrl: string; // PDF 签名 URL
  uploadedPaperId?: string; // 论文ID，用于保存标注
  highlightAreas?: PdfHighlightArea[]; // 需要高亮的精确区域（外部传入）
  onAIOperation: (
    operation: AIOperation,
    selectedText: string,
    context?: SelectionContext
  ) => void;
  onHighlight?: (highlightData: {
    text: string;
    pageNumber: number;
    positionJson: object;
    areas: PdfHighlightArea[];
  }) => void; // 用户点击标亮时的回调，传递完整的标注数据
  isAiResponding?: boolean; // AI是否正在回复
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  fileUrl,
  uploadedPaperId,
  highlightAreas = [],
  onAIOperation,
  onHighlight,
  isAiResponding = false,
}) => {
  const [selection, setSelection] = useState<SelectionWithArea | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastWidthRef = useRef(0);

  // 用于保存当前选中区域的坐标（从 highlightPlugin 获取）
  const currentSelectionAreasRef = useRef<PdfHighlightArea[]>([]);

  // 组件内部维护的用户高亮状态（点击标亮后立即显示）
  const [userHighlights, setUserHighlights] = useState<PdfHighlightArea[]>([]);

  // 合并外部传入的高亮和用户添加的高亮
  const allHighlightAreas = [...highlightAreas, ...userHighlights];

  // 使用强制更新来确保高亮区域变化时能重新渲染
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  // 全局错误监听，捕获 highlight 插件内部抛出的异步错误
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // 检查是否是 highlight 插件的已知错误
      const isHighlightPluginError =
        event.message.includes("setStart") ||
        event.message.includes("setEnd") ||
        event.message.includes("There is no child at offset") ||
        event.message.includes("getRectFromOffsets") ||
        event.error?.name === "IndexSizeError";

      if (isHighlightPluginError) {
        // 阻止错误冒泡，静默处理
        event.preventDefault();
        event.stopPropagation();
        console.warn(
          "[PdfViewer] 已捕获并忽略 highlight 插件错误:",
          event.message
        );
        return true;
      }
    };

    // 同时监听 unhandledrejection（Promise 错误）
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason?.message || String(event.reason);
      const isHighlightPluginError =
        errorMessage.includes("setStart") ||
        errorMessage.includes("setEnd") ||
        errorMessage.includes("There is no child at offset") ||
        errorMessage.includes("getRectFromOffsets");

      if (isHighlightPluginError) {
        event.preventDefault();
        console.warn(
          "[PdfViewer] 已捕获并忽略 highlight 插件 Promise 错误:",
          errorMessage
        );
        return true;
      }
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
    };
  }, []);

  // 当highlightAreas变化时强制重新渲染
  useEffect(() => {
    forceUpdate();
  }, [highlightAreas.length]);

  // 监听容器宽度变化，触发 PDF 重新缩放
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 初始化宽度
    const initialWidth = container.offsetWidth;
    setContainerWidth(initialWidth);
    lastWidthRef.current = initialWidth;

    let resizeTimer: NodeJS.Timeout;
    // 使用 ResizeObserver 监听容器宽度变化
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        const newWidth = Math.floor(width);

        // 防抖：只在宽度变化超过 50px 时才更新，避免频繁重新渲染
        if (Math.abs(newWidth - lastWidthRef.current) > 50) {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            setContainerWidth(newWidth);
            lastWidthRef.current = newWidth;
          }, 100);
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(resizeTimer);
    };
  }, []);

  // 监听鼠标抬起事件，获取选中文本和弹窗位置
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    // 延迟执行，等待 highlightPlugin 处理完选区
    setTimeout(() => {
      try {
        const selectedText = window.getSelection()?.toString().trim();
        if (
          selectedText &&
          selectedText.length > 0 &&
          currentSelectionAreasRef.current.length > 0
        ) {
          setSelection({
            text: selectedText,
            pageNumber: currentSelectionAreasRef.current[0]?.pageIndex + 1 || 1,
            areas: [...currentSelectionAreasRef.current],
          });
          setPopoverPosition({
            x: e.clientX,
            y: e.clientY,
          });
        }
      } catch (error) {
        // 静默处理选区相关错误（如 IndexSizeError）
        // 这些错误来自 @react-pdf-viewer/highlight 插件的已知问题
        console.warn("[PdfViewer] 选区处理出错（已静默处理）:", error);
      }
    }, 50);
  }, []);

  // 文本选择插件配置
  const selectionModePluginInstance = selectionModePlugin();

  // 高亮插件配置
  const highlightPluginInstance = highlightPlugin({
    trigger: Trigger.TextSelection,
    // 捕获选中区域的坐标（不渲染可见元素，避免与浏览器选中效果重叠）
    renderHighlightTarget: (props) => {
      try {
        // 保存选中区域坐标到 ref
        currentSelectionAreasRef.current = props.highlightAreas.map((area) => ({
          pageIndex: area.pageIndex,
          left: area.left,
          top: area.top,
          width: area.width,
          height: area.height,
        }));
      } catch (error) {
        // 静默处理坐标提取错误
        console.warn("[PdfViewer] 高亮区域提取出错:", error);
        currentSelectionAreasRef.current = [];
      }
      // 返回空元素，不显示任何内容
      return <></>;
    },
    // 渲染已保存的高亮区域（外部传入 + 用户添加）
    renderHighlights: (props) => {
      const pageHighlights = allHighlightAreas.filter(
        (area) => area.pageIndex === props.pageIndex
      );

      if (pageHighlights.length === 0) {
        return <></>;
      }

      return (
        <>
          {pageHighlights.map((area, idx) => {
            const style = {
              position: "absolute" as const,
              left: `${area.left}%`,
              top: `${area.top}%`,
              width: `${area.width}%`,
              height: `${area.height}%`,
              backgroundColor: area.color || "rgba(59, 130, 246, 0.3)",
              pointerEvents: "none" as const,
              zIndex: 1,
            };
            return (
              <div
                key={`highlight-${props.pageIndex}-${idx}-${Date.now()}`} // 添加时间戳确保key唯一
                style={style}
              />
            );
          })}
        </>
      );
    },
  });

  // 处理 AI 操作
  const handleAIOperation = useCallback(
    (operation: AIOperation) => {
      if (selection) {
        // 如果是标亮操作，添加到本地高亮状态并保存到后端
        if (operation === "highlight" && selection.areas.length > 0) {
          // 规范化高亮区域（统一高度、对齐基线）
          const normalizedAreas = normalizeHighlightAreas(selection.areas);
          const newHighlights = normalizedAreas.map((area) => ({
            ...area,
            color: "rgba(59, 130, 246, 0.3)", // 蓝色高亮
          }));
          setUserHighlights((prev) => [...prev, ...newHighlights]);

          // 转换位置信息为API需要的格式
          const positionJson = normalizedAreas.map((area) => ({
            page_number: selection.pageNumber,
            left: Math.round(area.left * 1000) / 1000, // 保留3位小数
            top: Math.round(area.top * 1000) / 1000,
            width: Math.round(area.width * 1000) / 1000,
            height: Math.round(area.height * 1000) / 1000,
            page_index: area.pageIndex,
          }));

          // 通知父组件，传递完整的标注数据用于API调用
          if (onHighlight) {
            onHighlight({
              text: selection.text,
              pageNumber: selection.pageNumber,
              positionJson: positionJson,
              areas: normalizedAreas,
            });
          }
        }

        onAIOperation(operation, selection.text, {
          pageNumber: selection.pageNumber,
          startOffset: 0,
          endOffset: selection.text.length,
        });
        setSelection(null);
        currentSelectionAreasRef.current = [];
        window.getSelection()?.removeAllRanges();
      }
    },
    [selection, onAIOperation, onHighlight]
  );

  // 关闭弹窗
  const handleClosePopover = useCallback(() => {
    setSelection(null);
    currentSelectionAreasRef.current = [];
    window.getSelection()?.removeAllRanges();
  }, []);

  return (
    <div
      ref={containerRef}
      className="pdf-viewer-container h-full relative w-full"
      onMouseUp={handleMouseUp}
      style={{
        width: '100%',
        maxWidth: '100%',
        // 在最外层容器设置 --scale-factor CSS 变量
        // PDF.js 会动态更新这个值，这里提供初始值避免警告
        '--scale-factor': '1',
      } as React.CSSProperties}
    >
      {/* PDF.js Worker - 用错误边界包裹以防止渲染崩溃 */}
      <PdfErrorBoundary>
        <Worker workerUrl="/pdf.worker.min.js">
          <div className="h-full" style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <Viewer
              key={containerWidth}
              fileUrl={fileUrl}
              characterMap={characterMap}
              transformGetDocumentParams={transformGetDocumentParams}
              plugins={[selectionModePluginInstance, highlightPluginInstance]}
              defaultScale={SpecialZoomLevel.PageWidth}
              theme={{
                theme: "light",
              }}
            />
          </div>
        </Worker>
      </PdfErrorBoundary>

      {/* 选中文本后的悬浮菜单 */}
      {selection && (
        <SelectionPopover
          position={popoverPosition}
          selectedText={selection.text}
          onOperation={handleAIOperation}
          onClose={handleClosePopover}
          isAiResponding={isAiResponding}
        />
      )}
    </div>
  );
};

export default PdfViewer;
