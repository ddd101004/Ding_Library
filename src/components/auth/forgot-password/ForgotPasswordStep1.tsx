/**
 * 忘记密码第一步 — 输入手机号，校验后发送重置密码验证码
 *
 * 【前端】认证模块忘记密码流程组件
 *
 * 职责：
 * - 收集手机号并校验格式（useFormValidation.validatePhone）
 * - 调用useAuth.checkPhone检查手机号是否已注册（未注册则报错）
 * - 调用useAuth.sendVerificationCode发送resetPassword类型验证码
 * - 校验和发送成功后通过onNext回调将手机号传递给Step2
 * - 底部"返回登录"链接
 *
 * 引用的子组件：
 * - common/AuthInput — 手机号输入框
 * - common/AuthButton — "获取验证码"按钮
 *
 * 引用的hooks：
 * - hooks/use-form-validation — 手机号格式校验
 * - hooks/use-auth — checkPhone、sendVerificationCode
 *
 * 引用方：
 * - forgot-password/ForgotPasswordPage — step=1时渲染
 */
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
          className="text-sm text-[#0D9488] hover:text-[#0F766E] hover:underline"
        >
          返回登录
        </button>
      </div>
    </form>
  );
}
