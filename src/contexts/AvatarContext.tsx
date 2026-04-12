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
