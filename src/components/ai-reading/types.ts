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

// 选中的上下文
export interface SelectionContext {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
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