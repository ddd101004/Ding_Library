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
