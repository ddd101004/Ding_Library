"use client";
import React, { useState } from "react";
import { useRouter } from "next/router";
import { AuthPageLayout } from "@/components/auth";
import { ForgotPasswordStep1 } from "./ForgotPasswordStep1";
import { ForgotPasswordStep2 } from "./ForgotPasswordStep2";
import { ForgotPasswordStep3 } from "./ForgotPasswordStep3";

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const handleBackToLogin = () => {
    router.push("/login");
  };

  const handleStep1Next = (phoneNumber: string) => {
    setPhone(phoneNumber);
    setStep(2);
  };

  const handleStep2Next = (code: string) => {
    setVerificationCode(code);
    setStep(3);
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "重置密码";
      case 2:
        return "验证手机号";
      case 3:
        return "设置新密码";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "请输入注册时使用的手机号";
      case 2:
        return `验证码已发送至 ${phone.slice(0, 3)}****${phone.slice(7)}`;
      case 3:
        return "请设置新的登录密码";
    }
  };

  return (
    <AuthPageLayout title="-重置密码">
      <div className="w-full max-w-md p-6 sm:p-8 lg:p-10 relative">
        {/* Logo */}
        <div className="flex justify-center mb-[28px]">
          <img
            src="/logo/ai_logo.png"
            alt="Logo"
            className="w-[114px] h-[60px]"
          />
        </div>

        {/* 标题区域 */}
        <div className="text-center mb-6 sm:mb-12">
          <h1 className="w-[259px] h-[38px] font-['Source_Han_Sans_CN'] font-medium text-[40px] text-[#333333] leading-[40px] mx-auto mb-[16px]">
            {getStepTitle()}
          </h1>
          <p className="text-sm text-gray-600">{getStepDescription()}</p>
        </div>

        {/* 步骤组件 */}
        {step === 1 && (
          <ForgotPasswordStep1
            onNext={handleStep1Next}
            onBackToLogin={handleBackToLogin}
          />
        )}
        {step === 2 && (
          <ForgotPasswordStep2
            phone={phone}
            onNext={handleStep2Next}
            onBack={handleBackStep}
          />
        )}
        {step === 3 && (
          <ForgotPasswordStep3
            phone={phone}
            verificationCode={verificationCode}
            onBack={handleBackStep}
          />
        )}
      </div>
    </AuthPageLayout>
  );
}
