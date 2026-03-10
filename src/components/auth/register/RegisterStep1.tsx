import React, { useState } from "react";
import { useFormValidation } from "@/hooks/use-form-validation";
import { useAuth } from "@/hooks/use-auth";
import { AuthInput, AuthButton } from "@/components/auth";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import type { RegisterStep1Data } from "@/types/auth";

interface RegisterStep1Props {
  onNext: (data: RegisterStep1Data) => void;
  onSwitchToLogin?: () => void;
}

export function RegisterStep1({ onNext, onSwitchToLogin }: RegisterStep1Props) {
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { validateUsername, validatePhone, validatePassword } =
    useFormValidation();
  const { checkPhone } = useAuth();

  /**
   * 提交基本信息
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 验证用户名
    const usernameError = validateUsername(username);
    if (usernameError) {
      toast.error(usernameError);
      return;
    }

    // 验证手机号
    const phoneError = validatePhone(phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    // 验证密码
    const passwordError = validatePassword(password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    // 验证用户协议
    if (!agreementChecked) {
      toast.error("请同意使用协议和隐私协议");
      return;
    }

    setLoading(true);

    try {
      // 检查手机号是否已注册
      const exists = await checkPhone(phone);

      if (exists) {
        toast.error("该手机号已注册，请直接登录");
        setLoading(false);
        return;
      }

      // 验证通过，进入下一步
      onNext({
        username,
        phone,
        password,
      });
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 昵称输入 */}
        <div>
          <AuthInput
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="请输入昵称"
            required
            disabled={loading}
            error={!!error}
          />
        </div>

        {/* 手机号输入 */}
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

        {/* 密码输入 */}
        <div>
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="请输入密码"
            required
            disabled={loading}
            className="w-[360px] h-[40px] border border-[#C8C9CC] rounded-[10px] focus-visible:ring-blue-500 focus-visible:border-blue-500"
          />
        </div>

        
        {/* 下一步按钮 */}
        <div className="pt-2 sm:pt-4 flex justify-center">
          <AuthButton
            type="submit"
            loading={loading}
            disabled={!username || !phone || !password || !agreementChecked}
          >
            下一步
          </AuthButton>
        </div>

        {/* 用户协议 */}
        <div className="flex items-center justify-center mt-4">
          <input
            type="checkbox"
            id="agreement"
            checked={agreementChecked}
            onChange={(e) => setAgreementChecked(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={loading}
          />
          <label htmlFor="agreement" className="ml-2 text-sm text-gray-600">
            我已阅读并同意
            <a
              href="/agreement/user-service-agreement"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              《使用协议》
            </a>
            和
            <a
              href="/agreement/privacy-policy"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              《隐私协议》
            </a>
          </label>
        </div>
      </form>

    </div>
  );
}
