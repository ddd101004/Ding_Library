/**
 * 验证码输入组件 — 6位独立数字输入框，支持自动聚焦跳转和填写完毕自动提交
 *
 * 【前端】认证模块通用组件
 *
 * 职责：
 * - 渲染6个独立数字输入框，输入后自动聚焦下一格，退格自动回退上一格
 * - 6位填写完毕后触发onComplete回调
 * - autoSubmit=true时，6位填写完毕自动调用onComplete（用于注册和忘记密码的验证码验证）
 * - error状态下边框变红并显示错误提示文字
 *
 * 引用方：
 * - register/RegisterStep2 — 注册验证码输入（autoSubmit=true）
 * - forgot-password/ForgotPasswordStep2 — 重置密码验证码输入（autoSubmit=true）
 */
import React, { useEffect, useRef } from 'react';

interface VerificationCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  autoSubmit?: boolean;
}

export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  error,
  autoSubmit = false,
}: VerificationCodeInputProps) {
  const hasCompleted = useRef(false);

  // 自动提交逻辑
  useEffect(() => {
    // 重置完成状态，当验证码长度小于6时允许再次触发
    if (value.length < 6) {
      hasCompleted.current = false;
      return;
    }

    // 只有验证码长度为6且之前未触发过时才调用onComplete
    if (autoSubmit && value.length === 6 && /^\d{6}$/.test(value) && onComplete && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete(value);
    }
  }, [value, autoSubmit, onComplete]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = e.target.value;

    // 只允许输入数字
    if (newValue && !/^\d$/.test(newValue)) return;

    const newCode = value.split('');
    newCode[index] = newValue;
    const code = newCode.join('');

    onChange(code);

    // 自动聚焦下一个输入框
    if (newValue && index < 5) {
      const nextInput = document.getElementById(`verification-code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // 处理退格键
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      const prevInput = document.getElementById(`verification-code-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <input
            key={index}
            id={`verification-code-${index}`}
            type="text"
            maxLength={1}
            value={value[index] || ''}
            onChange={(e) => handleChange(e, index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            disabled={disabled}
            className={`w-[50px] h-[50px] text-center border rounded-[10px] focus:outline-none focus:ring-2 transition-all text-xl font-bold bg-white ${
              error
                ? 'border-red-500 focus:ring-red-500'
                : 'border-[#C8C9CC] focus:ring-blue-500'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            pattern="[0-9]*"
            inputMode="numeric"
          />
        ))}
      </div>
      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}
