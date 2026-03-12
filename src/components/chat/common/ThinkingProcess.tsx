import React from "react";

interface ThinkingProcessProps {
  messageId: string;
  thinking: string;
  isThinkingCollapsed?: boolean;
  isStreaming?: boolean;
  maxWidth?: string;
  onToggleCollapse?: (messageId: string) => void;
}

const ThinkingProcess: React.FC<ThinkingProcessProps> = ({
  messageId,
  thinking,
  isThinkingCollapsed = false,
  isStreaming = false,
  maxWidth,
  onToggleCollapse,
}) => {
  if (!thinking || thinking.trim() === "") return null;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(messageId);
    }
  };

  return (
    <>
      {/* 折叠状态 */}
      {isThinkingCollapsed ? (
        <div
          className="transition-all duration-300 relative flex items-center mb-3 max-w-full w-full"
          style={{
            maxWidth: maxWidth ? maxWidth : "1037px",
            height: "60px",
            background: "rgba(103, 200, 255, 0.05)", // 调整为浅绿基调的背景
            borderRadius: "20px",
            border: "1px solid #d4ede4", // 浅绿色边框
            minWidth: "280px", // 确保最小宽度
          }}
        >
          {/* 左侧成功图标 */}
          <div className="flex items-center" style={{ marginLeft: "30px" }}>
            <img
              src="/chat-page/chat-page-success@2x.png"
              alt="深度思考已完成"
              className="w-[18px] h-[18px]"
            />
            <span
              className="ml-4 font-medium"
              style={{
                fontSize: "16px",
                fontWeight: 500,
                color: "#2d3748", // 调整文字颜色
              }}
            >
              深度思考已折叠
            </span>
          </div>

          {/* 右侧展开图标 */}
          {onToggleCollapse && (
            <div
              className="absolute cursor-pointer flex items-center justify-center hover:bg-[#f0faf6] rounded-full transition-colors"
              style={{
                right: "30px",
                top: "calc(50% + 10px)",
                transform: "translateY(-50%)",
                padding: "10px",
                margin: "-10px",
              }}
              onClick={handleToggleCollapse}
            >
              <img
                src="/chat-page/chat-page-open.png"
                alt="展开思考过程"
                className="w-[13px] h-[9px]"
              />
            </div>
          )}
        </div>
      ) : (
        /* 展开状态 */
        <div
          className="transition-all duration-300 relative -mb-4 max-w-full w-full"
          style={{
            maxWidth: maxWidth ? maxWidth : "1037px",
            background: "rgba(103, 200, 255, 0.05)", // 调整为浅绿基调的背景
            borderRadius: "20px",
            border: "1px solid #d4ede4", // 浅绿色边框
            padding: "16px",
            paddingLeft: "25px",
            minWidth: "280px", // 确保最小宽度
          }}
        >
          {/* 思考过程标题行 */}
          <div className="flex items-center justify-between mb-2">
            <div
              className="flex items-center"
              style={{
                marginTop: "0px",
                marginLeft: "21px",
              }}
            >
              {/* 根据是否正在流式生成来显示不同的图标 */}
              {isStreaming ? (
                // 正在生成时显示旋转的加载图标
                <img
                  src="/chat-page/think1.png"
                  alt="思考中"
                  className="w-7 h-7 animate-spin"
                  style={{ width: "28px", height: "30px" }}
                />
              ) : (
                // 生成完成时显示静态图标
                <img
                  src="/chat-page/think1.png"
                  alt="思考过程"
                  className="w-7 h-7"
                  style={{ width: "28px", height: "30px" }}
                />
              )}
              <span
                className="text-sm font-medium ml-4 mb-2"
                style={{
                  width: "289px",
                  height: "16px",
                  fontWeight: "400",
                  fontSize: "16px",
                  lineHeight: "30px",
                  color: "#2d3748", // 调整文字颜色
                }}
              >
                {isStreaming ? "稍等让ZHITU-AI思考一下" : "思考过程"}
              </span>
            </div>

            {/* 折叠图标 */}
            {onToggleCollapse && (
              <div
                className="absolute cursor-pointer flex items-center justify-center hover:bg-[#f0faf6] rounded-full transition-colors"
                style={{
                  right: "30px",
                  top:"40px",
                  transform: "translateY(-50%)",
                  padding: "10px",
                  margin: "-10px",
                }}
                onClick={handleToggleCollapse}
              >
                <img
                  src="/chat-page/chat-page-close.png"
                  alt="折叠思考过程"
                  className="w-[12px] h-[8px]"
                />
              </div>
            )}
          </div>

          {/* 分割线 - 在标题下方 */}
          <div
            style={{
              width: "calc(100% - 50px)",
              height: "1px",
              background: "#d4ede4", // 浅绿色分割线
              margin: "20px 0",
              marginLeft: "5px",
            }}
          />

          {/* 思考内容区域 */}
          <div className="flex">
            {/* 左侧装饰图标和竖线区域 */}
            <div
              className="flex flex-col items-center flex-shrink-0"
              style={{
                width: "65px",
                marginRight: "16px",
              }}
            >
              {/* 装饰图标 */}
              <div
                className="flex-shrink-0 mb-2"
                style={{
                  marginTop: "22px",
                }}
              >
                <img
                  src="/chat-page/point1.png"
                  alt="思考装饰"
                  className="w-4 h-4"
                />
              </div>

              {/* 竖线 */}
              <div
                style={{
                  width: "1px",
                  minHeight: "1px",
                  background: "#d4ede4", // 浅绿色竖线
                  borderRadius: "1px",
                  flex: 1,
                }}
              />
            </div>

            {/* 思考过程内容 */}
            <div
              className="text-sm whitespace-pre-wrap leading-relaxed flex-1 min-w-0"
              style={{
                fontSize: "14px",
                lineHeight: "1.5",
                paddingTop: "20px",
                maxWidth: "calc(100% - 80px)",
                wordBreak: "break-word", // 确保长文本能够换行
                overflowWrap: "break-word", // 兼容性更好的换行
                color: "#2d3748", // 调整文字颜色
              }}
            >
              {thinking}
              {isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-[#0D9488] animate-bounce"></span> // 调整为主题绿色
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ThinkingProcess;