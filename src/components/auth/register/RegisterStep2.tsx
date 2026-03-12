import React, { useState, useEffect, useRef } from "react";
import { VerificationCodeInput, AuthButton } from "@/components/auth";
import { useCountdown } from "@/hooks/use-countdown";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/router";
import { toast } from "sonner";
import type { RegisterData } from "@/types/auth";

interface RegisterStep2Props {
  username: string;
  phone: string;
  password: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function RegisterStep2({
  username,
  phone,
  password,
  onSuccess,
  onBack,
}: RegisterStep2Props) {
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  const { countdown, isRunning, start: startCountdown } = useCountdown(60);
  const { register, sendVerificationCode } = useAuth();
  const router = useRouter();

  const hasSentCode = useRef(false);

  // 组件挂载时自动发送验证码（仅执行一次）
  useEffect(() => {
    if (!hasSentCode.current) {
      hasSentCode.current = true;
      handleSendCode();
    }
  }, []);

  /**
   * 发送验证码
   */
  const handleSendCode = async () => {
    setError("");

    try {
      await sendVerificationCode(phone, "register");
      toast.success("验证码已发送");
      startCountdown();
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
    }
  };

  /**
   * 提交注册的核心逻辑
   */
  const submitRegistration = async () => {
    // 防止重复提交
    if (isSubmitting.current) {
      return;
    }

    isSubmitting.current = true;

    setError("");

    if (verificationCode.length !== 6) {
      toast.error("请输入完整的6位验证码");
      isSubmitting.current = false;
      return;
    }

    setLoading(true);

    try {
      const registerData: RegisterData = {
        phone_number: phone,
        username,
        password,
        verification_code: verificationCode,
        type: "phone",
      };

      await register(registerData);

      // 注册成功后直接跳转到聊天页面
      const redirectPath = router.query.redirect as string;
      router.push(redirectPath || "/chat");
    } catch (err) {
      // 验证失败时清空验证码
      setVerificationCode("");
      // 错误已自动 toast，这里只需静默处理
    } finally {
      setLoading(false);
      isSubmitting.current = false;
    }
  };

  /**
   * 验证码自动完成时的提交
   */
  const handleAutoSubmit = () => {
    submitRegistration();
  };

  /**
   * 表单提交时的处理
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    submitRegistration();
  };

  /**
   * 格式化手机号显示（隐藏中间4位）
   */
  const formatPhoneNumber = (phone: string) => {
    if (phone.length === 11) {
      return `${phone.slice(0, 3)}****${phone.slice(7)}`;
    }
    return phone;
  };

  return (
    <div className="space-y-5">
      {/* 提示信息 */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-600">
          验证码已发送至手机号
          <span className="font-medium text-gray-900 mx-1">
            {formatPhoneNumber(phone)}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 验证码输入 */}
        <div className="flex justify-center">
          <VerificationCodeInput
            value={verificationCode}
            onChange={setVerificationCode}
            disabled={loading}
            autoSubmit={true}
            onComplete={handleAutoSubmit}
          />
        </div>

        {/* 重新发送验证码 */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleSendCode}
            className="text-sm text-[#0D9488] hover:text-[#0F766E] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRunning || loading}
          >
            {isRunning ? `${countdown}秒后可重新发送` : "重新发送验证码"}
          </button>
        </div>

        {/* 完成注册按钮 */}
        <div className="pt-2 sm:pt-4 flex justify-center">
          <AuthButton
            type="submit"
            loading={loading}
            disabled={verificationCode.length !== 6}
          >
            完成注册
          </AuthButton>
        </div>

        {/* 返回按钮 */}
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
