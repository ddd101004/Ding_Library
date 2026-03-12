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
        const token = getTokenFromStorage();

        if (id && username && phone && token) {
          setUserInfo({
            id,
            username,
            phone,
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
