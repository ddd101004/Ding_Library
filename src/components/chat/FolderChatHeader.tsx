import React from "react";
import { useRouter } from "next/router";

interface FolderChatHeaderProps {
  conversationDetail: {
    conversation_type?: string;
    title?: string;
  } | null;
  isFolderChat?: string | string[] | undefined;
}

/**
 * 文件夹对话头部组件
 * 显示返回按钮和文件夹标题
 */
export default function FolderChatHeader({
  conversationDetail,
  isFolderChat,
}: FolderChatHeaderProps) {
  const router = useRouter();

  const handleBackClick = () => {
    if (isFolderChat === "true") {
      router.back();
    } else {
      router.push("/chat");
    }
  };

  const handleTitleClick = () => {
    if (isFolderChat === "true") {
      router.back();
    } else {
      router.push("/knowledge-base");
    }
  };

  if (conversationDetail?.conversation_type !== "folder_rag") {
    return null;
  }

  return (
    <div
      className="flex items-center h-[60px] flex-shrink-0 sticky top-0 bg-white z-10"
      style={{ marginLeft: "20px", paddingTop: "10px" }}
    >
      <img
        src="/paper/paper-details.png"
        alt="返回"
        className="w-[10px] h-[10px] cursor-pointer mr-3"
        onClick={handleBackClick}
      />
      <span
        className="text-[#333333] cursor-pointer"
        style={{
          fontWeight: 500,
          fontSize: "14px",
        }}
        onClick={handleTitleClick}
      >
        {conversationDetail?.title}
      </span>
    </div>
  );
}
