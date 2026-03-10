import React, { useEffect } from 'react';

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
  // 自动提交逻辑
  useEffect(() => {
    if (autoSubmit && value.length === 6 && /^\d{6}$/.test(value) && onComplete) {
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
