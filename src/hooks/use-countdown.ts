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
