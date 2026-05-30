/**
 * 认证页面布局 — 全屏白色表单区域，设置页面标题和背景
 *
 * 【前端】认证模块布局组件
 *
 * 职责：
 * - 渲染全屏白色表单容器，居中展示子组件内容
 * - 通过Head组件设置页面标题（AI学术交互系统 + title后缀）
 * - 提供返回首页导航
 *
 * 引用方：
 * - login/LoginPage — 登录/注册页面布局
 * - forgot-password/ForgotPasswordPage — 忘记密码页面布局
 */
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
        <title>AI学术交互系统{title}</title>
      </Head>

      {/* 右侧表单区域 */}
      <div className="relative w-full bg-white m-0 rounded-[20px] flex items-center justify-center h-screen">
        {/* 表单内容 */}
        {children}
      </div>
    </div>
  );
}
