import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Folder as FolderIcon, Database, ChevronDown, ChevronRight, FolderOpen, Plus, Edit, Trash2, MoreVertical } from "lucide-react";
import { apiGet, apiDel, apiRequest, BusinessError } from "@/api/request";
import { toast } from "sonner";
import KnowledgeBaseModal from "./KnowledgeBaseModal";
import DeleteModal from "./DeleteModal";
import Toolbar from "./Toolbar";
import ImportModal from "./ImportModal";
import FolderDetailPage from "./FolderDetailPage";
import { Folder } from "../../types/foder";
import { useAutoHideScrollbar } from "@/hooks/use-auto-hide-scrollbar";
import AvatarHoverMenu from "../chat/common/AvatarHoverMenu";

interface KnowledgeBasePageProps {
  isSidebarOpen?: boolean;
}

const KnowledgeBasePage: React.FC<KnowledgeBasePageProps> = ({ isSidebarOpen = false }) => {
  const router = useRouter();

  // 调试日志
  useEffect(() => {
    console.log('KnowledgeBasePage isSidebarOpen:', isSidebarOpen);
  }, [isSidebarOpen]);

  const [folders, setFolders] = useState<Folder[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [showDetailPage, setShowDetailPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<Folder | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [showKnowledgeBaseModal, setShowKnowledgeBaseModal] = useState(false);
  const [knowledgeBaseModalMode, setKnowledgeBaseModalMode] = useState<"create" | "edit">("create");
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const popupRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const dropdownCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 为内容区域滚动容器使用 Hook
  const { containerRef: scrollContainerRef } = useAutoHideScrollbar();

  // 获取文件夹列表
  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      const response = await apiGet<{ folders: Folder[] }>("/api/folders");
      const folders = response.data.folders || [];
      setFolders(folders);
    } catch (error) {
      console.error("获取文件夹失败:", error);
      toast.error("获取文件夹列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  // 监听URL参数变化，处理页面刷新的情况
  useEffect(() => {

    if (router.isReady && router.query.folder && folders.length > 0) {
      const folderId = router.query.folder as string;
      const folder = folders.find((f) => f.folder_id === folderId);


      if (
        folder &&
        (!selectedFolder || selectedFolder.folder_id !== folderId)
      ) {

        setSelectedFolder(folder);
        setShowDetailPage(true);
      }
    } else if (!router.query.folder && showDetailPage) {

      // URL中没有folder参数时，返回列表页
      setShowDetailPage(false);
      setSelectedFolder(null);
    }
  }, [router.isReady, router.query.folder, folders]); // 移除 selectedFolder 和 showDetailPage 避免无限循环

  // 处理文件夹点击
  const handleFolderClick = (folder: Folder) => {


    // 暂时注释掉URL更新，专注解决页面切换问题
    setSelectedFolder(folder);
    setShowDetailPage(true);


    // 延迟更新URL，避免冲突
    setTimeout(() => {

      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, folder: folder.folder_id },
        },
        undefined,
        { shallow: true }
      );
    }, 100);
  };

  // 添加调试日志


  // 添加状态变化监听
  useEffect(() => {

  }, [showDetailPage]);

  useEffect(() => {

  }, [selectedFolder]);

  // 返回列表页
  const handleBackToList = () => {
    fetchFolders();

    setShowDetailPage(false);
    setSelectedFolder(null);
    // 移除folder参数
    const { folder, ...restQuery } = router.query;
    router.push(
      {
        pathname: router.pathname,
        query: restQuery,
      },
      undefined,
      { shallow: true }
    );
  };

  // 处理文件夹更新
  const handleFolderUpdate = (updatedFolder: Folder) => {
    setFolders((prev) =>
      prev.map((f) =>
        f.folder_id === updatedFolder.folder_id ? updatedFolder : f
      )
    );
    // 同时更新 selectedFolder，确保详情页使用最新数据
    setSelectedFolder((prev) =>
      prev && prev.folder_id === updatedFolder.folder_id ? updatedFolder : prev
    );
  };

  // 执行删除文件夹
  const executeDeleteFolder = async () => {
    if (!folderToDelete) return;

    // 立即关闭删除确认弹窗
    setFolderToDelete(null);
    setShowDeleteModal(false);

    try {
      await apiDel(`/api/folders/${folderToDelete.folder_id}`);
      await fetchFolders();

      if (
        selectedFolder &&
        selectedFolder.folder_id === folderToDelete.folder_id
      ) {
        setSelectedFolder(null);
      }

      toast.success("文件夹删除成功");
    } catch (error) {
      console.error("删除文件夹失败:", error);
      toast.error("删除文件夹失败");
    }
  };

  // 打开删除确认弹窗
  const openDeleteModal = (folder: Folder) => {
    setFolderToDelete(folder);
    setShowDeleteModal(true);
    setActivePopupId(null); // 关闭操作菜单
  };

  const openEditModal = (folder: Folder) => {
    setEditingFolder(folder);
    setKnowledgeBaseModalMode("edit");
    setShowKnowledgeBaseModal(true);
    setActivePopupId(null);
  };

  const openCreateModal = () => {
    setKnowledgeBaseModalMode("create");
    setEditingFolder(null);
    setShowKnowledgeBaseModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setFolderToDelete(null);
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

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

  // 格式化文件大小
  const formatFileSize = (bytes: number | null | undefined): string => {
    if (!bytes || bytes === 0) return "-";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  // 获取文件数量显示文本
  const getFileCountText = (folder: Folder) => {
    const count = folder.item_count ?? 0;
    if (count === 0) return "0个内容";
    if (count === 1) return "1个内容";
    return `${count}个内容`;
  };

  // 切换操作菜单显示/隐藏
  const togglePopup = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止事件冒泡，避免触发双击事件
    setActivePopupId(activePopupId === folderId ? null : folderId);
  };

  // 点击其他地方时关闭所有操作菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activePopupId && popupRefs.current[activePopupId]) {
        const popupElement = popupRefs.current[activePopupId];
        if (popupElement && !popupElement.contains(e.target as Node)) {
          setActivePopupId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activePopupId]);

  // 点击其他地方时关闭"创建的知识库"下拉菜单
  useEffect(() => {
    const handleClickOutsideDropdown = (e: MouseEvent) => {
      const target = e.target as Node;
      const dropdownContainer = document.querySelector('[data-dropdown="knowledge-base-list"]');
      if (expanded && dropdownContainer && !dropdownContainer.contains(target)) {
        setExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutsideDropdown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutsideDropdown);
    };
  }, [expanded]);

  // 处理鼠标离开下拉菜单的延迟关闭
  const handleMouseLeaveDropdown = () => {
    // 清除之前的定时器
    if (dropdownCloseTimerRef.current) {
      clearTimeout(dropdownCloseTimerRef.current);
    }
    // 设置新的定时器
    dropdownCloseTimerRef.current = setTimeout(() => {
      setExpanded(false);
    }, 150);
  };

  const handleMouseEnterDropdown = () => {
    // 清除定时器，防止关闭
    if (dropdownCloseTimerRef.current) {
      clearTimeout(dropdownCloseTimerRef.current);
      dropdownCloseTimerRef.current = null;
    }
  };

  // 修复的ref回调函数 - 返回void
  const setPopupRef = (folderId: string) => (el: HTMLDivElement | null) => {
    popupRefs.current[folderId] = el;
  };

  return (
    <>
      {/* 头像组件 - 固定在右上角 */}
      <AvatarHoverMenu />

      {/* 顶部固定导航栏 */}
      <div
        className={`fixed top-0 z-40 bg-gradient-to-r from-[#F0FDFA] to-[#ECFDF5] transition-all duration-300 ${
          isSidebarOpen ? "left-[193px] sm:left-[209px] md:left-[225px]" : "left-[85px] sm:left-[80px]"
        }`}
        style={{ right: '5px' }}
      >
        <div className="h-[84px] flex items-center px-6 gap-6">
          {/* 知识库标题 */}
          <div className="flex items-center flex-shrink-0">
            <FolderIcon
              className="w-[28px] h-[28px] mr-3"
            />
            <h1 className="text-[24px] font-medium text-[#333333] leading-[30px]">
              知识库
            </h1>
          </div>

          {/* 分隔线 */}
          <div className="w-px h-8 bg-gray-300 flex-shrink-0" />

          {/* 我的知识库 */}
          <div
            className="flex items-center cursor-pointer hover:bg-[rgba(59,128,255,0.07)] transition-colors rounded-lg px-3 py-2 flex-shrink-0"
            onClick={handleBackToList}
          >
            <Database
              className="w-[20px] h-[20px] mr-2"
            />
            <span className="text-[16px] font-medium text-[#333333] leading-[24px]">
              我的知识库
            </span>
          </div>

          {/* 创建的知识库 - 下拉菜单 */}
          <div
            className="relative flex-shrink-0"
            data-dropdown="knowledge-base-list"
            onMouseLeave={handleMouseLeaveDropdown}
            onMouseEnter={handleMouseEnterDropdown}
          >
            <div
              className="flex items-center gap-2 cursor-pointer hover:bg-[rgba(59,128,255,0.07)] transition-colors rounded-lg px-3 py-2"
              onClick={toggleExpand}
            >
              {expanded ? (
                <ChevronDown
                  className="w-[15px] h-[15px]"
                />
              ) : (
                <ChevronRight
                  className="w-[15px] h-[15px]"
                />
              )}
              <span className="text-[16px] font-medium text-[#333333] leading-[24px]">
                创建的知识库
              </span>
              <span className="text-xs text-gray-900 bg-gray-200 px-2 py-0.5 rounded-full">
                {folders.length}
              </span>
            </div>

            {/* 下拉列表 */}
            {expanded && (
              <div
                className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-lg shadow-lg border border-gray-200 max-h-[400px] overflow-y-auto z-50"
                onMouseEnter={handleMouseEnterDropdown}
              >
                {isLoading ? (
                  <div className="text-center py-6 text-gray-500">
                    <div className="flex items-center justify-center">
                      <div className="w-4 h-4 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span className="text-sm">加载中...</span>
                    </div>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    暂无知识库
                  </div>
                ) : (
                  <div className="py-2">
                    {folders.map((folder) => (
                      <div
                        key={folder.folder_id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFolderClick(folder);
                        }}
                        className={`flex items-center px-4 py-2 cursor-pointer transition-colors ${
                          selectedFolder?.folder_id === folder.folder_id
                            ? "bg-[rgba(13,148,136,0.1)]"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        {selectedFolder?.folder_id === folder.folder_id ? (
                          <FolderOpen
                            className="w-[17px] h-[21px] mr-3 flex-shrink-0"
                          />
                        ) : (
                          <FolderIcon
                            className="w-[17px] h-[21px] mr-3 flex-shrink-0"
                          />
                        )}
                        <span
                          className={`${
                            selectedFolder?.folder_id === folder.folder_id
                              ? "text-[#0D9488] font-medium"
                              : "text-gray-700"
                          } text-[14px] whitespace-nowrap overflow-hidden text-ellipsis flex-1`}
                          title={folder.folder_name}
                        >
                          {folder.folder_name}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 新建知识库按钮 */}
          <div className="flex-shrink-0">
            <button
              onClick={openCreateModal}
              className="flex items-center h-[36px] px-4 bg-gradient-to-r from-[#14B8A6] to-[#0D9488] rounded-[18px] text-white text-[16px] font-normal hover:opacity-90 transition-opacity"
            >
              <Plus
                className="w-[20px] h-[20px] mr-2"
              />
              新建知识库
            </button>
          </div>
        </div>
      </div>

      {/* 占位元素，防止内容被固定导航栏遮挡 */}
      <div className="h-[84px]" />

      <div className="flex h-full w-full overflow-hidden">
      {/* 知识库弹窗（创建/编辑） */}
      <KnowledgeBaseModal
        isOpen={showKnowledgeBaseModal}
        mode={knowledgeBaseModalMode}
        folder={editingFolder}
        onClose={() => {
          setShowKnowledgeBaseModal(false);
          setEditingFolder(null);
        }}
        onSuccess={fetchFolders}
      />

      {/* 删除确认弹窗 */}
      <DeleteModal
        isOpen={showDeleteModal}
        folder={folderToDelete}
        onClose={closeDeleteModal}
        onConfirm={executeDeleteFolder}
      />

      {/* 右侧内容区域 - 响应式布局 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 bg-white min-w-0 ml-[10px]"
      >
        {showDetailPage && selectedFolder ? (
          // 文件夹详情页面
          (() => {

            return (
              <FolderDetailPage
                folder={selectedFolder}
                onBack={handleBackToList}
                onFolderUpdate={handleFolderUpdate}
                isSidebarOpen={isSidebarOpen}
              />
            );
          })()
        ) : (
          <>
            {/* 未选择文件夹时的欢迎页面 */}
            <div className="w-full h-full p-3 sm:p-4 md:p-6 pt-0">
              {/* 工具栏 */}
              <Toolbar
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onCreateClick={openCreateModal}
              />

              {/* 欢迎标题 */}
              <div className="mt-0 pb-[30px] sm:pb-[40px] md:pb-[50px]">
                <h1 className="text-[20px] sm:text-[24px] md:text-[30px] font-medium text-gray-900 mb-3 sm:mb-4 md:mb-5">
                  所有知识库
                </h1>

                {/* 描述文字 */}
                <div className="mb-6 sm:mb-8 md:mb-10">
                  <p className="text-[16px] sm:text-[18px] md:text-[20px] font-normal text-gray-700">
                    查看和管理您所有的知识库
                  </p>
                </div>
              </div>

              {/* 根据视图模式显示不同内容 */}
              {viewMode === "list" ? (
                // 列表视图模式 - 表格
                <div className="w-full overflow-y-auto scrollbar-thin" style={{ marginTop: '-30px', maxHeight: 'calc(100vh - 250px)' }}>
                  {/* 表头 */}
                  <div className="flex mb-4 w-full">
                    <div className="flex-1 text-[14px] sm:text-[16px] md:text-[18px] font-medium text-gray-700 min-w-80 ">
                      知识库名称
                    </div>
                    <div className="w-20 sm:w-24 md:w-28 text-[14px] sm:text-[16px] md:text-[18px] font-medium text-gray-700 flex-shrink-0 hidden sm:block mr-[200px]">
                      内容
                    </div>
                    <div className="w-24 sm:w-28 md:w-32 text-[14px] sm:text-[16px] md:text-[18px] font-medium text-gray-700 flex-shrink-0 hidden md:block mr-[150px]">
                      创建日期
                    </div>
                    <div className="w-20 sm:w-24 md:w-28 text-[14px] sm:text-[16px] md:text-[18px] font-medium text-gray-700 flex-shrink-0">
                      操作
                    </div>
                  </div>

                  {/* 表头分隔线 */}
                  <div
                    className="bg-[#E0E1E5]"
                    style={{
                      width: "100%",
                      height: "1px",
                    }}
                  ></div>

                  {/* 表格内容 */}
                  {isLoading ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-[12px] sm:text-[14px] md:text-[16px]">
                          加载中...
                        </span>
                      </div>
                    </div>
                  ) : folders.length > 0 ? (
                    folders.map((folder, index) => (
                      <div key={folder.folder_id}>
                        <div className="flex items-center w-full cursor-pointer hover:bg-gray-50 rounded transition-colors" style={{ height: "80px" }} onClick={() => handleFolderClick(folder)}>
                          {/* 知识库名称列 */}
                          <div className="flex items-center flex-1 pr-2">
                            <FolderIcon
                              className="w-[14px] h-[18px] sm:w-[17px] sm:h-[21px] mr-2 sm:mr-3 flex-shrink-0"
                            />
                            <span className="text-[12px] sm:text-[14px] md:text-[16px] text-gray-700 truncate" title={folder.folder_name}>
                              {folder.folder_name}
                            </span>
                          </div>

                          {/* 内容列 - 小屏幕时隐藏 */}
                          <div className="w-20 sm:w-24 md:w-28 text-gray-700 flex-shrink-0 hidden sm:block text-xs sm:text-sm md:text-base mr-[200px]">
                            {getFileCountText(folder)}
                          </div>

                          {/* 创建日期列 - 中等屏幕及以上显示 */}
                          <div className="w-24 sm:w-28 md:w-32 text-gray-700 flex-shrink-0 hidden md:block text-xs sm:text-sm md:text-base mr-[150px]">
                            {formatDate(folder.create_time)}
                          </div>

                          {/* 操作列 */}
                          <div className="w-20 sm:w-24 md:w-28 flex items-center flex-shrink-0 pr-5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(folder);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                            >
                              <Edit style={{ width: "16px", height: "16px" }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(folder);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              style={{ marginLeft: "12px" }}
                            >
                              <Trash2 style={{ width: "16px", height: "16px" }} />
                            </button>
                          </div>
                        </div>

                        {/* 行分隔线 */}
                        {index < folders.length - 1 && (
                          <div className="bg-[#E0E1E5] h-[1px]" ></div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      暂无知识库，请在左侧创建新的知识库
                    </div>
                  )}
                </div>
              ) : (
                // 网格视图模式
                <div>
                  {isLoading ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                        <span className="text-[12px] sm:text-[14px] md:text-[16px]">
                          加载中...
                        </span>
                      </div>
                    </div>
                  ) : folders.length > 0 ? (
                    <div
                      className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6"
                      style={{
                        gridTemplateColumns:
                          "repeat(auto-fill, minmax(280px, 1fr))",
                      }}
                    >
                      {folders.map((folder) => (
                        <div
                          key={folder.folder_id}
                          className="relative cursor-pointer hover:shadow-lg transition-shadow w-full h-48 sm:h-52 md:h-56 lg:h-64 rounded-lg overflow-hidden"
                          onClick={() => handleFolderClick(folder)}
                        >
                          {/* 文件夹图片 - 如果有用户上传的封面则显示，否则显示默认浅绿色背景 */}
                          {folder.cover_image_url || folder.cover_image ? (
                            <img
                              src={
                                folder.cover_image_url ||
                                (folder.cover_image
                                  ? (folder.cover_image.startsWith('covers/') || folder.cover_image.startsWith('avatars/')
                                    ? `/api/uploads/${folder.cover_image}`
                                    : `https://library-cos.century-cloud.com/${folder.cover_image}`)
                                  : "")
                              }
                              alt={folder.folder_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex flex-col items-center justify-center"
                              style={{ backgroundColor: "#5bc77bff" }}
                            >
                              <div
                                className="absolute"
                                style={{
                                  left: "12px",
                                  bottom: "45px",
                                  color: "#333333",
                                  fontWeight: 500,
                                  fontSize: "14px",
                                  lineHeight: "30px",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                }}
                              >
                         
                              </div>
                              <div
                                className="absolute top-1/5 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                                style={{
                                  color: "#dfd9d9ff",
                                  fontWeight: 500,
                                  fontSize: "65px",
                                  lineHeight: "25px",
                                  textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                                }}
                              >
                                library
                              </div>
                              </div>
                            
                          )}

                          {/* 文件夹名称 */}
                          <div
                            className="absolute"
                            style={{
                              left: "12px",
                              bottom: "45px",
                              color: "#031507ff",
                              fontWeight: 500,
                              fontSize: "16px",
                              lineHeight: "40px",
                              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            <span className="truncate block max-w-[120px] sm:max-w-[160px] md:max-w-[200px]">
                              {folder.folder_name}
                            </span>
                          </div>

                          {/* 创建时间 */}
                          <div
                            className="absolute"
                            style={{
                              left: "12px",
                              bottom: "20px",
                              color: "#086311ff",
                              fontSize: "12px",
                              lineHeight: "25px",
                              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            {formatDate(folder.create_time)}
                          </div>

                          {/* 文件数量 */}
                          <div
                            className="absolute"
                            style={{
                              right: "60px",
                              bottom: "20px",
                              color: "#086311ff",
                              fontSize: "12px",
                              lineHeight: "25px",
                              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            {getFileCountText(folder)}
                          </div>

                          {/* 操作菜单按钮 */}
                          <div
                            className="absolute cursor-pointer hover:bg-white/90 transition-colors"
                            style={{
                              bottom: "15px",
                              right: "15px",
                              width: "16px",
                              height: "16px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: "rgba(255,255,255,0.8)",
                              borderRadius: "50%",
                            }}
                            onClick={(e) => togglePopup(folder.folder_id, e)}
                          >
                            <MoreVertical
                              style={{
                                width: "12px",
                                height: "12px",
                                transform: "rotate(90deg)",
                              }}
                            />
                          </div>

                          {/* 操作菜单弹窗 - 显示在按钮右下方 */}
                          {activePopupId === folder.folder_id && (
                            <div
                              ref={setPopupRef(folder.folder_id)}
                              className="absolute z-50"
                              style={{
                                bottom: "0px",
                                right: "15px",
                                background: "#FFFFFF",
                                boxShadow:
                                  "0px 10px 29px 1px rgba(89,106,178,0.1)",
                                borderRadius: "12px",
                                border: "1px solid #E9ECF2",
                                width: "100px",
                                height: "80px",
                              }}
                              onMouseLeave={() => setActivePopupId(null)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex flex-col h-full">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditModal(folder);
                                  }}
                                  className="w-full text-left hover:bg-[rgba(59,128,255,0.1)] transition-colors"
                                  style={{
                                    fontSize: "14px",
                                    color: "#333333",
                                    padding: "10px 15px",
                                    borderTopLeftRadius: "12px",
                                    borderTopRightRadius: "12px",
                                  }}
                                >
                                  资料修改
                                </button>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openDeleteModal(folder);
                                  }}
                                  className="w-full text-left hover:bg-[rgba(59,128,255,0.1)] transition-colors"
                                  style={{
                                    fontSize: "14px",
                                    color: "#333333",
                                    padding: "10px 15px",
                                    borderBottomLeftRadius: "12px",
                                    borderBottomRightRadius: "12px",
                                  }}
                                >
                                  删除
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      暂无知识库，请在左侧创建新的知识库
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </>
  );
};

export default KnowledgeBasePage;
