/**
 * AvatarContext — 用户头像上下文
 *
 * 【前端】全局上下文
 *
 * 导出：
 * - AvatarProvider — 上下文Provider，管理头像URL和上传/更新
 * - useAvatar — 获取头像上下文的Hook（avatarUrl/refreshAvatar）
 *
 * 职责：
 * - 获取当前用户头像URL
 * - 头像上传后刷新
 *
 * 引用方：
 * - pages/_app.tsx — 全局Provider包裹
 */
"use client";
import React, { createContext, useContext } from "react";

interface AvatarContextType {
  avatarUrl: string;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  // 使用默认头像，不支持自定义头像
  const avatarUrl = "/chat-page/avatar.png";

  return (
    <AvatarContext.Provider value={{ avatarUrl }}>
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const context = useContext(AvatarContext);
  if (context === undefined) {
    throw new Error("useAvatar must be used within an AvatarProvider");
  }
  return context;
}
