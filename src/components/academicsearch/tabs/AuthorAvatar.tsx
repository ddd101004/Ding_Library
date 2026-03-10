"use client";
import React from "react";

interface AuthorAvatarProps {
  author: {
    name?: string;
    name_zh?: string;
  };
  size?: "small" | "medium" | "large";
  showInitial?: boolean;
  imageUrl?: string;
  className?: string;
}

const sizeConfig = {
  small: {
    container: "w-[20px] h-[20px] text-[12px]",
    spacing: "mr-[8px]"
  },
  medium: {
    container: "w-[22px] h-[22px] text-[16px]",
    spacing: "mr-[9px]"
  },
  large: {
    container: "w-[100px] h-[100px] text-[36px]",
    spacing: "mr-[20px]"
  }
};

export default function AuthorAvatar({
  author,
  size = "medium",
  showInitial = true,
  imageUrl,
  className = ""
}: AuthorAvatarProps) {
  // 获取作者姓名
  const authorName = author.name_zh || author.name || "";

  // 获取首字母
  const getAuthorInitial = (name: string): string => {
    if (!name) return "";
    const firstChar = name.trim().charAt(0).toUpperCase();
    return firstChar;
  };

  const config = sizeConfig[size];

  // 如果有图片URL，显示图片
  if (imageUrl) {
    return (
      <div
        className={`flex-shrink-0 rounded-full overflow-hidden ${config.container} ${config.spacing} ${className}`}
      >
        <img
          src={imageUrl}
          alt={`${authorName}的头像`}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  // 显示首字母头像
  if (showInitial && authorName) {
    return (
      <div
        className={`
          flex items-center justify-center rounded-full flex-shrink-0
          bg-[#CCCCCC] text-white
          ${config.container} ${config.spacing} ${className}
        `}
      >
        {getAuthorInitial(authorName)}
      </div>
    );
  }

  // 不显示头像，仅返回间距
  return <div className={`${config.spacing} ${className}`} />;
}

// 用于学者卡片的作者头像组件
export function ScholarAvatar({
  scholar,
  size = "large",
  className = ""
}: {
  scholar: {
    name?: string;
    name_zh?: string;
  };
  size?: "small" | "medium" | "large";
  className?: string;
}) {
  return (
    <AuthorAvatar
      author={scholar}
      size={size}
      imageUrl="/paper/paper-scholar-avartar.png"
      className={className}
    />
  );
}

// 用于论文列表中的作者信息显示
export function AuthorInfo({
  author,
  showName = true,
  nameColor = "text-[#999999]",
  nameSize = "text-[16px]",
  className = ""
}: {
  author: {
    name?: string;
    name_zh?: string;
  };
  showName?: boolean;
  nameColor?: string;
  nameSize?: string;
  className?: string;
}) {
  const authorName = author.name_zh || author.name || "";

  if (!showName || !authorName) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <AuthorAvatar author={author} size="medium" />
      <span className={`${nameColor} ${nameSize}`}>
        {authorName}
      </span>
    </div>
  );
}