/**
 * 认证输入框 — 尟用的圆角输入框，带错误状态边框变色
 *
 * 【前端】认证模块通用组件
 *
 * 职责：
 * - 渲染360px宽、40px高的圆角输入框，基于shadcn/ui Input封装
 * - error状态下边框变红（border-red-500）
 * - 使用React.forwardRef支持ref转发
 *
 * 引用方：
 * - login/LoginForm — 手机号输入、验证码输入
 * - register/RegisterStep1 — 昵称、手机号输入
 * - forgot-password/ForgotPasswordStep1 — 手机号输入
 */
import React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(
  ({ error, className, ...props }, ref) => {
    return (
      <Input
        ref={ref}
        className={cn(
          "w-[360px] h-[40px] rounded-[10px]",
          error
            ? "border-red-500 focus:ring-red-500"
            : "border-[#C8C9CC] focus-visible:ring-blue-500",
          className
        )}
        {...props}
      />
    );
  }
);

AuthInput.displayName = "AuthInput";
