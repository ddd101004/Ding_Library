/**
 * 登录/注册页面 — 登录与注册模式切换的入口页面，编排整个认证流程
 *
 * 【前端】认证模块页面组件
 *
 * 职责：
 * - 管理登录/注册模式切换（mode: login | register）
 * - 注册流程编排：第一步(昵称+手机号+密码) → 第二步(验证码确认)
 * - 登录成功后跳转redirect参数指定页面（默认/chat）
 * - 注册成功后2秒延迟自动切换回登录模式
 * - 点击"忘记密码"跳转/forgot-password页面
 *
 * 引用的子组件：
 * - layout/AuthPageLayout — 页面布局容器
 * - login/LoginForm — 登录表单
 * - register/RegisterStep1 — 注册第一步
 * - register/RegisterStep2 — 注册第二步
 *
 * 引用方：
 * - pages/login.tsx（登录页面入口）
 */
"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  AuthPageLayout,
  RegisterStep1,
  RegisterStep2,
} from "@/components/auth";
import { LoginForm } from "./LoginForm";
import type { RegisterStep1Data } from "@/types/auth";

type Mode = "login" | "register";
type RegisterStep = 1 | 2;

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [registerData, setRegisterData] = useState<RegisterStep1Data | null>(
    null
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [disabledMessage, setDisabledMessage] = useState<string | null>(null);

  // 检测URL中的账号禁用提示
  useEffect(() => {
    if (router.query.disabled === "1") {
      const msg = (router.query.msg as string) || "该账号已被禁用，请联系管理员";
      setDisabledMessage(decodeURIComponent(msg));
      // 清除URL参数，避免刷新后重复显示
      router.replace("/login", undefined, { shallow: true });
    }
  }, [router.query]);

  /**
   * 登录成功处理
   */
  const handleLoginSuccess = () => {
    const redirectPath = (router.query.redirect as string) || "/chat";
    router.push(redirectPath);
  };

  /**
   * 注册第一步完成
   */
  const handleRegisterStep1Complete = (data: RegisterStep1Data) => {
    setRegisterData(data);
    setRegisterStep(2);
  };

  /**
   * 注册成功处理
   */
  const handleRegisterSuccess = () => {
    setShowSuccess(true);

    // 2秒后切换到登录页面
    setTimeout(() => {
      setMode("login");
      setRegisterStep(1);
      setRegisterData(null);
      setShowSuccess(false);
    }, 2000);
  };

  /**
   * 切换登录/注册模式
   */
  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setRegisterStep(1);
    setRegisterData(null);
  };

  /**
   * 忘记密码
   */
  const handleForgotPassword = () => {
    router.push("/forgot-password");
  };

  /**
   * 返回注册第一步
   */
  const handleBackToStep1 = () => {
    setRegisterStep(1);
  };

  return (
    <AuthPageLayout title={mode === "login" ? "-登录" : "-注册"}>
      <div className="w-full max-w-md p-6 sm:p-8 lg:p-10 relative">
        {/* Logo */}
        <div className="flex justify-center mb-[28px]">
          <img
            src="/logo/ai_logo.png"
            alt="Logo"
            className="w-[114px] h-[72px]"
          />
        </div>

        {/* 成功提示 */}
        {showSuccess && (
          <div className="fixed top-4 left-1/2 transform -translate-x-1/2 p-3 rounded-[10px] text-sm text-center bg-green-50 border border-green-200 text-green-600 z-50">
            注册成功，正在跳转到登录...
          </div>
        )}

        {/* 账号禁用提示 */}
        {disabledMessage && (
          <div className="mb-4 p-3 rounded-lg text-sm text-center bg-red-50 border border-red-200 text-red-600">
            {disabledMessage}
          </div>
        )}

        {/* 标题区域 */}
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="w-[259px] h-[38px] font-['Source_Han_Sans_CN'] font-medium text-[40px] text-[#333333] leading-[40px] mx-auto mb-[16px]">
            {mode === "login"
              ? "欢迎回来"
              : registerStep === 1
              ? "欢迎注册"
              : "验证手机号"}
          </h1>

          {/* 切换登录/注册 - 只在第一步显示 */}
          {(mode === "login" || (mode === "register" && registerStep === 1)) && (
            <div className="mt-[5px]">
              <button type="button" onClick={toggleMode} className="text-center">
                <span className="font-['Source_Han_Sans_CN'] font-normal text-[16px] text-[#999999] leading-[40px]">
                  {mode === "login" ? "没有账户，" : "已有账户，"}
                </span>
                <span className="font-['Source_Han_Sans_CN'] font-medium text-[16px] text-[#0D9488] leading-[40px] hover:underline">
                  {mode === "login" ? "去注册" : "去登录"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* 表单组件 */}
        {mode === "login" ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setMode("register")}
            onForgotPassword={handleForgotPassword}
          />
        ) : registerStep === 1 ? (
          <RegisterStep1
            onNext={handleRegisterStep1Complete}
            onSwitchToLogin={() => setMode("login")}
          />
        ) : (
          <RegisterStep2
            username={registerData?.username || ""}
            phone={registerData?.phone || ""}
            password={registerData?.password || ""}
            onSuccess={handleRegisterSuccess}
            onBack={handleBackToStep1}
          />
        )}
      </div>
    </AuthPageLayout>
  );
}
