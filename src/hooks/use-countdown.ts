/**
 * 倒计时 Hook — 验证码发送后的倒计时控制
 *
 * 核心函数：
 * - start() — 开始倒计时（默认60秒）
 * - reset() — 重置倒计时为0
 * - countdown — 当前倒计时秒数
 * - isRunning — 是否正在倒计时
 *
 * 使用组件：
 * - LoginForm — 登录时发送验证码后按钮倒计时
 * - RegisterStep2 — 注册时发送验证码后按钮倒计时
 * - ForgotPasswordStep2 — 忘记密码时发送验证码后按钮倒计时
 */
import { useState, useEffect } from 'react';

export function useCountdown(initialCount: number = 60) {
  const [countdown, setCountdown] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setIsRunning(false);
    }
  }, [countdown]);

  /**
   * 开始倒计时
   */
  const start = () => {
    setCountdown(initialCount);
    setIsRunning(true);
  };

  /**
   * 重置倒计时
   */
  const reset = () => {
    setCountdown(0);
    setIsRunning(false);
  };

  return { countdown, isRunning, start, reset };
}
