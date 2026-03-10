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
        "w-[360px] h-[40px] bg-gradient-to-r from-[#9459FF] to-[#2E6EFF]",
        "text-white rounded-[10px] font-medium text-lg transition-all",
        "shadow-[0px_10px_20px_0px_rgba(0,49,255,0.2)]",
        "hover:shadow-[0px_10px_20px_0px_rgba(0,49,255,0.3)]",
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
