import React, { useState, useEffect } from 'react';
import { useFormValidation } from '@/hooks/use-form-validation';
import { useCountdown } from '@/hooks/use-countdown';
import { useAuth } from '@/hooks/use-auth';
import { AuthInput, AuthButton } from '@/components/auth';
import { PasswordInput } from '@/components/ui/password-input';
import { toast } from 'sonner';
import type { LoginCredentials } from '@/types/auth';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onForgotPassword?: () => void;
}

export function LoginForm({
  onSuccess,
  onSwitchToRegister,
  onForgotPassword,
}: LoginFormProps) {
  const [loginType, setLoginType] = useState<'password' | 'code'>('password');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const { validatePhone } = useFormValidation();
  const { countdown, isRunning, start: startCountdown } = useCountdown(60);
  const { login, sendVerificationCode, checkPhone } = useAuth();

  useEffect(() => {
    const savedPhone = localStorage.getItem('rememberedPhone');
    const savedPassword = localStorage.getItem('rememberedPassword');
    if (savedPhone && savedPassword) {
      setPhone(savedPhone);
      setPassword(savedPassword);
      setRememberPassword(true);
    }
  }, []);

  /**
   * 发送验证码
   */
  const handleSendCode = async () => {
    setError('');

    // 首先检查手机号长度
    if (!phone) {
      toast.error('请输入手机号');
      return;
    }

    // 检查手机号长度是否为11位
    if (phone.length !== 11) {
      toast.error('请输入11位手机号');
      return;
    }

    // 验证手机号格式
    const phoneError = validatePhone(phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }

    try {
      // 检查手机号是否已注册（失败会自动 toast + throw）
      await checkPhone(phone);

      // 发送验证码（失败会自动 toast + throw）
      await sendVerificationCode(phone, 'login');
      toast.success('验证码已发送');
      startCountdown();
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
    }
  };

  /**
   * 提交登录
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 首先检查手机号长度
    if (!phone) {
      toast.error('请输入手机号');
      setLoading(false);
      return;
    }

    // 检查手机号长度是否为11位
    if (phone.length !== 11) {
      toast.error('请输入11位手机号');
      setLoading(false);
      return;
    }

    // 验证手机号格式
    const phoneError = validatePhone(phone);
    if (phoneError) {
      toast.error(phoneError);
      setLoading(false);
      return;
    }

    // 验证码登录时检查验证码长度
    if (loginType === 'code' && verificationCode.length !== 6) {
      toast.error('请输入6位验证码');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const credentials: LoginCredentials = {
        phone_number: phone,
      };

      if (loginType === 'password') {
        credentials.password = password;
      } else {
        credentials.verification_code = verificationCode;
      }

      // 登录成功会自动跳转，失败会自动 toast + throw
      await login(credentials);

      if (loginType === 'password' && rememberPassword) {
        localStorage.setItem('rememberedPhone', phone);
        localStorage.setItem('rememberedPassword', password);
      } else if (loginType === 'password' && !rememberPassword) {
        localStorage.removeItem('rememberedPhone');
        localStorage.removeItem('rememberedPassword');
      }

      onSuccess?.();
    } catch (err) {
      // 错误已自动 toast，这里只需静默处理
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 手机号输入 */}
        <div>
          <AuthInput
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入手机号"
            required
            disabled={loading}
            error={!!error}
          />
        </div>

        {/* 密码登录 */}
        {loginType === 'password' ? (
          <div className="flex flex-col gap-4">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
              disabled={loading}
              className="w-[360px] h-[40px] border border-[#C8C9CC] rounded-[10px] focus-visible:ring-[#0D9488] focus-visible:border-[#0D9488]"
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberPassword"
                checked={rememberPassword}
                onChange={(e) => setRememberPassword(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 accent-[#0D9488] cursor-pointer"
              />
              <label
                htmlFor="rememberPassword"
                className="ml-2 text-gray-600 cursor-pointer font-['Source_Han_Sans_CN'] text-[14px]"
              >
                记住密码
              </label>
            </div>
          </div>
        ) : (
          /* 验证码登录 */
          <div className="flex gap-2 sm:gap-3">
            <AuthInput
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="请输入验证码"
              required
              disabled={loading}
              maxLength={6}
              className="w-[250px]"
            />
            <button
              type="button"
              onClick={handleSendCode}
              className="w-[100px] h-[40px] bg-white border border-[#C8C9CC] rounded-[10px] text-gray-700 hover:bg-gray-50 transition-colors font-medium whitespace-nowrap text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRunning || !phone || loading}
            >
              {isRunning ? `${countdown}秒` : '发送验证码'}
            </button>
          </div>
        )}

  
        {/* 登录按钮 */}
        <div className="pt-2 sm:pt-4 flex justify-center">
          <AuthButton
            type="submit"
            loading={loading}
            disabled={
              !phone ||
              (loginType === 'password' && !password) ||
              (loginType === 'code' && !verificationCode)
            }
          >
            即刻探索
          </AuthButton>
        </div>
 {/* 底部链接 */}
        <div className="flex justify-between pt-2 px-2">
          <button
            type="button"
            onClick={() => setLoginType(loginType === 'password' ? 'code' : 'password')}
            className="text-[#0D9488] font-['Source_Han_Sans_CN'] font-medium text-[16px] leading-[40px]"
            disabled={loading}
          >
            {loginType === 'password' ? '手机验证码登录' : '密码登录'}
          </button>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-[#0D9488] font-['Source_Han_Sans_CN'] font-medium text-[16px] leading-[40px]"
            disabled={loading}
          >
            忘记密码
          </button>
        </div>
      </form>

    </div>
  );
}
