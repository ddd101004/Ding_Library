"use client";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import axios from '@/lib/axios';
import "../styles/global.css";
import { SearchProvider } from "../components/contexts/SearchContext";
import { UserProvider, useUser } from "../components/contexts/UserContext";
import { AvatarProvider } from "../contexts/AvatarContext";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// 认证检查组件 - 简化版本
function AuthChecker({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { userInfo, clearUserInfo, isLoading } = useUser();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const checkAuth = async () => {
      // 排除不需要认证的页面
      const publicPaths = ['/login', '/forgot-password', '/register', '/agreement/user-service-agreement', '/agreement/privacy-policy'];
      if (publicPaths.includes(router.pathname)) {
        setAuthChecked(true);
        return;
      }

      // 如果本地没有用户信息，直接跳转
      if (!userInfo?.token) {
        router.push('/login?redirect=' + encodeURIComponent(router.asPath));
        return;
      }

      try {
        // 验证token是否有效
        await axios.get('/api/auth/check', {
          timeout: 3000,
          withCredentials: true
        });
        setAuthChecked(true);
      } catch (error: any) {
        console.error('认证检查失败:', error);
        
        // 如果是超时或网络错误，不立即清除token，允许继续访问
        if (error.message === '认证检查超时' || !error.response) {
          console.warn('认证检查网络超时，但允许继续访问');
          setAuthChecked(true);
          return;
        }
        
        // 只有明确的服务端401错误才清除token
        if (error.response?.status === 401) {
          clearUserInfo();
          router.push('/login?redirect=' + encodeURIComponent(router.asPath));
        } else {
          // 其他错误允许继续访问
          setAuthChecked(true);
        }
      }
    };

    // 只在初次加载时检查一次
    if (!authChecked) {
      checkAuth();
    }
  }, [router.pathname, userInfo?.token, clearUserInfo, isLoading, authChecked]);

  // 如果还在检查认证或加载中，显示加载状态
  if (isLoading || (!authChecked && !['/login', '/forgot-password', '/register', '/agreement/user-service-agreement', '/agreement/privacy-policy'].includes(router.pathname))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证身份中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TooltipProvider>
      <UserProvider>
        <AvatarProvider>
          <SearchProvider>
            <AuthChecker>
              <Component {...pageProps} />
              <Toaster />
            </AuthChecker>
          </SearchProvider>
        </AvatarProvider>
      </UserProvider>
    </TooltipProvider>
  );
}

export default MyApp;