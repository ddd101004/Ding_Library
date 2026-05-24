/**
 * 首页 / — 重定向到聊天页
 *
 * 【前端】路由：/
 */
import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { useUser } from "@/components/contexts/UserContext";

export default function Home() {
  const router = useRouter();
  const { userInfo, isAuthenticated, isLoading } = useUser();

  useEffect(() => {
    // 等待用户状态加载完成
    if (isLoading) return;

    if (isAuthenticated) {
      // 管理员跳转到管理后台，普通用户跳转到聊天页
      const targetPath = userInfo?.role === "admin" ? "/admin" : "/chat";
      router.push(targetPath);
    } else {
      // 未登录用户跳转到登录页
      router.push("/login");
    }
  }, [router, isAuthenticated, isLoading, userInfo]);

  return (
    <>
      <Head>
        <title>AI智慧学术交互系统</title>
        <meta
          name="description"
          content="AI智慧学术交互系统·陪你探索世界"
        />
        <meta
          name="keywords"
          content="AI智慧交互系统,文献检索,科研助手,学术搜索,AI助手"
        />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">正在跳转...</p>
        </div>
      </div>
    </>
  );
}
