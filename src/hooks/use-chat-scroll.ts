import { useEffect, useRef, useCallback, RefObject } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  thinking?: string;
  isThinkingCollapsed?: boolean;
  backendId?: string | null;
}

const useChatScroll = (messagesEndRef: RefObject<HTMLDivElement | null>, messages: Message[]) => {
  const lastStreamingMessageRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const aiMessagePositionsRef = useRef<Map<string, DOMRect>>(new Map());
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  // 获取滚动容器
  const getScrollContainer = useCallback(() => {
    if (!scrollContainerRef.current) {
      // 查找实际的可滚动容器
      const containers = [
        // 优先查找消息列表的滚动容器（在分栏布局和单栏布局中都是 overflow-y-auto）
        document.querySelector('.overflow-y-auto.auto-hide-scrollbar'),
        document.querySelector('.overflow-y-auto.scrollbar-thin'),
        document.querySelector('.overflow-y-auto'),
        document.querySelector('.overflow-auto'),
        document.querySelector('[class*="overflow"]'),
        document.querySelector('.flex-1.w-full'),
        document.documentElement,
        document.body
      ];

      for (const container of containers) {
        if (container && container instanceof HTMLElement) {
          const style = window.getComputedStyle(container);
          if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
            scrollContainerRef.current = container;
            break;
          }
        }
      }
    }
    return scrollContainerRef.current;
  }, []);

  // 检查元素是否在可视区域内
  const isElementVisible = useCallback((element: Element, container: Element, threshold: number = 100) => {
    const elementRect = element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // 计算元素相对于容器的位置
    const elementTop = elementRect.top - containerRect.top;
    const elementBottom = elementRect.bottom - containerRect.top;
    const containerHeight = containerRect.height;

    // 检查元素是否在容器的可视区域内
    const isVisible = elementTop >= threshold && elementBottom <= containerHeight - threshold;

    // 返回元素是否即将离开可视区域
    return {
      isVisible,
      isNearBottom: containerHeight - elementBottom < threshold,
      elementTop,
      elementBottom,
      containerHeight
    };
  }, []);

  // 平滑滚动到指定位置
  const smoothScrollTo = useCallback((container: Element, targetScrollTop: number) => {
    if (container instanceof HTMLElement) {
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  }, []);

  // 实时智能滚动逻辑
  const performIntelligentScroll = useCallback(() => {
    const container = getScrollContainer();
    if (!container || isScrollingRef.current) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    // 如果消息不在流式输出状态，不执行智能滚动
    if (!lastMessage.isStreaming) return;

    // 查找最新的AI消息元素
    const aiMessageElements = document.querySelectorAll('[data-message-id]');
    let targetAiMessage: Element | null = null;

    for (const element of aiMessageElements) {
      const messageId = element.getAttribute('data-message-id');
      if (messageId === lastMessage.id || messageId === lastMessage.backendId) {
        targetAiMessage = element;
        break;
      }
    }

    if (!targetAiMessage) return;

    const visibility = isElementVisible(targetAiMessage, container, 30); // 更早触发，距离底部30px

    // 更智能的滚动策略：根据内容长度调整触发条件
    const contentLength = lastMessage.content?.length || 0;
    const isLongContent = contentLength > 500; // 长内容更积极滚动

    // 更激进的触发策略：很早就开始滚动
    const thresholdMultiplier = isLongContent ? 0.75 : 0.85; // 提高阈值，更早触发
    const bottomThreshold = 30; // 固定30px，更早触发滚动

    const isVisibleEnough = visibility.elementTop >= 50 &&
                          visibility.elementBottom <= visibility.containerHeight * thresholdMultiplier;

    // 更宽泛的触发条件：多种情况触发滚动
    const shouldScroll = !isVisibleEnough || // 内容不够可见
                        visibility.elementBottom > visibility.containerHeight - bottomThreshold || // 距离底部30px
                        visibility.elementBottom > visibility.containerHeight * 0.85 || // 85%位置就开始准备
                        (contentLength > 300 && visibility.elementBottom > visibility.containerHeight * 0.8); // 300字符以上80%就滚动

    if (shouldScroll) {
      // 计算目标滚动位置：保持AI消息在可视区域内
      let targetScrollTop;

      if (visibility.elementTop < 80) {
        // 如果消息顶部太靠近顶部，稍微向上滚动
        targetScrollTop = Math.max(0, container.scrollTop - 30);
      } else {
        // 更激进的滚动：确保内容距离底部有充足空间
        const overflowAmount = Math.max(0, visibility.elementBottom - (visibility.containerHeight - 150)); // 150px安全距离
        const scrollBuffer = isLongContent ? 250 : 180; // 预留更多空间给长内容
        targetScrollTop = container.scrollTop + overflowAmount + scrollBuffer;
      }

      // 设置滚动状态，避免重复触发
      isScrollingRef.current = true;

      // 执行平滑滚动
      smoothScrollTo(container, targetScrollTop);

      // 滚动完成后重置状态
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 200); // 缩短锁定时间，提高响应性


    }
  }, [messages, getScrollContainer, isElementVisible, smoothScrollTo]);

  // 启动实时监控
  const startRealTimeMonitoring = useCallback(() => {
    // 清除之前的定时器
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }

    // 每50ms检查一次是否需要滚动，提高响应性
    scrollIntervalRef.current = setInterval(() => {
      performIntelligentScroll();
    }, 50);
  }, [performIntelligentScroll]);

  // 停止实时监控
  const stopRealTimeMonitoring = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
    isScrollingRef.current = false;
  }, []);

  // 监听消息变化，控制实时监控
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    if (lastMessage?.isStreaming) {
      // 如果当前消息正在流式输出，检查是否需要记录新的流式消息ID
      if (lastStreamingMessageRef.current !== lastMessage.id) {
        lastStreamingMessageRef.current = lastMessage.id;
      }

      // 启动实时监控
      startRealTimeMonitoring();
    } else {
      // 流式输出结束
      lastStreamingMessageRef.current = null;
      stopRealTimeMonitoring();
    }

    // 清理函数
    return () => {
      if (!messages[messages.length - 1]?.isStreaming) {
        stopRealTimeMonitoring();
      }
    };
  }, [messages, startRealTimeMonitoring, stopRealTimeMonitoring]);

  // 滚动到消息底部
  const scrollToBottom = useCallback((isImmediate = false) => {
    const container = getScrollContainer();
    if (!container) return;

    // 强制滚动到底部，确保最新的AI消息可见
    const scrollOptions: ScrollToOptions = {
      top: container.scrollHeight,
      behavior: isImmediate ? 'auto' : 'smooth'
    };

    container.scrollTo(scrollOptions);
  }, [getScrollContainer, messagesEndRef]);

  // 页面加载后和历史消息加载后自动滚动到底部
  useEffect(() => {
    // 延迟滚动，确保DOM已渲染完成
    const timer = setTimeout(() => {
      if (messages.length > 0) {
        // 页面刷新后立即滚动到底部，不使用动画
        scrollToBottom(true);
      }
    }, 500); // 500ms延迟，确保历史消息和版本信息都已完全加载

    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次

  // 当消息从加载状态变为非流式状态时也自动滚动
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];

    // 如果最后一条消息存在且不是流式输出，并且没有正在进行的流式输出
    if (lastMessage && !lastMessage.isStreaming && !messages.some(msg => msg.isStreaming)) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100); // 短暂延迟确保DOM更新完成

      return () => clearTimeout(timer);
    }
  }, [messages.length]); // 监听消息数量的变化

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      stopRealTimeMonitoring();
    };
  }, [stopRealTimeMonitoring]);

  return messagesEndRef;
};

export default useChatScroll;