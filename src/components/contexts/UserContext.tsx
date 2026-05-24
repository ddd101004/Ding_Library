/**
 * UserContext — 用户信息上下文
 *
 * 【前端】全局上下文
 *
 * 导出：
 * - UserProvider — 上下文Provider，管理用户登录态和信息
 * - useUser — 获取用户上下文的Hook（user/setUser/clearUser/isAdmin）
 *
 * 职责：
 * - 自动检查登录态（/api/auth/check），未登录则跳转登录页
 * - 管理员身份判断（role === 'admin'）
 * - 登录/登出状态管理
 *
 * 引用方：
 * - pages/_app.tsx — 全局Provider包裹
 * - layout/WithSidebarLayout.tsx — 侧边栏登出/用户信息
 * - admin/AdminPage.tsx — 管理员权限校验
 */
"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  saveToken as saveTokenToStorage,
  clearToken as clearTokenFromStorage,
  getToken as getTokenFromStorage,
} from "@/api/request";

interface UserInfo {
  id: string;
  username: string;
  phone: string;
  token: string;
  role: string;
}

interface UserContextType {
  userInfo: UserInfo | null;
  isLoading: boolean;
  updateUserInfo: (info: Partial<UserInfo>) => void;
  clearUserInfo: () => void;
  isAuthenticated: boolean;
  // 添加便捷方法
  getToken: () => string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage加载用户信息
  useEffect(() => {
    const loadUserInfo = () => {
      if (typeof window !== "undefined") {
        const id = localStorage.getItem("id");
        const username = localStorage.getItem("username");
        const phone = localStorage.getItem("phone");
        const role = localStorage.getItem("role") || "user";
        const token = getTokenFromStorage();

        if (id && username && phone && token) {
          setUserInfo({
            id,
            username,
            phone,
            role,
            token,
          });
        } else {
          console.warn("用户信息不完整，无法设置用户状态");
          setUserInfo(null);
        }
        setIsLoading(false);
      }
    };

    loadUserInfo();
  }, []);

  const updateUserInfo = (newUserInfo: Partial<UserInfo>) => {
    if (typeof window !== "undefined") {
      if (newUserInfo.username) {
        localStorage.setItem("username", newUserInfo.username);
      }
      if (newUserInfo.phone) {
        localStorage.setItem("phone", newUserInfo.phone);
      }
      if (newUserInfo.token) {
        saveTokenToStorage(newUserInfo.token);
      }
      if (newUserInfo.id) {
        localStorage.setItem("id", newUserInfo.id);
      }
      if (newUserInfo.role) {
        localStorage.setItem("role", newUserInfo.role);
      }

      setUserInfo((prev) =>
        prev ? { ...prev, ...newUserInfo } : (newUserInfo as UserInfo)
      );
    }
  };

  const clearUserInfo = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("id");
      localStorage.removeItem("username");
      localStorage.removeItem("phone");
      localStorage.removeItem("role");
      clearTokenFromStorage();
      setUserInfo(null);
    }
  };

  const getToken = () => {
    return getTokenFromStorage();
  };

  const value = {
    userInfo,
    isLoading,
    updateUserInfo,
    clearUserInfo,
    isAuthenticated: !!userInfo?.token,
    getToken,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
