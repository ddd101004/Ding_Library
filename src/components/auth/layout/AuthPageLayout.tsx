"use client";
import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";

interface AuthPageLayoutProps {
  title: string;
  children: React.ReactNode;
}

export function AuthPageLayout({ title, children }: AuthPageLayoutProps) {
  const router = useRouter();

  // 图片配置（底部滚动的期刊 logo）
  const imageConfigs = Array.from({ length: 20 }, (_, i) => ({
    src: `/landingpaper/landingpaper-${i + 1}.png`,
  }));

  const handleGoToHome = () => {
    router.push("/");
  };

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center bg-no-repeat flex overflow-hidden"
    >
      <Head>
        <title>AI智慧学术交互图书馆{title}</title>
      </Head>

      {/* 右侧表单区域 */}
      <div className="relative w-full bg-white m-0 rounded-[20px] flex items-center justify-center h-screen">
        {/* 表单内容 */}
        {children}
      </div>
    </div>
  );
}
