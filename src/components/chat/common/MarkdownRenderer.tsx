import React from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

interface RelatedPaper {
  index: number;
  id: string;
  title: string;
  authors: string[];
  publication_name?: string;
  publication_year?: number;
  abstract?: string;
  doi?: string;
  source: string;
  source_id: string;
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  relatedPapers?: RelatedPaper[] | null;
  onReferenceClick?: (paperIndex: number, element: HTMLElement) => void;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = "",
  relatedPapers,
  onReferenceClick,
}) => {
  // 处理引用标记点击
  const handleReferenceClick = (
    e: React.MouseEvent<HTMLSpanElement>,
    paperIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (onReferenceClick) {
      onReferenceClick(paperIndex, e.currentTarget);
    }
  };

  // 处理文本中的引用标记
  const processText = (text: string): React.ReactNode => {
    // 分割文本，识别引用标记 [1], [2] 等
    const parts = text.split(/(\[\d+\])/);

    return parts.map((part, index) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const paperIndex = parseInt(match[1]);
        return (
          <span
            key={index}
            style={{
              color: "#0D9488",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
              borderRadius: "3px",
              padding: "1px 3px",
              transition: "all 0.2s ease",
              backgroundColor: "transparent",
              display: "inline-block",
              position: "relative",
            }}
            data-index={paperIndex}
            className="reference-mark"
            onClick={(e) => handleReferenceClick(e, paperIndex)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dbeafe";
              e.currentTarget.style.transform = "scale(1.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            [{paperIndex}]
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <style jsx global>{`
        /* 强制引用标记样式 */
        .reference-mark {
          color: #0D9488 !important;
          font-weight: 600 !important;
          cursor: pointer !important;
          text-decoration: none !important;
          border-radius: 3px !important;
          padding: 1px 3px !important;
          transition: all 0.2s ease !important;
          display: inline-block !important;
        }

        .reference-mark:hover {
          background-color: #dbeafe !important;
          transform: scale(1.05) !important;
        }

        /* 表格样式 */
        .prose table,
        .markdown-table {
          border-collapse: collapse !important;
          margin: 1em 0 !important;
          width: 100% !important;
          border: 1px solid #e5e7eb !important;
        }

        .prose th,
        .markdown-table-header {
          background-color: #eff6ff !important; /* 浅蓝色背景 */
          border: 1px solid #e5e7eb !important;
          padding: 8px 12px !important;
          text-align: left !important;
          font-weight: 600 !important;
          color: #374151 !important;
        }

        .prose td,
        .markdown-table-cell {
          border: 1px solid #e5e7eb !important;
          padding: 8px 12px !important;
          text-align: left !important;
          color: #374151 !important;
        }

        .prose tr:nth-child(even),
        .markdown-table tr:nth-child(even) {
          background-color: #f9fafb !important;
        }

        .prose tr:hover,
        .markdown-table tr:hover {
          background-color: #f3f4f6 !important;
        }

        /* 紧凑间距 - 使用 Flexbox 消除空白文本节点 */
        .prose.prose-sm {
          line-height: 1.6 !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.6em !important;
        }

        .prose.prose-sm > * {
          margin: 0 !important;
        }

        .prose.prose-sm > :first-child {
          margin-top: 0 !important;
        }

        .prose.prose-sm ul,
        .prose.prose-sm ol {
          padding-left: 1.25em !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 0.1em !important;
        }

        .prose.prose-sm li {
          margin: 0 !important;
          padding-left: 0.25em !important;
          display: list-item !important;
        }

        .prose.prose-sm li p {
          margin: 0 !important;
        }

        .prose.prose-sm blockquote {
          padding-left: 0.75em !important;
        }

        .prose.prose-sm code {
          font-size: 0.8em !important;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // 标题级别元素
          h1({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <h1>{processedChildren}</h1>;
          },
          h2({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <h2>{processedChildren}</h2>;
          },
          h3({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <h3>{processedChildren}</h3>;
          },
          h4({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <h4>{processedChildren}</h4>;
          },
          h5({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <h5>{processedChildren}</h5>;
          },
          h6({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <h6>{processedChildren}</h6>;
          },
          // 段落
          p({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <p>{processedChildren}</p>;
          },
          // 列表项
          li({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <li>{processedChildren}</li>;
          },
          // 引用块
          blockquote({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <blockquote>{processedChildren}</blockquote>;
          },
          // 表格
          table({ children }) {
            return <table className="markdown-table">{children}</table>;
          },
          // 表格单元格
          td({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <td className="markdown-table-cell">{processedChildren}</td>;
          },
          th({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return (
              <th className="markdown-table-header">{processedChildren}</th>
            );
          },
          // 强调文本
          strong({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <strong>{processedChildren}</strong>;
          },
          // 斜体文本
          em({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <em>{processedChildren}</em>;
          },
          // 代码文本
          code({ children }) {
            const processedChildren = React.Children.map(children, (child) => {
              if (typeof child === "string") {
                return processText(child);
              }
              return child;
            });
            return <code>{processedChildren}</code>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownRenderer;
