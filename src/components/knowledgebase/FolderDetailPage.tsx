import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { apiGet, apiDel, apiPost } from "@/api/request";
import { toast } from "sonner";
import KnowledgeBaseModal from "./KnowledgeBaseModal";
import ImportModal from "./ImportModal";
import DeleteModal from "./DeleteModal";
import MoveToModal from "./MoveToModal";
import { Folder } from "../../types/foder";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FolderDetailPageProps {
  folder: Folder;
  onBack: () => void;
  onFolderUpdate: (folder: Folder) => void;
  isSidebarOpen?: boolean;
}

export default function FolderDetailPage({
  folder: initialFolder,
  onBack,
  onFolderUpdate,
  isSidebarOpen = false
}: FolderDetailPageProps) {



  // 使用当前传入的folder而不是内部的state，避免闭包问题
  const folder = initialFolder;

  // 监听侧边栏状态
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 获取 router 实例
  const router = useRouter();

  const { containerRef: scrollContainerRef } = useAutoHideScrollbar();

  // 处理基础聊天图标点击 - 创建会话并跳转
  const handleBaseChat = async () => {
    try {
      // 调用 API 创建会话
      const response = await apiPost('/api/chat/conversations', {
        conversation_type:'folder_rag',
        folder_id: folder.folder_id,
      });

      if (response.code !== 200) {
        toast.error('创建对话失败: ' + response.message);
        return;
      }

      const conversationId = response.data.conversation_id;

      // 跳转到对话页面
      router.push({
        pathname: '/chatconversation',
        query: {
          conversationId,
          folderId: folder.folder_id,
          folderName: folder.folder_name,
          isFolderChat: 'true',
        },
      });
    } catch (error: any) {
      console.error('创建知识库对话失败:', error);
      toast.error('创建对话失败: ' + (error.message || '未知错误'));
    }
  };

  useEffect(() => {
    // 从 localStorage 读取侧边栏状态
    const checkSidebarState = () => {
      const savedState = localStorage.getItem("isSidebarOpen");
      const isOpen = savedState ? JSON.parse(savedState) : false;
      setSidebarOpen(isOpen);
    };

    // 初始检查
    checkSidebarState();

    // 监听存储变化
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "isSidebarOpen") {
        checkSidebarState();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // 定期检查状态（因为同页面内的 localStorage 修改不会触发 storage 事件）
    const interval = setInterval(checkSidebarState, 100);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const [folderContents, setFolderContents] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedFiles, setImportedFiles] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // 初始加载状态
  const [showMoveToModal, setShowMoveToModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // 删除操作状态
  const [isMoving, setIsMoving] = useState(false); // 移动操作状态

  // 获取文件夹内容
  const fetchFolderItems = async () => {
    if (isRefreshing && !isLoading) return; // 如果不是初始加载且正在刷新，则跳过

    try {
      // 如果是初始加载，设置isLoading为true
      if (isLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const response = await apiGet(`/api/folders/${folder.folder_id}/items`);

      if (response.data && Array.isArray(response.data.items)) {
        setFolderContents(response.data.items);
        // 重新获取数据后，清空导入文件列表，因为数据已经同步
        setImportedFiles([]);
      }
    } catch (error) {
      console.error('获取文件夹内容失败:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchFolderItems();
  }, [initialFolder.folder_id]); // 使用initialFolder而不是folder

  // 切换知识库时重置选择状态
  useEffect(() => {
    // 当文件夹ID变化时，清空选择状态
    setSelectedItems(new Set());
    setShowBulkActions(false);
  }, [initialFolder.folder_id]);

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
  };

  // 获取文件类型图标
  const getFileTypeIcon = (fileType?: string, itemType?: string): string => {
    // 如果是对话类型，使用对话图标
    if (itemType === 'conversation') {
      return "/slibar/slibar-conversation.png";
    }

    // 根据文件类型返回对应图标
    switch (fileType?.toLowerCase()) {
      case 'word':
      case 'doc':
      case 'docx':
        return "/slibar/slibar-word@2x.png";
      case 'txt':
        return "/slibar/slibar-txt@2x.png";
      case 'pdf':
        return "/slibar/slibar-pdf@2x.png";
      default:
        // 默认使用PDF图标
        return "/slibar/slibar-pdf@2x.png";
    }
  };

  // 处理文件导入
  const handleFileImported = async (folderId: string, fileData: any) => {
    try {


      // 将导入的文件添加到列表中
      setImportedFiles(prev => [...prev, fileData]);

      // 如果是当前选中的文件夹，立即刷新列表以获取正确的 item_id
      if (folder.folder_id === folderId) {
        // 不再手动添加到列表，而是直接刷新，确保获取到正确的 FolderItem.item_id
        await fetchFolderItems();
      }
    } catch (error) {
      console.error('处理文件导入失败:', error);
      toast.error('文件导入处理失败');
    }
  };

  // 处理复选框点击
  const handleCheckboxClick = (itemId: string) => {
    // 如果正在删除、移动或导入操作，禁止勾选
    if (isDeleting || isMoving || isImporting) {
      return;
    }

    const newSelectedItems = new Set(selectedItems);
    if (newSelectedItems.has(itemId)) {
      newSelectedItems.delete(itemId);
    } else {
      newSelectedItems.add(itemId);
    }
    setSelectedItems(newSelectedItems);
    setShowBulkActions(newSelectedItems.size > 0);
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    // 如果正在删除、移动或导入操作，禁止全选
    if (isDeleting || isMoving || isImporting) {
      return;
    }

    if (selectedItems.size === folderContents.length) {
      setSelectedItems(new Set());
      setShowBulkActions(false);
    } else {
      const allItemIds = folderContents.map(item => item.item_id);
      setSelectedItems(new Set(allItemIds));
      setShowBulkActions(true);
    }
  };

  // 取消选择
  const handleCancelSelection = () => {
    setSelectedItems(new Set());
    setShowBulkActions(false);
  };

  // 批量删除
  const handleBulkDelete = () => {
    if (selectedItems.size === 0) {
      toast.info('请选择要删除的内容');
      return;
    }

    // 显示确认删除弹窗
    setShowDeleteModal(true);
  };

  // 删除结果类型定义
  interface DeleteResult {
    itemId: string;
    success: boolean;
    error?: string;
  }

  // 确认批量删除
  const confirmBulkDelete = async () => {
    // 立即关闭删除确认弹窗
    setShowDeleteModal(false);
    setIsDeleting(true); // 设置删除状态

    try {



      const selectedItemIds = Array.from(selectedItems);

      // 使用新的批量删除接口
      const response = await apiPost('/api/folders/items/remove', {
        item_ids: selectedItemIds // 直接传递数组
      });


      // 处理响应结果
      if (response.data) {
        const { removed_count, failed_count, errors } = response.data;

        // 根据结果显示不同的提示信息
        if (failed_count === 0) {
          toast.success(`成功删除 ${removed_count} 个项目`);
        } else if (removed_count === 0) {
          toast.error(`所有 ${failed_count} 个项目删除失败`);
        } else {
          toast.warning(`成功删除 ${removed_count} 个项目，${failed_count} 个失败`);
        }

        // 从本地状态中移除成功删除的项目
        if (removed_count > 0) {
          // 如果有错误详情，根据错误详情过滤；否则全部移除
          if (errors && Array.isArray(errors)) {
            const failedItemIds = errors.map((error: any) => error.item_id);
            setFolderContents(prev => prev.filter(item => {
              // 只保留删除失败的项目
              return failedItemIds.includes(item.item_id);
            }));
          } else {
            // 没有错误详情，假设全部成功删除
            setFolderContents(prev => prev.filter(item => {
              return !selectedItemIds.includes(item.item_id);
            }));
          }
        }
      } else {
        // 兼容旧的响应格式，假设全部成功
        setFolderContents(prev => prev.filter(item => {
          return !selectedItemIds.includes(item.item_id);
        }));
        toast.success(`成功删除 ${selectedItemIds.length} 个项目`);
      }

      // 关闭批量操作栏
      setSelectedItems(new Set());
      setShowBulkActions(false);

      // 刷新内容列表以确保与服务器同步
      await fetchFolderItems();
    } catch (error: any) {
      console.error('批量删除过程中发生错误:', error);
      toast.error('删除失败: ' + (error.message || '未知错误'));
    } finally {
      setIsDeleting(false); // 重置删除状态
    }
  };

  // 打开编辑弹窗
  const openEditModal = () => {
    setShowEditModal(true);
  };

  return (
    <div className="w-full h-full p-3 sm:p-4 md:p-6 pt-0 flex flex-col">
      {/* 固定的头部区域 - 包含分割线以上的所有内容 */}
      <div className="flex-shrink-0 mt-5">
        {/* 文件夹标题栏 */}
        <div className="mb-4 sm:mb-5 md:mb-6">
          <div className="flex items-center justify-between flex-wrap gap-2 sm:gap-0">
            <div className="flex items-center min-w-0 flex-1">
              <h2 className="text-[18px] sm:text-[24px] md:text-[30px] font-medium truncate pr-2">
                {folder.folder_name}
              </h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src="/slibar/slibar-edit@2x.png"
                      alt="编辑"
                      className="w-[20px] h-[20px] sm:w-[22px] sm:h-[22px] md:w-[25px] md:h-[25px] ml-2 sm:ml-4 cursor-pointer flex-shrink-0"
                      onClick={openEditModal}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>编辑知识库</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center flex-shrink-0 mr-[100px]">
              {/* 基础聊天图标 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src="/slibar/slibar-Basechat.png"
                      alt="基础聊天"
                      className="w-[18px] h-[16px] sm:w-[20px] sm:h-[17px] md:w-[22px] md:h-[19px] cursor-pointer mr-[20px] sm:mr-[25px] md:mr-[30px]"
                      onClick={handleBaseChat}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>知识库对话</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {/* 回到主页图标 */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <img
                      src="/slibar/slibar-gohome.png"
                      alt="回到主页"
                      className="w-[16px] h-[16px] sm:w-[18px] sm:h-[18px] md:w-[20px] md:h-[20px] cursor-pointer"
                      onClick={onBack}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>回知识库首页</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* 文件夹信息 */}
        <div className="mb-6 sm:mb-7 md:mb-8">
          {/* 描述 */}
          <div className="mb-4 sm:mb-5">
            <div className="text-[12px] sm:text-[13px] md:text-[14px] text-[#333333] leading-[18px] sm:leading-[19px] md:leading-[20px]">
              {folder.description || "暂无描述"}
            </div>
          </div>

          {/* 创建时间和内容个数 */}
          <div className="mb-5 sm:mb-6 relative">
            <div className="flex items-center text-[12px] sm:text-[13px] md:text-[14px] text-[#333333] leading-[18px] sm:leading-[19px] md:leading-[20px]">
              <span>{formatDate(folder.create_time) || "-"}</span>
              <span className="ml-8 sm:ml-10 md:ml-12">
                {folderContents.length}个内容
              </span>
            </div>
          </div>

          {/* 分隔线 */}
          <div className="w-full h-[1px] bg-[#E0E1E5] mb-5 sm:mb-6 md:mb-7"></div>

          {/* 导入按钮 */}
          <div className="relative h-[40px] mt-[15px]">
            <div
              data-import-icon="true"
              className={`absolute top-0 right-0 w-[32px] h-[32px] sm:w-[36px] sm:h-[36px] md:w-[40px] md:h-[40px]
                         ${isImporting || isLoading ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-105'}
                         transition-transform duration-200`}
              onClick={(e) => {
                e.stopPropagation();
                if (isImporting || isLoading) {
                  return;
                }
                setShowImportModal(true);
              }}
            >
              <img
                src="/chat-page/chat-page-add-file@2x.png"
                alt="导入文件"
                className="w-full h-full"
              />
            </div>

            {/* ImportModal 渲染在相对容器内 */}
            {showImportModal && (
              <div className="absolute top-[42px] right-0">
                <ImportModal
                  isOpen={showImportModal}
                  onClose={() => {
                    setShowImportModal(false);
                    setIsImporting(false);
                  }}
                  onFileImported={handleFileImported}
                  onRefreshFolder={() => {}} // 导入时不刷新数据，由handleFileImported直接添加到末尾
                  onProcessingChange={setIsImporting}
                  folderId={folder.folder_id}
                  folderContents={folderContents} // 传递文件夹内容，用于检测重复
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 固定表头 */}
      {!isLoading && folderContents.length > 0 && (
        <div className="flex-shrink-0 mb-3 sm:mb-4">
          {/* 表头 */}
          <div className="flex w-full">
            <div className="w-10 sm:w-14 md:w-20 flex justify-center flex-shrink-0">
              {/* 复选框列标题 */}
              <div
                onClick={handleSelectAll}
                className={cn(
                  "w-5 h-5 bg-white rounded border relative transition-colors",
                  selectedItems.size === folderContents.length && folderContents.length > 0
                    ? "border-[#3B80FF] bg-[#3B80FF]"
                    : "border-[#666666] bg-white",
                  isDeleting || isMoving || isImporting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#3B80FF]'
                )}
              >
                {selectedItems.size === folderContents.length && folderContents.length > 0 && (
                  <div
                    className="absolute left-[5px] w-[8px] h-[14px] border-2 border-white border-t-0 border-l-0 transform rotate-45"
                  />
                )}
              </div>
            </div>
            <div className="w-12 sm:w-16 md:w-24 text-gray-700 flex-shrink-0 text-left font-medium text-xs sm:text-sm md:text-base">
              序号
            </div>
            <div className="w-20 sm:w-24 md:w-32 text-gray-700 flex-shrink-0 text-left font-medium text-xs sm:text-sm md:text-base">
              文件类型
            </div>
            <div className="flex-1 text-gray-700 min-w-80 text-left font-medium text-xs sm:text-sm md:text-base pl-[100px]">
              标题或标签
            </div>
            <div className="w-24 sm:w-32 md:w-40 text-gray-700 flex-shrink-0 text-left font-medium text-xs sm:text-sm md:text-base mr-[50px]">
              上传日期
            </div>
          </div>

          {/* 表头分隔线 */}
          <div className="bg-[#E0E1E5] mt-4 w-full h-[1px]"></div>
        </div>
      )}

      {/* 可滚动的内容区域 */}
      <div className="flex-[1_1_0] min-h-0 flex flex-col">
        <div
          ref={scrollContainerRef}
          className="overflow-y-auto auto-hide-scrollbar h-[calc(100%-50px)]"
        >
        {(isDeleting || isMoving) && (
          <>
            {/* 背景遮罩层 */}
            <div className="fixed inset-0 bg-black bg-opacity-30 z-50" />
            {/* 加载状态提示 */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[60] bg-white rounded-lg shadow-lg p-6 flex items-center justify-center min-w-[200px]">
              <div className="flex items-center">
                <div className="w-5 h-5 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-base text-gray-700 font-medium">
                  {isDeleting ? "删除中..." : "移动中..."}
                </span>
              </div>
            </div>
          </>
        )}
        {isLoading ? (
          <div className="text-center py-8 sm:py-10 md:py-12 text-gray-500">
            <div className="flex items-center justify-center">
              <div className="w-4 h-4 sm:w-5 h-5 border-3 sm:border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-2 sm:mr-3"></div>
              <span className="text-[12px] sm:text-[14px] md:text-[16px]">加载中...</span>
            </div>
          </div>
        ) : folderContents.length === 0 ? (
          <div className="text-center py-8 sm:py-10 md:py-12 text-gray-500">
            <span className="text-[12px] sm:text-[14px] md:text-[16px]">该文件夹暂无内容</span>
          </div>
        ) : (
          <div className="w-full">
            {/* 表格内容 */}
            {folderContents.map((item, index) => (
              <div key={item.item_id}>
                <div className="flex items-center h-12 sm:h-14 md:h-16 w-full">
                  {/* 复选框列 */}
                  <div className="w-10 sm:w-14 md:w-20 flex justify-center flex-shrink-0">
                    <div
                      onClick={() => handleCheckboxClick(item.item_id)}
                      className={cn(
                        "w-5 h-5 bg-white rounded border relative transition-colors",
                        selectedItems.has(item.item_id)
                          ? "border-[#3B80FF] bg-[#3B80FF]"
                          : "border-[#666666] bg-white",
                        isDeleting || isMoving || isImporting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-[#3B80FF]'
                      )}
                    >
                      {selectedItems.has(item.item_id) && (
                        <div
                          className="absolute  left-[5px] w-[8px] h-[14px] border-2 border-white border-t-0 border-l-0 transform rotate-45"
                        />
                      )}
                    </div>
                  </div>

                  {/* 序号列 */}
                  <div className="w-12 sm:w-16 md:w-24 text-gray-700 flex-shrink-0 text-left text-xs sm:text-sm md:text-base">
                    {index + 1}
                  </div>

                  {/* 文件类型列 */}
                  <div className="w-20 sm:w-24 md:w-32 text-gray-700 flex-shrink-0 flex items-center justify-center pr-[100px]">
                    <img
                      src={getFileTypeIcon(item.file_type, item.item_type)}
                      alt={item.file_type || item.item_type}
                      className="w-[25px] h-[30px]"
                    />
                  </div>

                  {/* 标题列 */}
                  <div className="flex-1 text-gray-700 truncate text-left min-w-0 pl-[100px] text-xs sm:text-sm md:text-base" title={item.title}>
                    {item.title}
                  </div>

                  {/* 上传日期列 */}
                  <div className="w-24 sm:w-32 md:w-40 text-gray-700 flex-shrink-0 text-left text-xs sm:text-sm md:text-base mr-[50px]">
                    {formatDate(item.added_at)}
                  </div>
                </div>

                {/* 行分隔线 */}
                {index < folderContents.length - 1 && (
                  <div className="bg-[#E0E1E5] h-[1px]"></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 底部操作按钮 */}
        {showBulkActions && (
          <div>
            {/* 按钮容器 */}
            <div
              className={cn(
                "fixed bottom-2 z-100 transition-all duration-300 ease-in-out",
                sidebarOpen ? "w-[calc(100%-755px)] left-[700px]" : "w-[calc(100%-535px)] left-[490px]",
                isDeleting || isMoving ? "opacity-50 pointer-events-none" : "opacity-100 pointer-events-auto"
              )}
            >
              <div className="flex items-center justify-between p-4 w-full">
                {/* 左侧：复选框、选择计数和操作按钮 */}
                <div className="flex items-center">
                  {/* 选中的复选框（不可点击） */}
                  <div className="w-5 h-5 bg-[#3B80FF] rounded border border-[#3B80FF] relative flex-shrink-0">
                    <div
                      className="absolute left-[5px] w-[8px] h-[14px] border-2 border-white border-t-0 border-l-0 transform rotate-45"
                    />
                  </div>

                  <span className="text-gray-700 text-sm ml-2 mr-8 whitespace-nowrap">
                    已选择 {selectedItems.size} 项
                  </span>

                  {/* 移动按钮 */}
                  <button
                    onClick={() => setShowMoveToModal(true)}
                    disabled={isDeleting || isMoving}
                    className="bg-[#3B80FF] text-white rounded-full text-base border-none cursor-pointer hover:bg-[#2E6EFF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-[128px] h-[40px]"
                  >
                    移动到
                  </button>
                </div>

                {/* 右侧：取消和删除按钮 */}
                <div className="flex items-center">
                  {/* 取消按钮 */}
                  <button
                    onClick={handleCancelSelection}
                    disabled={isDeleting || isMoving}
                    className="bg-white border border-[#C8C9CC] text-[#666666] rounded-full text-base cursor-pointer mr-4 hover:bg-[#F8F9FA] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-[128px] h-[40px]"
                  >
                    取消
                  </button>

                  {/* 删除按钮 */}
                  <button
                    onClick={handleBulkDelete}
                    disabled={isDeleting || isMoving}
                    className="bg-[#FF4B4B] text-white rounded-full text-base border-none cursor-pointer hover:bg-[#E54040] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-[128px] h-[40px]"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* 编辑知识库弹窗 */}
      <KnowledgeBaseModal
        isOpen={showEditModal}
        mode="edit"
        folder={folder}
        onClose={() => {
          setShowEditModal(false);
        }}
        onSuccess={async () => {
          setShowEditModal(false);
          // 重新获取文件夹信息以更新显示
          try {
            const response = await apiGet(`/api/folders/${folder.folder_id}`);
            if (response.data) {
              // 更新父组件中的文件夹数据
              onFolderUpdate(response.data);
            }
          } catch (error) {
            console.error('获取更新后的文件夹信息失败:', error);
          }
        }}
      />

      {/* 删除确认弹窗 */}
      <DeleteModal
        isOpen={showDeleteModal}
        folder={{ folder_id: folder.folder_id, folder_name: `删除 ${selectedItems.size} 个内容` } as Folder}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmBulkDelete}
      />

      {/* 移动到弹窗 */}
      <MoveToModal
        isOpen={showMoveToModal}
        onClose={() => setShowMoveToModal(false)}
        currentFolderId={folder.folder_id}
        selectedItems={selectedItems}
        folderContents={folderContents}
        onFolderContentsChange={(newContents) => {
          // 直接更新文件夹内容，移除已移动的项目
          setFolderContents(newContents);
        }}
        onSuccess={() => {
          // 移动成功后清空选择状态并关闭底部操作栏
          setSelectedItems(new Set());
          setShowBulkActions(false);
        }}
        onMovingChange={setIsMoving}
      />
    </div>
  );
}