import React from "react";
import { Folder } from "../../types/foder";
interface DeleteModalProps {
  isOpen: boolean;
  folder: Folder | null;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  folder,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !folder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-[400px] bg-white rounded-[20px] shadow-lg p-8">
        {/* 警告图标 */}
        <div className="flex justify-center mb-6">
          <img
            src="/chat-page/chat-page-lose@2x.png"
            alt="警告"
            width={60}
            height={60}
            className="w-[60px] h-[60px]"
          />
        </div>

        {/* 确认信息 */}
        <div className="text-center mb-8">
          <h3 className="text-[24px] font-semibold text-gray-900 mb-3">
            确认删除
          </h3>
          <p className="text-[16px] text-gray-600">
            确定要删除知识库 "
            <span className="font-medium text-red-600">
              {folder.folder_name}
            </span>
            " 吗？
          </p>
          <p className="text-[14px] text-gray-500 mt-2">
            此操作不可恢复，文件夹内的所有内容将被永久删除。
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-center space-x-4">
          <button
            onClick={onClose}
            className="w-[140px] h-[48px] bg-white rounded-[24px] border border-gray-300 text-[16px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="w-[140px] h-[48px] bg-gradient-to-r from-red-500 to-red-600 rounded-[24px] text-[16px] text-white hover:opacity-90 transition-opacity"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;