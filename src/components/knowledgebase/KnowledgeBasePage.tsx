import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
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

  // 为两个滚动容器分别使用 Hook
  const { containerRef: scrollContainerRef1 } = useAutoHideScrollbar();
  const { containerRef: scrollContainerRef2 } = useAutoHideScrollbar();

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

  // 修复的ref回调函数 - 返回void
  const setPopupRef = (folderId: string) => (el: HTMLDivElement | null) => {
    popupRefs.current[folderId] = el;
  };

  return (
    <>
      {/* 头像组件 - 固定在右上角 */}
      <AvatarHoverMenu />

      <div className="flex h-full w-full">
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

      {/* 左侧知识库面板 - 响应式布局 */}
      <div
        ref={scrollContainerRef1}
        className="w-[280px] lg:w-[320px] h-full bg-[#F7F8FA] rounded-[10px] border-r border-gray-200 overflow-y-auto flex-shrink-0 auto-hide-scrollbar
                      md:w-[280px] sm:w-[240px] xs:w-[200px]"
      >
        {/* 内容容器 - 距离顶部40px */}
        <div className="pt-[50px] px-4 sm:px-6">
        {/* 知识库标题 */}
        <div className="flex items-center mb-6">
          <img
            src="/slibar/folder1.png"
            alt="知识库图标"
            className="w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] lg:w-[31px] lg:h-[30px] mr-3 sm:mr-6"
          />
          <h1 className="text-[20px] sm:text-[24px] lg:text-[30px] font-medium text-[#333333] leading-[30px] sm:leading-[35px] lg:leading-[40px]">
            知识库
          </h1>
        </div>

        {/* 新建知识库按钮 */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center w-full sm:w-[240px] h-[32px] sm:h-[36px] bg-gradient-to-r from-[#14B8A6] to-[#0D9488] rounded-[16px] sm:rounded-[18px] text-white text-[14px] sm:text-[16px] font-normal"
          >
            <img
              src="/slibar/plus.svg"
              alt="添加"
              className="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] mr-2 rounded-[1px]"
            />
            <span className="hidden xs:inline">新建知识库</span>
            <span className="xs:hidden">新建</span>
          </button>
        </div>

        {/* 我的知识库区域 */}
        <div>
          <div
            className="flex items-center mb-3 cursor-pointer hover:bg-[rgba(59,128,255,0.07)] transition-colors rounded-lg p-2"
            onClick={handleBackToList}
          >
            <img
              src="/slibar/slibar-knowledge-base@2x.png"
              alt="我的知识库"
              className="w-[16px] h-[16px] sm:w-[20px] sm:h-[20px] mr-2"
            />
            <span className="text-[14px] sm:text-[16px] font-medium text-[#333333] leading-[30px] sm:leading-[40px]">
              我的知识库
            </span>
          </div>

          {/* 创建的知识库 - 可展开/收起 */}
          <div className="ml-3 sm:ml-6">
            <div
              className="flex items-center justify-between mb-2 cursor-pointer"
              onClick={toggleExpand}
            >
              <div className="flex items-center">
                <img
                  src={
                    expanded ? "/slibar/fileopen.svg" : "/slibar/filelist.svg"
                  }
                  alt={expanded ? "收起" : "展开"}
                  className="w-[12px] h-[12px] sm:w-[15px] sm:h-[15px] mr-2"
                />
                <span className="text-[12px] sm:text-[14px] xs:text-[16px] font-medium text-[#333333] leading-[30px] sm:leading-[40px] w-[120px] sm:w-[160px] lg:w-[180px] truncate">
                  创建的知识库
                </span>
              </div>
              <span className="text-[10px] sm:text-xs text-gray-900">
                {folders.length}
              </span>
            </div>

            {expanded && (
              <div className="space-y-1 mt-2">
                {isLoading ? (
                  <div className="text-center py-4 text-gray-500">
                    加载中...
                  </div>
                ) : folders.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    暂无知识库
                  </div>
                ) : (
                  folders.map((folder) => (
                    <div
                      key={folder.folder_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFolderClick(folder);
                      }}
                      className={`relative flex items-center cursor-pointer transition-colors rounded-[10px] ${
                        selectedFolder?.folder_id === folder.folder_id
                          ? "bg-[rgba(59,128,255,0.07)]"
                          : "hover:bg-[rgba(59,128,255,0.07)]"
                      }`}
                      style={{
                        height: "32px",
                        marginLeft: "-20px",
                        marginRight: "4px",
                        paddingLeft: "40px",
                        paddingRight: "20px",
                      }}
                    >
                      <img
                        src={
                          selectedFolder?.folder_id === folder.folder_id
                            ? "/slibar/slibar-shinycreatebase@2x.png"
                            : "/slibar/slibar-createbase@2x.png"
                        }
                        alt="文件夹"
                        className="w-[14px] h-[18px] sm:w-[17px] sm:h-[21px] mr-2"
                      />
                      <span
                        className={`${
                          selectedFolder?.folder_id === folder.folder_id
                            ? "text-[#0D9488] font-medium"
                            : "text-gray-700"
                        } text-[12px] sm:text-[14px] xs:text-[16px] leading-[32px] sm:leading-[40px] whitespace-nowrap overflow-hidden text-ellipsis`}
                        style={{ maxWidth: "60px" }}
                        title={folder.folder_name}
                      >
                        {folder.folder_name}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* 右侧内容区域 - 响应式布局 */}
      <div
        ref={scrollContainerRef2}
        className="flex-1 bg-white overflow-y-auto min-w-0 auto-hide-scrollbar"
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
                <div className="space-y-[8px] sm:space-y-[10px] mb-6 sm:mb-8 md:mb-10">
                  <p className="text-[16px] sm:text-[18px] md:text-[20px] font-normal text-gray-700">
                    查看和管理您所有的知识库
                  </p>
                  <p className="text-[16px] sm:text-[18px] md:text-[20px] font-normal text-gray-700">
                    点击左侧"新建知识库"创建新的知识库，或点击文件夹查看详细内容
                  </p>
                </div>
              </div>

              {/* 知识库列表标题 */}
              <h2 className="text-[16px] sm:text-[18px] md:text-[20px] font-medium text-gray-900 mb-4 sm:mb-5 md:mb-6">
                所有知识库
              </h2>

              {/* 根据视图模式显示不同内容 */}
              {viewMode === "list" ? (
                // 列表视图模式 - 表格
                <div className="w-full">
                  {/* 表头 */}
                  <div className="flex mb-4 w-full">
                    <div className="flex-1 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-gray-700 min-w-80 ">
                      知识库名称
                    </div>
                    <div className="w-20 sm:w-24 md:w-28 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-gray-700 flex-shrink-0 hidden sm:block mr-[200px]">
                      内容
                    </div>
                    <div className="w-24 sm:w-28 md:w-32 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-gray-700 flex-shrink-0 hidden md:block mr-[150px]">
                      创建日期
                    </div>
                    <div className="w-20 sm:w-24 md:w-28 text-[12px] sm:text-[14px] md:text-[16px] font-medium text-gray-700 flex-shrink-0">
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
                            <img
                              src="/slibar/slibar-createbase@2x.png"
                              alt="文件夹"
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
                              <img src="/slibar/slibar-edit@2x.png" alt="编辑" style={{ width: "16px", height: "16px" }} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDeleteModal(folder);
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              style={{ marginLeft: "12px" }}
                            >
                              <img src="/settings/settings-delete@2x.png" alt="删除" style={{ width: "16px", height: "16px" }} />
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
                          {/* 文件夹图片 - 如果有用户上传的封面则显示，否则显示默认图片 */}
                          <img
                            src={
                              folder.cover_image_url ||
                              (folder.cover_image
                                ? `https://library-cos.century-cloud.com/${folder.cover_image}`
                                : "/slibar/slibar-directoryedit@2x.png")
                            }
                            alt={folder.folder_name}
                            className="w-full h-full object-cover"
                          />

                          {/* 文件夹名称 */}
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
                              color: "#999999",
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
                              color: "#999999",
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
                            <img
                              src="/settings/settins-details.svg"
                              alt="更多操作"
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
