/**
 * 忘记密码第二步 — 输入6位短信验证码，验证通过后进入设置新密码
 *
 * 【前端】认证模块忘记密码流程组件
 *
 * 职责：
 * - 渲染6位独立数字验证码输入框，支持自动聚焦跳转
 * - 验证码填写完毕自动提交验证（autoSubmit=true）
 * - 调用useAuth.verifyCode校验验证码是否正确
 * - 验证通过后通过onNext回调将验证码传递给Step3
 * - 支持重新发送验证码（60秒倒计时）
 * - 底部"返回上一步"链接
 *
 * 引用的子组件：
 * - common/VerificationCodeInput — 6位验证码输入（autoSubmit=true）
 * - common/AuthButton — "下一步"按钮
 *
 * 引用的hooks：
 * - hooks/use-countdown — 重新发送验证码60秒倒计时
 * - hooks/use-auth — verifyCode验证码校验、sendVerificationCode重发
 *
 * 引用方：
 * - forgot-password/ForgotPasswordPage — step=2时渲染
 */
import React, { useState } from "react";
import { VerificationCodeInput, AuthButton } from "@/components/auth";
import { useCountdown } from "@/hooks/use-countdown";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface ForgotPasswordStep2Props {
  phone: string;
  onNext: (verificationCode: string) => void;
  onBack: () => void;
}

export function ForgotPasswordStep2({
  phone,
  onNext,
  onBack,
}: ForgotPasswordStep2Props) {
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { countdown, isRunning, start: startCountdown } = useCountdown(60);
  const { verifyCode, sendVerificationCode } = useAuth();

  const handleSubmit = async (e?: React.FormEvent | string) => {
    // 如果传入的是字符串（自动提交），则阻止默认行为
    if (typeof e === 'string') {
      // 已经是6位验证码，直接验证
    } else {
      e?.preventDefault();
    }

    setError("");

    if (verificationCode.length !== 6) {
      toast.error("请输入完整的6位验证码");
      return;
    }

    setLoading(true);

    try {
      await verifyCode(phone, verificationCode);
      onNext(verificationCode);
    } catch (err) {
      setVerificationCode("");
      // 错误已自动 toast，这里只需静默处理
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");

    try {
      await sendVerificationCode(phone, "resetPassword");
      startCountdown();
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex justify-center">
          <VerificationCodeInput
            value={verificationCode}
            onChange={setVerificationCode}
            disabled={loading}
            autoSubmit={true}
            onComplete={handleSubmit}
          />
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleResendCode}
            className="text-sm text-[#0D9488] hover:text-[#0F766E] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRunning || loading}
          >
            {isRunning ? `${countdown}秒后可重新发送` : "重新发送验证码"}
          </button>
        </div>

        <div className="pt-2 sm:pt-4 flex justify-center">
          <AuthButton
            type="submit"
            loading={loading}
            disabled={verificationCode.length !== 6}
          >
            下一步
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
    </div>
  );
}
