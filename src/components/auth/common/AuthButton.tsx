/**
 * 认证提交按钮 — 统一的渐变主题按钮，带加载状态禁用
 *
 * 【前端】认证模块通用组件
 *
 * 职责：
 * - 渲染teal渐变色提交按钮（14B8A6 → 0D9488）
 * - loading状态下显示"处理中..."并禁用交互
 * - 支持所有原生button属性透传（className、disabled等）
 *
 * 引用方：
 * - login/LoginForm — 登录表单"即刻探索"按钮
 * - register/RegisterStep1 — 注册第一步"下一步"按钮
 * - register/RegisterStep2 — 注册第二步"完成注册"按钮
 * - forgot-password/ForgotPasswordStep1 — "获取验证码"按钮
 * - forgot-password/ForgotPasswordStep2 — "下一步"按钮
 * - forgot-password/ForgotPasswordStep3 — "完成"按钮
 */
import React from "react";
import { cn } from "@/lib/utils";

interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const AuthButton: React.FC<AuthButtonProps> = ({
  loading,
  children,
  disabled,
  className,
  ...props
}) => {
  return (
    <button
      className={cn(
        "w-[360px] h-[40px] bg-gradient-to-r from-[#14B8A6] to-[#0D9488]",
        "text-white rounded-[10px] font-medium text-lg transition-all",
        "shadow-[0px_10px_20px_0px_rgba(13,148,136,0.2)]",
        "hover:shadow-[0px_10px_20px_0px_rgba(13,148,136,0.3)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? "处理中..." : children}
    </button>
  );
};
