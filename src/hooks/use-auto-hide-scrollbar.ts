import { useEffect, useRef } from "react";

interface UseAutoHideScrollbarOptions {
  /**
   * 滚动停止后延迟隐藏滚动条的时间（毫秒）
   * @default 1000
   */
  delay?: number;
  /**
   * 鼠标靠近滚动条的距离（像素）
   * @default 10
   */
  proximity?: number;
}

/**
 * 自动隐藏滚动条 Hook
 *
 * 功能：
 * 1. 页面初始加载时不显示滚动条
 * 2. 用户滚动时显示滚动条
 * 3. 停止滚动后延迟隐藏滚动条
 * 4. 鼠标靠近滚动条（左右两侧指定距离内）时显示滚动条
 *
 * @param options - 配置选项
 * @returns 包含 ref 的对象，需绑定到滚动容器上
 */
export function useAutoHideScrollbar(options: UseAutoHideScrollbarOptions = {}) {
  const { delay = 1000, proximity = 10 } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isScrolling = false;

    const handleScroll = () => {
      if (!isScrolling) {
        isScrolling = true;
        container.classList.add("is-scrolling");
      }

      // 清除之前的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // 设置新的定时器，延迟移除 is-scrolling 类
      timeoutRef.current = setTimeout(() => {
        isScrolling = false;
        container.classList.remove("is-scrolling");
      }, delay);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const distanceFromRight = rect.right - e.clientX;
      const scrollbarWidth = 8; // 滚动条宽度

      // 检测鼠标是否在滚动条附近（右侧 proximity 范围内）
      const isNearScrollbar =
        distanceFromRight >= -proximity && distanceFromRight <= scrollbarWidth + proximity;

      if (isNearScrollbar) {
        container.classList.add("is-near-scrollbar");
      } else {
        container.classList.remove("is-near-scrollbar");
      }
    };

    const handleMouseLeave = () => {
      container.classList.remove("is-near-scrollbar");
    };

    // 添加事件监听
    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseleave", handleMouseLeave, { passive: true });

    // 清理函数
    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [delay, proximity]); // 依赖 delay 和 proximity

  return {
    containerRef,
    className: "auto-hide-scrollbar",
  };
}
