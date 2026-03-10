import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiGet, apiPost, apiDel } from "@/api/request";
import { Folder } from "../../types/foder";
import { cn } from "@/lib/utils";

interface MoveToModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string;
  selectedItems: Set<string>;
  folderContents: any[];
  onFolderContentsChange: (newContents: any[]) => void;
  onSuccess: () => void;
  onMovingChange?: (isMoving: boolean) => void; // 新增：通知父组件移动状态
}

interface FolderOption {
  folder_id: string;
  folder_name: string;
  create_time?: string;
  description?: string;
}

export default function MoveToModal({
  isOpen,
  onClose,
  currentFolderId,
  selectedItems,
  folderContents,
  onFolderContentsChange,
  onSuccess,
  onMovingChange,
}: MoveToModalProps) {
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  // 加载文件夹列表
  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const response = await apiGet<{ folders: FolderOption[] }>(
        "/api/folders"
      );
      const allFolders = response.data.folders || [];

      // 过滤掉当前文件夹
      const availableFolders = allFolders.filter(
        (folder) => folder.folder_id !== currentFolderId
      );
      setFolders(availableFolders);
    } catch (error) {
      console.error("获取文件夹列表失败:", error);
      toast.error("获取文件夹列表失败");
    } finally {
      setIsLoading(false);
    }
  };

  // 当弹窗打开时加载文件夹
  useEffect(() => {
    if (isOpen) {
      loadFolders();
    }
  }, [isOpen, currentFolderId]);

  // 重置状态当弹窗关闭时
  useEffect(() => {
    if (!isOpen) {
      setSelectedFolder(null);
      setFolders([]);
      setIsMoving(false);
    }
  }, [isOpen]);

  // 处理文件夹选择
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  // 确认移动
  const handleConfirmMove = async () => {
    if (!selectedFolder) {
      toast.info("请选择目标文件夹");
      return;
    }

    if (selectedItems.size === 0) {
      toast.info("没有选中的项目");
      return;
    }

    setIsMoving(true);
    // 通知父组件开始移动
    onMovingChange?.(true);

    try {
      // 立即关闭弹窗
      onClose();

      // 准备移动的项目数据
      const itemsToMove = Array.from(selectedItems);

      // 调用移动API
      const response = await apiPost("/api/folders/items/move", {
        from_folder_id: currentFolderId,
        target_folder_id: selectedFolder,
        item_ids: itemsToMove,
      });

      if (response.code === 200) {
        toast.success(`成功移动 ${itemsToMove.length} 个项目到目标文件夹`);

        // 从当前文件夹内容中删除已移动的项目
        const remainingContents = folderContents.filter(
          (item) => !itemsToMove.includes(item.item_id)
        );
        onFolderContentsChange(remainingContents);

        onSuccess();
      } else {
        toast.error(response.message || "移动失败");
      }
    } catch (error: any) {
      console.error("移动项目失败:", error);
    } finally {
      setIsMoving(false);
      // 通知父组件移动结束
      onMovingChange?.(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date
      .toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 灰色背景罩 - 不添加点击关闭功能 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" />

      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2] z-[60] overflow-hidden w-[864px] h-[593px]"
      >
        {/* 关闭按钮 */}
        <button
          onClick={() => {
            if (!isMoving) {
              onClose();
            }
          }}
          className="absolute top-[31px] right-[31px] w-[18px] h-[18px] flex items-center justify-center text-[18px] text-gray-500 hover:text-gray-700 bg-none border-0 disabled:cursor-not-allowed"
          disabled={isMoving}
        >
          ×
        </button>

        {/* 标题栏 */}
        <div
          className="flex justify-between items-center px-[32px] pt-[26px] h-[60px]"
        >
          <h2
            className="font-[500] text-[30px] text-[#333333] m-0"
          >
            移动到
          </h2>
        </div>

        {/* 分割线 */}
        <div
          className="w-[803px] h-[1px] bg-[#E0E1E5] rounded-[1px] ml-[32px] mt-[26px]"
        />

        {/* 文件夹列表标题 */}
        <div
          className="flex items-center mt-[31px] ml-[32px]"
        >
          {/* 知识库图标 */}
          <img
            src="/slibar/slibar-knowledge-base@2x.png"
            alt="知识库"
            className="w-[20px] h-[20px] mr-[10px]"
          />
          {/* 文件夹列表标题 */}
          <div
            className="text-[16px] text-[#333333] font-[500]"
          >
            选择目标文件夹
          </div>
        </div>

        {/* 文件夹列表 */}
        <div
          className="absolute top-[166px] left-0 right-0 bottom-[100px] px-[32px] overflow-y-auto overflow-x-hidden"
        >
          {isLoading ? (
            <div
              className="text-center py-[50px] text-[#666]"
            >
              加载中...
            </div>
          ) : folders.length === 0 ? (
            <div
              className="text-center py-[50px] text-[#666]"
            >
              暂无可用文件夹
            </div>
          ) : (
            <div
              className="flex flex-col gap-[20px]"
            >
              {folders.map((folder) => (
                <div
                  key={folder.folder_id}
                  className={cn(
                    "flex items-center cursor-pointer py-[6px] relative w-[804px] h-[32px] rounded-[10px]",
                    selectedFolder === folder.folder_id
                      ? "bg-[rgba(59,128,255,0.1)]"
                      : "bg-transparent hover:bg-[rgba(59,128,255,0.1)]"
                  )}
                  onClick={() => handleFolderSelect(folder.folder_id)}
                >
                  {/* 单选框 */}
                  <div
                    className="w-[14px] h-[14px] bg-[#FFFFFF] rounded-[50%] border border-[#666666] mr-[12px] flex-shrink-0 flex items-center justify-center ml-[13px]"
                  >
                    {/* 选中状态显示蓝色圆点 */}
                    {selectedFolder === folder.folder_id && (
                      <div
                        className="w-[8px] h-[8px] bg-[#3B80FF] rounded-[50%]"
                      />
                    )}
                  </div>

                  {/* 文件夹图标 - 左边13px处 */}
                  <img
                    src="/slibar/slibar-createbase@2x.png"
                    alt="文件夹"
                    className="w-[17px] h-[21px] mr-[12px] flex-shrink-0"
                  />

                  {/* 文件夹名称 - 只显示名称 */}
                  <div
                    className="text-[14px] text-[#333333] flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {folder.folder_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 按钮区域 - 固定在底部，不参与滚动 */}
        <div
          className="absolute bottom-[30px] right-[30px] flex gap-[16px] items-center"
        >
          <button
            onClick={() => {
              if (!isMoving) {
                onClose();
              }
            }}
            disabled={isMoving}
            className="w-[128px] h-[40px] bg-[#FFFFFF] rounded-[20px] border border-[#C8C9CC] text-[16px] text-[#666666] disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200 ease hover:bg-[#F8F9FA]"
          >
            取消
          </button>
          <button
            onClick={handleConfirmMove}
            disabled={isMoving}
            className="w-[128px] h-[40px] rounded-[20px] border-0 text-[16px] text-[#FFFFFF] disabled:cursor-not-allowed disabled:opacity-60 transition-all duration-200 ease bg-[#3B80FF] disabled:bg-[#999999] hover:bg-[#2E6EFF]"
          >
            {isMoving ? "移动中..." : "确认"}
          </button>
        </div>
      </div>
    </>
  );
}
