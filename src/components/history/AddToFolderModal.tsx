import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { apiGet, apiPost } from "@/api/request";
import { cn } from "@/lib/utils";

interface FolderOption {
  folder_id: string;
  folder_name: string;
  create_time?: string;
  description?: string;
}

interface AddToFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  conversationTitle: string;
  onSuccess?: (folderId: string, folderName: string) => void;
}

export default function AddToFolderModal({
  isOpen,
  onClose,
  conversationId,
  conversationTitle,
  onSuccess,
}: AddToFolderModalProps) {
  const [folders, setFolders] = useState<FolderOption[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // 加载文件夹列表
  const loadFolders = async () => {
    try {
      setIsLoading(true);
      const response = await apiGet<{ folders: FolderOption[] }>(
        "/api/folders"
      );
      const allFolders = response.data.folders || [];
      setFolders(allFolders);
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
  }, [isOpen]);

  // 重置状态当弹窗关闭时
  useEffect(() => {
    if (!isOpen) {
      setSelectedFolder(null);
      setFolders([]);
      setIsAdding(false);
    }
  }, [isOpen]);

  // 处理文件夹选择
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
  };

  // 确认添加到知识库
  const handleConfirmAdd = async () => {
    if (!selectedFolder) {
      toast.info("请选择知识库");
      return;
    }

    setIsAdding(true);

    try {


      // 调用添加对话到知识库的API
      const response = await apiPost(`/api/folders/${selectedFolder}/items`, {
        item_type: "conversation",
        item_id: conversationId,
      });


      if (response.code === 200) {
        // 获取选中的文件夹名称
        const selectedFolderObj = folders.find(f => f.folder_id === selectedFolder);
        const folderName = selectedFolderObj?.folder_name || "";

        toast.success(`已将对话添加到知识库`);
        onSuccess?.(selectedFolder, folderName);
        onClose();
      } else {
        toast.error(response.message || "添加失败");
      }
    } catch (error: any) {
      console.error("添加对话到知识库失败:", error);
      toast.error(error.message || "添加失败，请重试");
    } finally {
      setIsAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* 灰色背景罩 */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" />

      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2] z-[60] overflow-hidden w-full max-w-[864px] max-h-[90vh] flex flex-col"
      >
        {/* 关闭按钮 */}
        <button
          onClick={() => {
            if (!isAdding) {
              onClose();
            }
          }}
          className={cn(
            "absolute z-10 top-[3%] right-[4%] w-[clamp(14px,2vw,18px)] h-[clamp(14px,2vw,18px)] flex items-center justify-center text-[clamp(14px,2vw,18px)] text-gray-500 hover:text-gray-700",
            isAdding ? "cursor-not-allowed" : "cursor-pointer"
          )}
          disabled={isAdding}
        >
          ×
        </button>

        {/* 标题栏 */}
        <div
          className="flex justify-between items-center px-[4%] pt-[3%] h-[clamp(40px,6vw,60px)]"
        >
          <h2
            className="font-[500] text-[clamp(20px,3vw,30px)] text-[#333333] m-0"
          >
            加入知识库
          </h2>
        </div>

        {/* 分割线 */}
        <div
          className="w-[92%] h-[1px] bg-[#E0E1E5] rounded-[1px] ml-[4%] mt-[3%]"
        />

        {/* 当前对话信息 */}
        <div
          className="flex items-center mt-[clamp(20px,3vw,31px)] ml-[4%]"
        >
          {/* 对话图标 */}
          <img
            src="/chat-page/chat-page-history-commontag.png"
            alt="对话"
            className="w-[clamp(16px,2.5vw,20px)] h-[clamp(20px,3vw,25px)] mr-[clamp(8px,1.2vw,10px)]"
          />
          {/* 当前对话标题 */}
          <div
            className="text-[clamp(12px,1.5vw,14px)] text-[#666666] font-[500]"
          >
            当前对话: {conversationTitle}
          </div>
        </div>

        {/* 知识库列表标题 */}
        <div
          className="flex items-center mt-[clamp(15px,2vw,20px)] ml-[4%]"
        >
          {/* 知识库图标 */}
          <img
            src="/slibar/slibar-knowledge-base@2x.png"
            alt="知识库"
            className="w-[clamp(16px,2vw,20px)] h-[clamp(16px,2vw,20px)] mr-[clamp(8px,1.2vw,10px)]"
          />
          {/* 知识库列表标题 */}
          <div
            className="text-[clamp(12px,1.5vw,16px)] text-[#333333] font-[500]"
          >
            选择目标知识库
          </div>
        </div>

        {/* 知识库列表 */}
        <div
          className="flex-1 px-[4%] overflow-y-auto overflow-x-hidden mt-[clamp(15px,2vw,20px)]"
        >
          {isLoading ? (
            <div
              className="text-center py-[50px] text-[#666] text-[clamp(12px,1.5vw,16px)]"
            >
              加载中...
            </div>
          ) : folders.length === 0 ? (
            <div
              className="text-center py-[50px] text-[#666] text-[clamp(12px,1.5vw,16px)]"
            >
              暂无可用知识库
            </div>
          ) : (
            <div
              className="flex flex-col gap-[clamp(12px,2vw,20px)] pb-[clamp(15px,2vw,20px)]"
            >
              {folders.map((folder) => (
                <div
                  key={folder.folder_id}
                  className={cn(
                    "flex items-center cursor-pointer py-[6px] relative w-full h-[clamp(28px,4vw,32px)] rounded-[10px]",
                    selectedFolder === folder.folder_id
                      ? "bg-[rgba(13,148,136,0.1)]"
                      : "bg-transparent hover:bg-[rgba(13,148,136,0.1)]"
                  )}
                  onClick={() => handleFolderSelect(folder.folder_id)}
                >
                  {/* 单选框 */}
                  <div
                    className="w-[clamp(12px,1.8vw,14px)] h-[clamp(12px,1.8vw,14px)] bg-[#FFFFFF] rounded-[50%] border border-[#666666] mr-[clamp(8px,1.5vw,12px)] flex-shrink-0 flex items-center justify-center ml-[clamp(10px,1.5vw,13px)]"
                  >
                    {/* 选中状态显示蓝色圆点 */}
                    {selectedFolder === folder.folder_id && (
                      <div
                        className="w-[clamp(6px,1vw,8px)] h-[clamp(6px,1vw,8px)] bg-[#0D9488] rounded-[50%]"
                      />
                    )}
                  </div>

                  {/* 文件夹图标 */}
                  <img
                    src="/slibar/slibar-createbase@2x.png"
                    alt="文件夹"
                    className="w-[clamp(14px,2vw,17px)] h-[clamp(17px,2.5vw,21px)] mr-[clamp(8px,1.5vw,12px)] flex-shrink-0"
                  />

                  {/* 文件夹名称 */}
                  <div
                    className="text-[clamp(12px,1.5vw,14px)] text-[#333333] flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
                  >
                    {folder.folder_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 按钮区域 - 固定在底部 */}
        <div
          className="flex flex-col sm:flex-row gap-3 sm:gap-0 justify-end items-center p-[clamp(15px,2vw,30px)] border-t border-[#E0E1E5]"
        >
          <button
            onClick={() => {
              if (!isAdding) {
                onClose();
              }
            }}
            disabled={isAdding}
            className={cn(
              "w-full sm:w-[clamp(90px,12vw,128px)] h-[clamp(32px,4vw,40px)] bg-[#FFFFFF] rounded-[20px] border border-[#C8C9CC]",
              "text-[clamp(12px,1.5vw,16px)] text-[#666666] transition-all duration-200 ease sm:mr-[clamp(12px,2vw,16px)]",
              isAdding ? "cursor-not-allowed opacity-60" : "hover:bg-[#F8F9FA]"
            )}
          >
            取消
          </button>
          <button
            onClick={handleConfirmAdd}
            disabled={isAdding}
            className={cn(
              "w-full sm:w-[clamp(90px,12vw,128px)] h-[clamp(32px,4vw,40px)] rounded-[20px] border-0 text-[clamp(12px,1.5vw,16px)] text-[#FFFFFF]",
              "transition-all duration-200 ease",
              isAdding
                ? "bg-[#999999] cursor-not-allowed opacity-60"
                : "bg-[#0D9488] hover:bg-[#0F766E]"
            )}
          >
            {isAdding ? "添加中..." : "确认"}
          </button>
        </div>
      </div>
    </>
  );
}
