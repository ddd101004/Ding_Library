import React, { useState, useEffect } from "react";
import GroupSection from "./GroupSection";
import Image from "next/image";
import { useRouter } from "next/router";
import { apiGet, apiDel } from "@/api/request";
import { toast } from "sonner";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import AvatarHoverMenu from "../chat/common/AvatarHoverMenu";

// 论文信息接口
interface PaperInfo {
  id: string;
  type: string;
  title: string;
  authors: string[] | null;
  abstract: string | null;
  source: string;
  source_id: string;
  publication_name: string | null;
  publication_year: string | null;
  doi: string | null;
  create_time: string;
  file_name?: string;
}

// 定义独立的 HistoryItem 接口
interface HistoryItem {
  conversation_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  create_time: string;
  update_time?: string;
  last_message_preview?: string;
  folder_info?: {
    folder_id: string;
    folder_name: string;
  } | null;
  dateGroup: "recent" | "within30Days" | "earlier";
  paper_info?: PaperInfo[];
}

// 消息类型
interface Message {
  content: string;
  role: string;
  create_time?: string;
}

// 基础会话项目接口
interface BaseConversationItem {
  conversation_id: string;
  title: string;
  last_message_at: string;
  message_count: number;
  create_time: string;
  update_time?: string;
  last_message_preview?: string;
  folder_info?: {
    folder_id: string;
    folder_name: string;
  } | null;
  dateGroup: "recent" | "within30Days" | "earlier";
}

// 历史记录项目接口
interface HistoryItem extends BaseConversationItem {
  // 继承所有字段，无需额外字段
}

// 搜索结果的类型
interface SearchResultItem extends BaseConversationItem {
  // 搜索相关字段
  matched_snippet?: string;
  match_count?: number;
}

// 联合类型
type DisplayItem = HistoryItem | SearchResultItem;

// 定义正确的API响应类型
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

interface MessagesResponse {
  messages: Array<{
    content: string;
    role: string;
    create_time?: string;
    message_order?: number;
  }>;
  has_more: boolean;
}

// 搜索响应类型
interface SearchResponse {
  results: Array<{
    message_id: string;
    conversation_id: string;
    conversation_title: string;
    paper_title: string | null;
    role: string;
    content: string;
    matched_snippet: string;
    matched_fields: string[];
    match_priority: number;
    relevance_score: number;
    message_order: number;
    create_time: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  };
  search_mode: string;
}

// 删除确认弹窗组件
const DeleteConfirmationDialog: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-[20px] border border-[#E9ECF2] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] w-[360px] h-[260px]"
        onClick={(e) => e.stopPropagation()}
        data-delete-dialog="true"
      >
        <div className="flex justify-center mt-[30px]">
          <img
            src="/chat-page/chat-page-lose@2x.png"
            alt="警告"
            width={30}
            height={30}
            className="w-[30px] h-[30px]"
          />
        </div>

        <div className="text-center mt-[27px]">
          <div
            className="font-medium text-[#333333] mb-[15px] text-[20px]"
          >
            删除后不可恢复
          </div>
          <div
            className="font-medium text-[#333333] text-[20px]"
          >
            是否继续执行删除操作
          </div>
        </div>

        <div className="absolute bottom-[30px] left-0 right-0 flex justify-center space-x-[20px]">
          <button
            onClick={onClose}
            className="w-[140px] h-[50px] rounded-[12px] border border-[#C8C9CC] bg-white text-[#333333] font-medium text-[16px] hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="w-[140px] h-[50px] rounded-[12px] bg-[#FF4D4F] text-white font-medium text-[16px] hover:bg-[#FF7875] transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

const History: React.FC = () => {
  const [conversations, setConversations] = useState<HistoryItem[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searching, setSearching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [conversationToDelete, setConversationToDelete] = useState<
    string | null
  >(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showSearchResults, setShowSearchResults] = useState<boolean>(false);
  const router = useRouter();

  const { containerRef: scrollContainerRef } = useAutoHideScrollbar();

  // 获取会话的所有消息
  const fetchAllMessages = async (
    conversationId: string
  ): Promise<Message[]> => {
    try {
      let allMessages: Message[] = [];
      let currentPage = 1;
      const limit = 50;
      let hasMore = true;

      while (hasMore) {
        const response = await apiGet<any>("/api/chat/messages", {
          params: {
            conversation_id: conversationId,
            page: currentPage,
            limit: limit,
            order: "asc",
          },
        });

        if (response?.code === 200 && response?.data?.messages) {
          const messages = response.data.messages;

          const validMessages = messages
            .filter((msg: any) => msg?.content?.trim())
            .map((msg: any) => ({
              content: msg.content.trim(),
              role: msg.role,
              create_time: msg.create_time,
            }));

          allMessages = [...allMessages, ...validMessages];
          hasMore = response.data.has_more === true;
          currentPage++;
        } else {
          break;
        }

        if (currentPage > 10) break;
      }

      return allMessages;
    } catch (err) {
      console.error("Error fetching all messages:", err);
      throw new Error("获取聊天记录失败");
    }
  };

  // 获取所有会话列表（搜索框为空时使用）
  const fetchConversations = async (isLoadMore = false) => {
    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setLoading(true);
      setPage(1);
      setConversations([]);
      setHasMore(true);
    }

    try {
      const currentPage = isLoadMore ? page : 1;
      const response = await apiGet<{
        items: HistoryItem[];
        total: number;
        page: number;
        size: number;
        has_more: boolean;
      }>("/api/chat/conversations", {
        params: {
          page: currentPage,
          size: 20,
          keyword: "",
        },
      });

      const conversationsData = response.data?.items || [];


      const conversationsWithContent = conversationsData.map((conv) => {
        const dateGroup = getDateGroup(
          conv.update_time || conv.last_message_at || conv.create_time
        );

        return {
          ...conv,
          dateGroup,
        };
      });


      if (isLoadMore) {
        setConversations((prev) => [...prev, ...conversationsWithContent]);
      } else {
        setConversations(conversationsWithContent);
      }

      setHasMore(response.data?.has_more || false);
      if (isLoadMore) {
        setPage(currentPage + 1);
      } else {
        setPage(currentPage + 1);
      }

      setSearchResults([]);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to fetch conversations";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error fetching conversations:", err);
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 搜索消息（搜索框有内容时使用）
  const searchMessages = async (isLoadMore = false) => {
    if (!searchQuery.trim()) {
      // 如果搜索关键词为空，回退到显示所有会话
      setShowSearchResults(false);
      fetchConversations();
      return;
    }

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setSearching(true);
      setSearchResults([]);
      setHasMore(true);
      setPage(1);
    }
    setShowSearchResults(true); // 显示搜索结果

    try {
      const currentPage = isLoadMore ? page : 1;
      const response = await apiGet<SearchResponse>(
        "/api/chat/messages/search",
        {
          params: {
            keyword: searchQuery.trim(),
            page: currentPage,
            size: 20,
          },
        }
      );


      if (response?.code === 200 && response?.data?.results) {
        const searchData = response.data.results;

        // 将搜索结果转换为统一的格式
        const formattedResults: SearchResultItem[] = searchData.map((item) => {
          const previewContent = item.matched_snippet
            ? item.matched_snippet.length > 50
              ? item.matched_snippet.substring(0, 50) + "..."
              : item.matched_snippet
            : "";

          return {
            conversation_id: item.conversation_id,
            title: item.conversation_title || "未命名会话",
            last_message_at: item.create_time,
            message_count: 0,
            create_time: item.create_time,
            update_time: item.create_time,
            dateGroup: getDateGroup(item.create_time),
            last_message_preview: previewContent,
            matched_snippet: item.matched_snippet,
            match_count: item.relevance_score,
          };
        });

        // 对搜索结果按会话 ID 去重，保留每个会话的第一条匹配消息
        const uniqueConversations = new Map<string, SearchResultItem>();
        formattedResults.forEach(result => {
          if (!uniqueConversations.has(result.conversation_id)) {
            uniqueConversations.set(result.conversation_id, result);
          }
        });
        const deduplicatedResults = Array.from(uniqueConversations.values());


        if (isLoadMore) {
          // 加载更多时追加到现有数据
          setSearchResults((prev) => [...prev, ...deduplicatedResults]);
        } else {
          // 首次搜索时替换数据
          setSearchResults(deduplicatedResults);
        }

        setConversations([]); // 清空普通会话列表
        setError(null);


        // 更新分页状态 - 基于去重后的会话数量判断
        const pagination = response.data.pagination;
        // 判断是否还有更多：当前页的会话数量 < 20 且还有下一页
        const hasMoreResults = pagination
          ? currentPage < pagination.total_pages && deduplicatedResults.length >= 20
          : false;
        setHasMore(hasMoreResults);

        if (isLoadMore) {
          setPage(currentPage + 1);
        } else {
          setPage(currentPage + 1);

          // 显示搜索结果数量（仅在首次搜索时）
          if (deduplicatedResults.length === 0) {
            toast.warning("未找到匹配的聊天记录");
          } else {
            const totalResults = pagination?.total || deduplicatedResults.length;
            // toast.success(`找到 ${totalResults} 个匹配的会话`);
          }
        }
      } else {
        if (!isLoadMore) {
          setSearchResults([]);
          toast.warning("未找到匹配的聊天记录");
        }
        setHasMore(false);
      }
    } catch (err: any) {
      const errorMessage = err.message || "搜索失败";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error searching messages:", err);
      // 搜索失败时回退到显示所有会话
      if (!isLoadMore) {
        setShowSearchResults(false);
        fetchConversations();
      }
    } finally {
      setSearching(false);
      setIsLoadingMore(false);
    }
  };

  // 初始加载
  useEffect(() => {
    // 页面首次加载时获取会话列表
    fetchConversations();
  }, []);

  // 滚动监听
  useEffect(() => {
    const handleScroll = () => {
      const scrollElement = document.querySelector(
        ".history-content-container"
      );
      if (!scrollElement) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (!hasMore || isLoadingMore) return;

      // 当滚动到距离底部200px以内时触发加载更多
      if (distanceFromBottom <= 200) {
        handleLoadMore();
      }
    };

    const scrollElement = document.querySelector(".history-content-container");
    if (scrollElement) {
      scrollElement.addEventListener("scroll", handleScroll);
      return () => scrollElement.removeEventListener("scroll", handleScroll);
    }
  }, [hasMore, isLoadingMore, showSearchResults, searchQuery, page]);

  // 处理搜索表单提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (searchQuery.trim()) {
      // 执行搜索
      searchMessages();
    } else {
      // 搜索框为空时显示所有会话
      setShowSearchResults(false);
      fetchConversations();
    }
  };

  // 处理搜索输入变化（可选：实现实时搜索）
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    // 如果清空搜索框，立即显示所有会话
    if (!value.trim()) {
      setShowSearchResults(false);
      fetchConversations();
    }
  };

  // 处理滚动加载更多
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      if (showSearchResults && searchQuery.trim()) {
        searchMessages(true);
      } else {
        fetchConversations(true);
      }
    }
  };

  // 处理单击进入会话
  const handleConversationClick = async (conversationId: string) => {
    sessionStorage.removeItem(`hasLoaded_${conversationId}`);
    sessionStorage.setItem("navigationSource", "history");
    sessionStorage.setItem("targetConversationId", conversationId);

    router.push({
      pathname: "/chatconversation",
      query: {
        conversationId: conversationId,
        fromHistory: "true",
      },
    });
  };

  // 处理单击三个点图标（切换选中状态）
  const handleThreeDotClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedConversation(
      selectedConversation === conversationId ? null : conversationId
    );
  };

  // 打开删除确认弹窗
  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  // 确认删除会话
  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;

    try {
      await apiDel(`/api/chat/conversations/${conversationToDelete}`);

      setConversations((prev) =>
        prev.filter((conv) => conv.conversation_id !== conversationToDelete)
      );
      setSearchResults((prev) =>
        prev.filter((conv) => conv.conversation_id !== conversationToDelete)
      );

      setSelectedConversation(null);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
      toast.success("删除成功");
    } catch (err: any) {
      const errorMessage = err.message || "删除失败";
      setError(errorMessage);
      toast.error(errorMessage);
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteDialogOpen(false);
    setConversationToDelete(null);
  };

  // 处理导出会话
  const handleExportConversation = async (
    conversationId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    try {
      setExporting(conversationId);

      const allConversations = [...conversations, ...searchResults];
      const conversation = allConversations.find(
        (conv) => conv.conversation_id === conversationId
      );
      if (!conversation) {
        toast.error("未找到会话信息");
        return;
      }

      const messages = await fetchAllMessages(conversationId);


      if (messages.length === 0) {
        toast.error("该会话没有聊天记录");
        return;
      }

      const textContent = generateTextContent(conversation, messages);


      downloadTextFile(
        textContent,
        `聊天记录_${conversation.title || conversationId}_${
          new Date().toISOString().split("T")[0]
        }.txt`
      );

      toast.success("导出成功");
    } catch (err: any) {
      console.error("Error exporting conversation:", err);
      const errorMessage = `导出失败: ${err.message || "请重试"}`;
      toast.error(errorMessage);
    } finally {
      setExporting(null);
    }
  };

  // 生成文本内容
  const generateTextContent = (
    conversation: HistoryItem | SearchResultItem,
    messages: Message[]
  ): string => {
    const title = conversation.title || "未命名会话";
    const createTime = conversation.create_time
      ? new Date(conversation.create_time).toLocaleString("zh-CN")
      : "未知时间";
    const lastMessageTime = conversation.last_message_at
      ? new Date(conversation.last_message_at).toLocaleString("zh-CN")
      : "未知时间";

    let content = `聊天记录导出\n`;
    content += `==============================\n\n`;
    content += `会话标题: ${title}\n`;
    content += `创建时间: ${createTime}\n`;
    content += `最后消息时间: ${lastMessageTime}\n`;
    content += `消息总数: ${messages.length}\n`;
    content += `导出时间: ${new Date().toLocaleString("zh-CN")}\n\n`;
    content += `==============================\n\n`;

    messages.forEach((message, index) => {
      const time = message.create_time
        ? new Date(message.create_time).toLocaleString("zh-CN")
        : "未知时间";
      const role = message.role === "user" ? "用户" : "助手";

      content += `[${index + 1}] ${role} | ${time}\n`;
      content += `${message.content}\n`;
      content += `------------------------------\n\n`;
    });

    return content;
  };

  // 下载文本文件
  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getDateGroup = (
    dateString: string
  ): "recent" | "within30Days" | "earlier" => {
    if (!dateString) return "earlier";

    const date = new Date(dateString);
    const now = new Date();

    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
    const sevenDaysAgo = new Date(
      todayStart.getTime() - 7 * 24 * 60 * 60 * 1000
    );
    const thirtyDaysAgo = new Date(
      todayStart.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    if (date >= sevenDaysAgo) {
      return "recent";
    } else if (date >= thirtyDaysAgo) {
      return "within30Days";
    } else {
      return "earlier";
    }
  };

  // 根据是否有搜索结果显示不同的内容
  const displayData = showSearchResults ? searchResults : conversations;
  const isLoading = showSearchResults ? searching : loading;

  // 创建一个去重函数，确保每个会话只出现在一个时间分组中
  const deduplicateConversations = (data: DisplayItem[]) => {
    const seen = new Set<string>();
    return data.filter((conv) => {
      if (seen.has(conv.conversation_id)) {
        return false;
      }
      seen.add(conv.conversation_id);
      return true;
    });
  };

  // 先去重，再按日期分组
  const deduplicatedData = deduplicateConversations(displayData);

  let recentConversations: DisplayItem[] = [];
  let within30DaysConversations: DisplayItem[] = [];
  let earlierConversations: DisplayItem[] = [];

  // 只有在非搜索模式下才进行时间分组
  if (!showSearchResults) {
    recentConversations = deduplicatedData.filter(
      (conv: DisplayItem) => conv.dateGroup === "recent"
    );
    within30DaysConversations = deduplicatedData.filter(
      (conv: DisplayItem) => conv.dateGroup === "within30Days"
    );
    earlierConversations = deduplicatedData.filter(
      (conv: DisplayItem) => conv.dateGroup === "earlier"
    );
  } else {
    // 搜索模式下，所有结果都显示在"最近7天"分组中，保持搜索结果的顺序
    recentConversations = deduplicatedData;
  }

  // 分组显示逻辑:
  // 1. 只要有数据就显示对应的分组
  // 2. 按照时间顺序显示: 最近7天 -> 30天内 -> 更早
  const shouldShowWithin30Days =
    !showSearchResults && within30DaysConversations.length > 0;
  const shouldShowEarlier =
    !showSearchResults && earlierConversations.length > 0;

  // 确定当前正在加载哪个时间分组
  const getLoadingSection = () => {
    if (!hasMore || !isLoadingMore) return null;

    // 搜索模式下的加载逻辑
    if (showSearchResults) {
      return "recent"; // 搜索模式下所有数据都在"最近7天"分组
    }

    // 普通模式下的分组加载逻辑
    // 根据"最后一条记录的时间分组"判断当前正在加载哪个分组
    if (conversations.length === 0) {
      return "recent";
    }

    // 获取最后一条记录的日期分组
    const lastConversation = conversations[conversations.length - 1];
    const lastDateGroup = lastConversation?.dateGroup;

    // 如果最后一条记录是"最近7天",可能还在加载"最近7天",也可能开始加载"30天内"
    if (lastDateGroup === "recent") {
      // 如果"最近7天"已经达到或超过15条,很可能下一批会包含"30天内"的数据
      if (recentConversations.length >= 15) {
        return "within30Days";
      }
      return "recent";
    }

    // 如果最后一条记录是"30天内",可能还在加载"30天内",也可能开始加载"更早"
    if (lastDateGroup === "within30Days") {
      // 如果"30天内"已经达到或超过15条,很可能下一批会包含"更早"的数据
      if (within30DaysConversations.length >= 15) {
        return "earlier";
      }
      return "within30Days";
    }

    // 如果最后一条记录是"更早",继续加载"更早"
    if (lastDateGroup === "earlier") {
      return "earlier";
    }

    return "recent";
  };

  const loadingSection = getLoadingSection();

  // 确定哪个分组应该显示"下滑加载更多"提示
  const getActiveGroupForPrompt = () => {
    if (!hasMore) return null;

    // 搜索模式下的提示逻辑
    if (showSearchResults) {
      return "recent"; // 搜索模式下所有数据都在"最近7天"分组
    }

    // 普通模式下的提示逻辑
    if (recentConversations.length < 20) {
      return "recent";
    }
    if (
      recentConversations.length >= 20 &&
      within30DaysConversations.length < 20
    ) {
      return "within30Days";
    }
    if (
      recentConversations.length >= 20 &&
      within30DaysConversations.length >= 20
    ) {
      return "earlier";
    }
    return "recent"; // 默认
  };

  const activeGroupForPrompt = getActiveGroupForPrompt();

  return (
    <>
      {/* 头像组件 - 固定在右上角 */}
      <AvatarHoverMenu />

      <div className="h-full flex flex-col bg-white p-2 items-center justify-center">
        <DeleteConfirmationDialog
          isOpen={deleteDialogOpen}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
        />

        {/* 标题和搜索框区域 - 保持左对齐 */}
        <div className="w-full max-w-[1200px] flex flex-col gap-6">
          {/* 标题区域 */}
          <div className="flex items-center pt-2">
            <Image
              src="/slibar/slibar-history(1).png"
              alt="历史记录"
              width={30}
              height={30}
              className="mr-3"
            />
            <h2 className="font-medium text-[30px] text-[#333333] leading-[40px]">
              历史记录
            </h2>
          </div>

          {/* 搜索框 */}
          <form
            onSubmit={handleSearch}
            className="w-full h-[60px] bg-[#F7F8FA] rounded-[20px] border border-[#C8C9CC] flex items-center"
          >
            <Image
              src="/slibar/slibar-questions-answers.png"
              alt="搜索"
              width={20}
              height={20}
              className="mx-[20px]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="搜索历史..."
              className="flex-1 bg-transparent border-none outline-none text-[16px] text-[#333333]"
            />
            {/* 搜索按钮 */}
            <button
              type="submit"
              className="mx-[20px] text-[#666] hover:text-[#333] transition-colors"
            >
              搜索
            </button>
          </form>
        </div>

        {/* 历史记录内容区域 */}
        <div className="flex-1 overflow-hidden w-full max-w-[1200px] flex flex-col">
          <div
            ref={scrollContainerRef}
            className="history-content-container flex-1 overflow-y-auto overflow-x-hidden pr-2 auto-hide-scrollbar"
          >
            {/* 最近7天分组 */}
            <GroupSection
              title="最近7天"
              conversations={recentConversations}
              selectedConversation={selectedConversation}
              onClick={handleConversationClick}
              onThreeDotClick={handleThreeDotClick}
              onDelete={handleDeleteClick}
              onExport={handleExportConversation}
              loading={isLoading && !isLoadingMore}
              error={error}
              exporting={exporting}
            />

            {/* 30天内分组 - 只有在满足条件时才显示 */}
            {shouldShowWithin30Days && (
              <GroupSection
                title="30天内"
                conversations={within30DaysConversations}
                selectedConversation={selectedConversation}
                onClick={handleConversationClick}
                onThreeDotClick={handleThreeDotClick}
                onDelete={handleDeleteClick}
                onExport={handleExportConversation}
                loading={false}
                error={null}
                exporting={exporting}
              />
            )}

            {/* 更早分组 - 只有在满足条件时才显示 */}
            {shouldShowEarlier && (
              <GroupSection
                title="更早"
                conversations={earlierConversations}
                selectedConversation={selectedConversation}
                onClick={handleConversationClick}
                onThreeDotClick={handleThreeDotClick}
                onDelete={handleDeleteClick}
                onExport={handleExportConversation}
                loading={false}
                error={null}
                exporting={exporting}
              />
            )}

            {/* 没有搜索结果时的提示 */}
            {showSearchResults && !isLoading && displayData.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                没有找到匹配的聊天记录
              </div>
            )}

            {/* 全局提示 - 仅在非加载状态下显示 */}
            {!isLoadingMore && hasMore && displayData.length > 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                向下滚动加载更多
              </div>
            )}

            {/* 没有更多数据时的提示 */}
            {!hasMore && !isLoadingMore && displayData.length > 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                没有更多历史记录了
              </div>
            )}
          </div>

          {/* 固定在底部的加载状态 - 在滚动容器外面 */}
          {isLoadingMore && (
            <div className="flex justify-center py-5">
              <div className="flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-md">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4F46E5]"></div>
                <span className="text-gray-500 text-sm">
                  正在加载更多历史记录...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default History;
