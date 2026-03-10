import React, { useState } from "react";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useAuth } from "@/hooks/use-auth";
import { AuthInput, AuthButton } from "@/components/auth";
import { toast } from "sonner";

interface ForgotPasswordStep1Props {
  onNext: (phone: string) => void;
  onBackToLogin: () => void;
}

export function ForgotPasswordStep1({
  onNext,
  onBackToLogin,
}: ForgotPasswordStep1Props) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { validatePhone } = useFormValidation();
  const { checkPhone, sendVerificationCode } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证手机号
    const phoneError = validatePhone(phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    setLoading(true);

    try {
      // 检查手机号是否已注册
      const exists = await checkPhone(phone);
      if (!exists) {
        toast.error("该手机号未注册");
        return;
      }

      // 发送验证码
      await sendVerificationCode(phone, "resetPassword");
      toast.success("验证码已发送");
      onNext(phone);
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <AuthInput
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="请输入手机号"
          required
          disabled={loading}
        />
      </div>

      
      <div className="pt-2 sm:pt-4 flex justify-center">
        <AuthButton type="submit" loading={loading} disabled={!phone}>
          获取验证码
        </AuthButton>
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
        >
          返回登录
        </button>
      </div>
    </form>
  );
}
