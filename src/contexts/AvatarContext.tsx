"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { apiGet } from "@/api/request";

interface AvatarContextType {
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType | undefined>(undefined);

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [avatarUrl, setAvatarUrl] = useState<string>("/touxiang.jpg");

  // 从服务器获取头像 URL
  const refreshAvatar = async () => {
    try {
      const response = await apiGet<{ avatar: string | null; config: any }>(
        "/api/user/avatar"
      );
      if (response.code === 200 && response.data?.avatar) {
        setAvatarUrl(response.data.avatar);
      } else {
        setAvatarUrl("/touxiang.jpg");
      }
    } catch (error) {
      console.error("Failed to fetch avatar URL:", error);
    }
  };

  // 组件挂载时获取头像
  useEffect(() => {
    refreshAvatar();
  }, []);

  return (
    <AvatarContext.Provider value={{ avatarUrl, setAvatarUrl, refreshAvatar }}>
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
