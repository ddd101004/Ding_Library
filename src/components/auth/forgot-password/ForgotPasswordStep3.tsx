import React, { useState } from "react";
import { useRouter } from "next/router";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useAuth } from "@/hooks/use-auth";
import { AuthInput, AuthButton } from "@/components/auth";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";

interface ForgotPasswordStep3Props {
  phone: string;
  verificationCode: string;
  onBack: () => void;
}

export function ForgotPasswordStep3({
  phone,
  verificationCode,
  onBack,
}: ForgotPasswordStep3Props) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { validatePassword } = useFormValidation();
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证密码
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    // 验证密码确认
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(phone, verificationCode, newPassword);

      // 密码重置成功，2秒后跳转到登录页
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <PasswordInput
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="请输入新密码"
          required
          disabled={loading}
          className="w-[360px] h-[40px] border border-[#C8C9CC] rounded-[10px] focus-visible:ring-[#0D9488] focus-visible:border-[#0D9488]"
        />
      </div>

      <div>
        <PasswordInput
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="请确认新密码"
          required
          disabled={loading}
          className="w-[360px] h-[40px] border border-[#C8C9CC] rounded-[10px] focus-visible:ring-[#0D9488] focus-visible:border-[#0D9488]"
        />
      </div>

      
      <div className="pt-2 sm:pt-4 flex justify-center">
        <AuthButton
          type="submit"
          loading={loading}
          disabled={!newPassword || !confirmPassword}
        >
          完成
        </AuthButton>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-600 hover:text-gray-700 hover:underline"
          disabled={loading}
        >
          返回上一步
        </button>
      </div>
    </form>
  );
}
