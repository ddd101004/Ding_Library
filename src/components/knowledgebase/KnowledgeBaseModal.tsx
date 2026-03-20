import React, { useState, useEffect } from "react";
import { apiPost, apiRequest } from "@/api/request";
import { toast } from "sonner";
import { useCoverUpload } from "@/hooks/use-cover-upload";
import { Folder } from "@/types/foder";
import { cn } from "@/lib/utils";

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  mode: "create" | "edit";
  folder?: Folder | null;
  onClose: () => void;
  onSuccess: () => void;
}

const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  mode,
  folder,
  onClose,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState("");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const { isUploading, coverImage, cosKey, handleCoverUpload, setCoverImageUrl, resetCover } =
    useCoverUpload();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isEditMode = mode === "edit";
  const modalTitle = isEditMode ? "编辑知识库" : "新建知识库";
  const submitButtonText = isLoading ? (isEditMode ? "保存中..." : "创建中...") : (isEditMode ? "保存" : "创建");

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && folder) {
        setFolderName(folder.folder_name || "");
        setDescription(folder.description || "");

     if (folder.cover_image_url || folder.cover_image) {
    let coverUrl: string;

    // 如果 cover_image 是本地路径，优先使用本地路径
    if (folder.cover_image?.startsWith('covers/') || folder.cover_image?.startsWith('avatars/')) {
      coverUrl = `/api/uploads/${folder.cover_image}`;
      console.log('使用本地路径:', coverUrl);
    } else if (folder.cover_image_url) {
      coverUrl = folder.cover_image_url;
      console.log('使用 cover_image_url:', coverUrl);
    } else {
      coverUrl = `https://library-cos.centum-cloud.com/${folder.cover_image}`;
      console.log('使用 COS 路径:', coverUrl);
    }

    setCoverImageUrl(coverUrl);
    setImageLoaded(false);
  } else {
          resetCover();
        }
      } else {
        setFolderName("");
        setDescription("");
        resetCover();
        setImageLoaded(true);
      }
    }
  }, [isOpen, isEditMode, folder, setCoverImageUrl, resetCover]);

  const handleSubmit = async () => {
    const trimmedName = folderName.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      toast.error("请输入知识库名称");
      return;
    }
    if (trimmedName.length > 10) {
      toast.error("知识库名称不能超过10个字符");
      return;
    }

    if (isEditMode && !folder) {
      toast.error("编辑模式下缺少文件夹信息");
      return;
    }

    try {
      setIsLoading(true);

      const requestData: Record<string, string> = {
        folder_name: trimmedName,
        description: trimmedDescription,
      };

      if (isEditMode) {
        requestData.color = "#6FCF97";
      }

      if (cosKey) {
        requestData.cover_image = cosKey;
      }

      if (isEditMode) {
        await apiRequest(`/api/folders/${folder!.folder_id}`, {
          method: "PATCH",
          data: requestData,
        });
        toast.success("知识库更新成功");
      } else {
        requestData.color = "#7934F6";
        await apiPost("/api/folders", requestData);
        toast.success("知识库创建成功");
      }

      setFolderName("");
      setDescription("");
      resetCover();
      onSuccess();
      onClose();
    } catch (error: any) {
      let errorMessage = isEditMode ? "更新失败，请稍后再试" : "创建失败，请稍后再试";
      if (error.response) {
        errorMessage = error.response.data?.message || `服务器错误 (${error.response.status})`;
      } else if (error.request) {
        errorMessage = "网络连接失败，请检查网络后重试";
      } else {
        errorMessage = error.message || "未知错误";
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || (isEditMode && !folder)) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-[864px] bg-white shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)]bg-white shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] rounded-[20px] border border-[#E9ECF2] relative">
        <button
          onClick={onClose}
          className="absolute top-[31px] right-[31px] w-[18px] h-[18px] flex items-center justify-center text-[18px] text-gray-500 hover:text-gray-700"
        >
          ×
        </button>

        <h3
          className="text-[30px] font-[500] text-gray-900 pt-[25px] pl-[30px]"
        >
          {modalTitle}
        </h3>

        <div
          className="bg-[#E0E1E5] w-[calc(100%-60px)] h-[1px] ml-[30px] mt-[26px] mb-[30px]"
        ></div>

        <div
          className="flex items-start mb-[39px] pl-[30px]"
        >
          <span className="text-[16px] font-[500] text-gray-900 mr-[19px]">
            封面
          </span>
          <div
            className="relative w-[350px] h-[165px] rounded-[4px] overflow-hidden cursor-pointer group bg-gray-100"
            onClick={() => fileInputRef.current?.click()}
          >
            <img
              src={coverImage || "/slibar/slibar-directory@2x.png"}
              alt="封面"
              className={cn(
                "w-full h-full object-cover transition-opacity duration-200",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-[#0D9488] rounded-full animate-spin"></div>
              </div>
            )}
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-white text-center">
                <svg
                  className="w-8 h-8 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <p className="text-sm">点击上传封面</p>
              </div>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm">上传中...</p>
                </div>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/jpg,image/png"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleCoverUpload(file);
              }
            }}
          />
        </div>

        <p
          className="text-[14px] text-[#999999] mb-[30px] pl-[76px] pr-[30px]"
        >
          支持jpg、jpeg、png等格式，建议上传 284*112 尺寸的图片，大小不超过 2MB
        </p>

        <div className="pl-[30px] pr-[30px]">
          <div className="mb-[20px]">
            <div className="w-full h-[36px] bg-white rounded-[4px] border border-[#E1E2E6] flex items-center">
              <div className="flex items-center ml-[21px]">
                <div
                  className="w-[7px] h-[6px] bg-[#FF4B4B] rounded-[50%] mr-[5px]"
                ></div>
                <span
                  className="text-[16px] mr-[20px] text-[#999999]"
                >
                  知识库名称
                </span>
              </div>
              <div
                className="w-[1px] h-[20px] bg-[#E2E3E7]"
              ></div>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="flex-1 px-[15px] border-0 focus:outline-none text-[16px] bg-transparent ml-[15px]"
                placeholder="请输入知识库名称"
              />
            </div>
          </div>

          <div className="mb-[30px]">
            <div className="w-full h-[80px] bg-white rounded-[4px] border border-[#E1E2E6] flex items-start">
              <div className="flex items-center ml-[21px] mt-3">
                <span
                  className="text-[16px] mr-[20px] text-[#999999]"
                >
                  知识库介绍
                </span>
              </div>
              <div
                className="w-[1px] h-[20px] mt-3 bg-[#E2E3E7]"
              ></div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 px-[15px] py-2 border-0 focus:outline-none text-[16px] bg-transparent resize-none ml-[15px] mt-[4px]"
                placeholder="请输入知识库介绍"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div
          className="flex justify-end pb-[30px] pl-[30px] pr-[30px]"
        >
          <div className="flex space-x-3 w-full justify-end">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="w-[128px] h-[40px] bg-white rounded-[20px] border border-[#C8C9CC] text-[16px] text-[#666666] hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-[128px] h-[40px] bg-[#0D9488] text-white rounded-[20px] text-[16px] hover:bg-[#0F766E] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeBaseModal;
