"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { useSearch } from "../../components/contexts/SearchContext";
import { useUser } from "../../components/contexts/UserContext";
import SubscriptionModal from "./SubscriptionModal";
import MainContent from "./MainContent";
import Sidebar from "./Sidebar";
import { apiGet } from "../../api/request";

export default function WithSidebarLayout({
  children,
  title,
  isChatHome = false,
  isCheckedChat = false,
  backgroundImage,
  backgroundColor = "#FFFFFF",
  functionType,
  skipMainContent = false,
  isKnowledgeBase = false,
}: WithSidebarLayoutProps) {
  const { userInfo } = useUser();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("isSidebarOpen");
      return savedState ? JSON.parse(savedState) : false;
    }
    return false;
  }); // 初始为关闭状态
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const { clearUserInfo } = useUser();
  const router = useRouter();
  const { openSearchModal } = useSearch();
  // 用于获取侧边栏内容容器，判断点击目标
  const sidebarContentRef = useRef<HTMLDivElement>(null);
  const sidebarOuterRef = useRef<HTMLDivElement>(null);

  // 响应式断点检测
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const small = width < 1024; // lg断点：1024px以下为小屏幕
      setIsSmallScreen(small);
      // 小屏幕时强制保持侧边栏最小状态，但仍然可见
      if (small && isSidebarOpen && width < 900) { // 900px以下强制收起
        setIsSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, [isSidebarOpen]);

  // 初始化hydration状态
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // 获取最近会话
  const fetchRecentConversations = useCallback(async (forceRefresh = false) => {
    try {
      const token = localStorage.getItem("token");

      if (!token || token === "undefined" || token === "null") {
        setRecentConversations([]);
        setConversationsLoading(false);
        return;
      }

      // 第一次加载时先从本地缓存加载数据（非强制刷新时）
      if (!forceRefresh) {
        const cachedConversations = localStorage.getItem("recentConversations");
        if (cachedConversations && recentConversations.length === 0) {
          try {
            const parsed = JSON.parse(cachedConversations);
            const now = Date.now();
            // 检查缓存是否过期（5分钟）
            if (parsed.timestamp && now - parsed.timestamp < 5 * 60 * 1000) {
              setRecentConversations(parsed.data || []);
              setConversationsLoading(false);
              return;
            }
          } catch (e) {
            // 缓存格式错误，继续获取新数据
          }
        }
      }

      // 只有第一次加载时才显示loading状态
      if (recentConversations.length === 0) {
        setConversationsLoading(true);
      }

      const response = await apiGet<any>("/api/chat/conversations", {
        requireAuth: true,
      });

      if (response.code === 200 && response.data) {
        const conversations = response.data.items || [];
        setRecentConversations(conversations);

        // 缓存数据
        localStorage.setItem("recentConversations", JSON.stringify({
          data: conversations,
          timestamp: Date.now()
        }));
      } else {
        setRecentConversations([]);
      }
    } catch (error: any) {
      if (error.code === 401 || error.code === 403) {
        clearUserInfo();
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("recentConversations"); // 清除缓存
      }
      if (error.code !== 503) {
        setRecentConversations([]);
      }
    } finally {
      setConversationsLoading(false);
    }
  }, [recentConversations.length, clearUserInfo]);

  // 侧边栏展开时才加载会话
  useEffect(() => {
    if (isSidebarOpen) {
      const timer = setTimeout(() => fetchRecentConversations(), 300);
      return () => clearTimeout(timer);
    }
  }, [isSidebarOpen]);

  // 监听新会话创建事件
  useEffect(() => {
    const handleNewConversation = (event: CustomEvent) => {
      // 新会话创建时，立即刷新侧边栏数据
      if (isSidebarOpen) {
        fetchRecentConversations();
      }
    };

    // 添加事件监听
    window.addEventListener('newConversation', handleNewConversation as EventListener);

    // 清理事件监听
    return () => {
      window.removeEventListener('newConversation', handleNewConversation as EventListener);
    };
  }, [isSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("isSidebarOpen", JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // 根据路由设置活跃图标
  useEffect(() => {
    const { pathname } = router;
    if (pathname === "/knowledge-base") setActiveIcon("knowledge");
    else if (pathname === "/history") setActiveIcon("history");
    else if (pathname === "/academic-search") setActiveIcon("academic");
  }, [router.pathname]);

  // 监听路由变化，刷新会话列表
  useEffect(() => {
    const handleRouteChangeComplete = (url: string) => {
      // 只在侧边栏展开时才刷新会话列表，并强制刷新（跳过缓存）
      if (isSidebarOpen) {
        fetchRecentConversations(true);
      }
    };

    // 监听路由变化完成事件
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    // 清理事件监听
    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [isSidebarOpen, router.events, fetchRecentConversations]);

  // 各类功能点击事件（阻止冒泡，防止触发空白处点击）
  const handleAcademicSearchClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIcon("academic");
    openSearchModal();
  };

  const handleMenuItemClick = (
    e: React.MouseEvent,
    path: string,
    icon: string
  ) => {
    e.stopPropagation();
    setActiveIcon(icon);
    router.push(path);
  };

  const handleSubscriptionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSubscriptionModal(true);
  };

  const handleRecentConversationClick = async (
    conversationId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    try {
      // 获取对话详细信息，包括类型
      const response = await apiGet<{
        conversation_type: "general" | "paper_reading";
        title: string;
        uploaded_paper_id?: string;
      }>(`/api/chat/conversations/${conversationId}`);

      if (response?.code !== 200 || !response?.data) {
        // 如果获取失败，默认跳转到普通对话页面
        sessionStorage.removeItem(`hasLoaded_${conversationId}`);
        router.push({
          pathname: "/chatconversation",
          query: {
            conversationId,
            fromHistory: "true"
          },
        });
        return;
      }

      const conversationData = response.data;
      const { conversation_type, uploaded_paper_id } = conversationData;

      // 清除会话加载标记，确保重新加载
      sessionStorage.removeItem(`hasLoaded_${conversationId}`);

      // 根据对话类型跳转到不同页面
      if (conversation_type === "paper_reading") {
        // AI伴读对话跳转到伴读页面
        router.push({
          pathname: "/ai-reading-chat",
          query: {
            conversation_id: conversationId,
            uploadedPaperId: uploaded_paper_id,
            fromHistory: "true"
          },
        });
      } else {
        // 普通对话跳转到普通对话页面
        router.push({
          pathname: "/chatconversation",
          query: {
            conversationId,
            fromHistory: "true"
          },
        });
      }
    } catch (error) {
      // 出错时默认跳转到普通对话页面
      sessionStorage.removeItem(`hasLoaded_${conversationId}`);
      router.push({
        pathname: "/chatconversation",
        query: {
          conversationId,
          fromHistory: "true"
        },
      });
    }
  };

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // 直接跳转到ChatHome.tsx页面
    router.push("/chat");
  };

  // 处理侧边栏切换按钮点击
  const handleToggleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // 当屏幕宽度小于 960px 时,不允许展开侧边栏
    if (!isSidebarOpen && !canOpenSidebar()) {
      return;
    }

    setIsSidebarOpen(!isSidebarOpen);
  };
  // 检查是否允许展开侧边栏
  const canOpenSidebar = () => {
    const screenWidth = window.innerWidth;
    const canOpen = screenWidth >= 1035;
    return canOpen;
  };

  const handleSidebarBlankClick = (e: React.MouseEvent) => {
    // 只在侧边栏打开时才检查是否点击空白处
    if (!isSidebarOpen) {

      if (!canOpenSidebar()) {
        return;
      }

      // 屏幕宽度足够时，允许展开
      e.stopPropagation();
      setIsSidebarOpen(true);
      return;
    }

    // 侧边栏打开时，检查是否点击了真正的空白处
    const target = e.target as HTMLElement;

    // 获取点击目标及其父元素
    const isClickable =
      target.hasAttribute("onclick") ||
      target.onclick !== null ||
      target.closest("[onclick]") !== null ||
      target.closest("button") !== null ||
      target.closest("img") !== null ||
      target.closest("a") !== null;

    if (isClickable) {
      // 点击的是可点击元素，不处理
      return;
    }

    // 点击的是空白处，关闭侧边栏
    e.stopPropagation();
    setIsSidebarOpen(false);
  };

  return (
    <div className="w-full h-screen overflow-hidden bg-blue-100" style={{ paddingTop: '5px', paddingRight: '5px', paddingBottom: '5px' }}>
      <div className="w-full h-full flex overflow-hidden relative min-w-0">
        {/* 侧边栏外层容器 - 小屏幕时保持70px，大屏幕时可展开 */}
        <div
          ref={sidebarOuterRef}
          className={`flex flex-col items-center transition-all duration-300 ease-in-out h-full overflow-hidden relative flex-shrink-0 ${
            isSmallScreen
              ? "w-[50px] sm:w-[60px]" // 小屏幕50-60px宽度，节省空间
              : isSidebarOpen
                ? "w-48 sm:w-52 md:w-56" // 展开时自适应宽度：192-224px
                : "w-[50px] sm:w-[60px]" // 收起时50-60px，节省空间
          }`}
        >
          {/* 侧边栏内容容器 */}
          <div
            ref={sidebarContentRef}
            className="relative w-full h-full"
            onClick={handleSidebarBlankClick} // 整个内容区域监听空白点击
          >
            <Sidebar
              isSidebarOpen={isSidebarOpen}
              activeIcon={activeIcon}
              recentConversations={recentConversations}
              conversationsLoading={conversationsLoading}
              onToggleSidebar={handleToggleButtonClick}
              onMenuItemClick={handleMenuItemClick}
              onAcademicSearchClick={handleAcademicSearchClick}
              onNewChatClick={handleNewChat}
              onSubscriptionClick={handleSubscriptionClick}
              onRecentConversationClick={handleRecentConversationClick}
            />
          </div>

          {/* 侧边栏关闭时，在图标周围添加可点击的透明覆盖层 */}
          {!isSidebarOpen && (
            <>
              {/* Logo上方的空白区域 */}
              <div
                className="absolute top-0 left-0 right-0 h-[27px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />

              {/* Logo下方的空白区域 */}
              <div
                className="absolute top-[93px] left-0 right-0 h-[20px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />

              {/* 新对话按钮下方的空白区域 */}
              <div
                className="absolute top-[169px] left-0 right-0 h-[74px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />

              {/* 学术搜索下方的空白区域 */}
              <div
                className="absolute top-[243px] left-0 right-0 h-[35px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />

              {/* 知识库下方的空白区域 */}
              <div
                className="absolute top-[278px] left-0 right-0 h-[35px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />

              {/* 历史记录下方的空白区域 */}
              <div
                className="absolute top-[313px] left-0 right-0 bottom-[100px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />

              {/* 订阅按钮上方的空白区域 */}
              <div
                className="absolute bottom-[176px] left-0 right-0 h-[374px] cursor-pointer"
                onClick={() => canOpenSidebar() && setIsSidebarOpen(true)}
              />
            </>
          )}
        </div>

        {skipMainContent ? (
          <div className="flex-1 overflow-hidden bg-white rounded-[20px]">
            {React.isValidElement(children)
              ? React.cloneElement(children as any, {
                  ...(typeof children.type === 'string' ? {} : { isSidebarOpen, isSmallScreen })
                })
              : children}
          </div>
        ) : (
          <MainContent
            isChatHome={isChatHome}
            isCheckedChat={isCheckedChat}
            backgroundImage={backgroundImage}
            backgroundColor={backgroundColor}
            username={isHydrated ? (userInfo?.username || "访客") : "访客"}
            functionType={functionType}
            isHydrated={isHydrated}
            isSmallScreen={isSmallScreen}
            isSidebarOpen={isSidebarOpen}
            isKnowledgeBase={isKnowledgeBase}
          >
            {React.isValidElement(children)
              ? React.cloneElement(children as any, {
                  ...(typeof children.type === 'string' ? {} : { isSidebarOpen, isSmallScreen })
                })
              : children}
          </MainContent>
        )}

        {/* 订阅弹窗 */}
        <SubscriptionModal
          show={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      </div>
    </div>
  );
}

interface WithSidebarLayoutProps {
  children: React.ReactNode;
  title?: string;
  isChatHome?: boolean;
  isCheckedChat?: boolean;
  backgroundImage?: string;
  backgroundColor?: string;
  functionType?: string;
  skipMainContent?: boolean;
  isKnowledgeBase?: boolean;
}