import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { MAX_FILE_SIZE } from '@/constants';
import { uploadFileWithNewFlow } from '@/api/upload';

interface FileWithId {
  file: { name: string; type: string; size: number };
  fileId?: string; // 文件上传后返回的文件ID，用于attachment_ids
  isUploading?: boolean; // 文件是否正在上传或解析中
}

interface FileUploadModalProps {
  show: boolean;
  onClose: () => void;
  onFileUpload: (files: FileWithId[]) => void;
  preventAutoClose?: boolean; // 是否阻止自动关闭弹窗
  totalFileCount?: number; // 会话中已有的文件总数
  onUploadStart?: () => void; // 上传开始回调
  onUploadEnd?: () => void; // 上传结束回调
  onFilesAdding?: (files: FileWithId[]) => void; // 文件添加回调（在上传开始前立即调用，用于显示上传中的文件）
  onFileCompleted?: (fileName: string, fileId: string, uploadedPaperId: string) => void; // 文件完成回调
}

export default function FileUploadModal({ show, onClose, onFileUpload, preventAutoClose = false, totalFileCount = 0, onUploadStart, onUploadEnd, onFilesAdding, onFileCompleted }: FileUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // 检查文件类型是否支持
  const isSupportedFileType = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['pdf', 'doc', 'docx', 'txt'].includes(ext || '');
  };

  // 检查文件大小是否超过限制
  const isFileSizeValid = (file: File): boolean => {
    return file.size <= MAX_FILE_SIZE;
  };

  // 格式化文件大小显示
  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // 检查是否为不支持的文件类型
  const isUnsupportedFileType = (fileName: string): boolean => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['xlsx', 'xls', 'md'].includes(ext || '');
  };

  // 处理文件（使用新的三步上传流程）
  const processFiles = async (files: File[]): Promise<{
    filesWithId: FileWithId[];
    hasErrors: boolean;
  }> => {
    const filesWithId: FileWithId[] = [];
    let hasErrors = false;

    try {
      // 检查是否有不支持的文件类型
      const unsupportedFiles = files.filter(file => isUnsupportedFileType(file.name));
      if (unsupportedFiles.length > 0) {
        const unsupportedNames = unsupportedFiles.map(f => f.name).join(', ');
        toast.error(`以下文件暂不支持：${unsupportedNames}\n请上传 TXT、Word 或 PDF 格式的文件。`);
        return { filesWithId: [], hasErrors: true };
      }

      const validFiles = files.filter(file => isSupportedFileType(file.name));

      if (validFiles.length === 0) {
        toast.error('没有找到支持的文件类型。请上传 PDF、Word、TXT 格式的文件。');
        return { filesWithId: [], hasErrors: true };
      }

      // 检查会话文件数量限制
      const remainingSlots = 5 - totalFileCount;
      if (remainingSlots <= 0) {
        toast.error('每个会话文件总数不得超过五个，请删除已有文件后再上传');
        return { filesWithId: [], hasErrors: true };
      }

      // 如果要上传的文件数量超过剩余槽位，进行截断
      const filesToProcess = validFiles.length > remainingSlots ? validFiles.slice(0, remainingSlots) : validFiles;
      if (filesToProcess.length < validFiles.length) {
        toast.warning(`由于文件数量限制，只会上传前${filesToProcess.length}个文件`);
      }

      // 检查文件大小
      const oversizedFiles = filesToProcess.filter(file => !isFileSizeValid(file));
      if (oversizedFiles.length > 0) {
        const oversizedNames = oversizedFiles.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ');
        toast.error(`以下文件超过50MB限制：${oversizedNames}\n请选择小于50MB的文件上传。`);
        return { filesWithId: [], hasErrors: true };
      }

      // 逐个处理文件
      for (const file of filesToProcess) {
        try {


          // 使用新的三步上传流程
          const result = await uploadFileWithNewFlow(
            file,
            (progress) => {
              // 进度回调
            },
            // 文件完成回调 - 当单个文件解析完成时立即调用
            (fileName, completedResult) => {
              onFileCompleted?.(fileName, completedResult.id, completedResult.id);
            }
          );


          // 将结果添加到文件列表
          filesWithId.push({
            file: {
              name: file.name,
              type: file.type,
              size: file.size
            },
            fileId: result.id // 保存文件ID
          });

        } catch (err) {
          console.error(`文件 ${file.name} 处理失败:`, err);

          const errorMessage = err instanceof Error ? err.message : '未知错误';

          // 显示错误提示
          toast.error(`文件 "${file.name}" 处理失败: ${errorMessage}`);

          hasErrors = true;
        }
      }

      return { filesWithId, hasErrors };

    } catch (error) {
      // 外层捕获任何未预期的错误
      console.error('文件处理过程中发生未预期错误:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      toast.error(`文件处理失败: ${errorMessage}`);
      return { filesWithId: [], hasErrors: true };
    }
  };

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileList = Array.from(files);


      // 清空 input 的值，允许重复选择同一个文件
      e.target.value = '';

      // 过滤空文件，记录空文件数量
      const emptyFiles = fileList.filter(file => file.size === 0);
      const validFilesToUpload = fileList.filter(file => file.size > 0);

      // 如果所有文件都是空文件，保持弹窗打开
      if (validFilesToUpload.length === 0 && emptyFiles.length > 0) {
        const emptyFileNames = emptyFiles.map(f => f.name).join(', ');
        toast.error(`以下文件内容为空，无法上传：${emptyFileNames}\n请选择有内容的文件。`);
        return; // 不关闭弹窗
      }

      // 如果有部分空文件，记录并继续处理有效文件
      let skippedEmptyFiles = false;
      if (emptyFiles.length > 0 && validFilesToUpload.length > 0) {
        skippedEmptyFiles = true;
      }

      // 检查会话文件数量限制（在显示文件卡片之前就检查）
      const remainingSlots = 5 - totalFileCount;
      if (remainingSlots <= 0) {
        toast.error('每个会话文件总数不得超过五个，请删除已有文件后再上传');
        return;
      }

      // 如果要上传的文件数量超过剩余槽位，进行截断
      const filesToDisplay = validFilesToUpload.length > remainingSlots
        ? validFilesToUpload.slice(0, remainingSlots)
        : validFilesToUpload;

      if (filesToDisplay.length < validFilesToUpload.length) {
        toast.warning(`由于文件数量限制，只会上传前${filesToDisplay.length}个文件`);
      }

      // 预先创建上传中的文件对象（只包含会被上传的文件）
      const uploadingFiles: FileWithId[] = filesToDisplay.map(file => ({
        file: {
          name: file.name,
          type: file.type,
          size: file.size
        },
        fileId: undefined, // 上传中还没有 ID
        isUploading: true // 标记为上传中
      }));

      // 立即通知父组件添加这些文件（显示加载状态）
      onFilesAdding?.(uploadingFiles);

      // 立即通知父组件：上传开始（在关闭弹窗之前）
      // 父组件会使用 flushSync 同步更新状态
      onUploadStart?.();

      // 立即关闭弹窗，不等待上传完成
      onClose();

      // 立即提示空文件已跳过
      if (skippedEmptyFiles) {
        const skippedCount = emptyFiles.length;
        toast.warning(`${skippedCount} 个空文件已跳过`);
      }

      // 在后台继续处理文件上传（只处理会被上传的文件）
      processFiles(filesToDisplay)
        .then(({ filesWithId, hasErrors }) => {


          // 根据不同情况处理用户提示
          if (filesWithId.length > 0) {
            // 有成功上传的文件
            toast.success(`成功上传 ${filesWithId.length} 个文件`);
            // 调用回调通知父组件（更新文件状态为已完成）
            onFileUpload(filesWithId);
          } else {
            // 没有成功上传的文件
            if (hasErrors) {
              // 只有错误，显示提示

            } else {
              // 其他情况

            }
          }
        })
        .catch((error) => {
          // 这里应该不会执行，因为 processFiles 内部已经处理了所有错误
          console.error('文件处理外层错误:', error);
          toast.error('文件处理失败，请重试');
        })
        .finally(() => {
          // 通知父组件：上传结束（只有等到 parse_status 为 completed 才会调用）
          onUploadEnd?.();
        });
    }
  };

  // 处理拖放
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);


    // 过滤空文件，记录空文件数量
    const emptyFiles = files.filter(file => file.size === 0);
    const validFilesToUpload = files.filter(file => file.size > 0);

    // 如果所有文件都是空文件，保持弹窗打开
    if (validFilesToUpload.length === 0 && emptyFiles.length > 0) {
      setIsDragging(false);
      const emptyFileNames = emptyFiles.map(f => f.name).join(', ');
      toast.error(`以下文件内容为空，无法上传：${emptyFileNames}\n请选择有内容的文件。`);
      return; // 不关闭弹窗
    }

    // 如果有部分空文件，记录并继续处理有效文件
    let skippedEmptyFiles = false;
    if (emptyFiles.length > 0 && validFilesToUpload.length > 0) {
      skippedEmptyFiles = true;
    }

    // 检查会话文件数量限制（在显示文件卡片之前就检查）
    const remainingSlots = 5 - totalFileCount;
    if (remainingSlots <= 0) {
      setIsDragging(false);
      toast.error('每个会话文件总数不得超过五个，请删除已有文件后再上传');
      return;
    }

    // 如果要上传的文件数量超过剩余槽位，进行截断
    const filesToDisplay = validFilesToUpload.length > remainingSlots
      ? validFilesToUpload.slice(0, remainingSlots)
      : validFilesToUpload;

    if (filesToDisplay.length < validFilesToUpload.length) {
      toast.warning(`由于文件数量限制，只会上传前${filesToDisplay.length}个文件`);
    }

    // 预先创建上传中的文件对象（只包含会被上传的文件）
    const uploadingFiles: FileWithId[] = filesToDisplay.map(file => ({
      file: {
        name: file.name,
        type: file.type,
        size: file.size
      },
      fileId: undefined, // 上传中还没有 ID
      isUploading: true // 标记为上传中
    }));

    // 立即通知父组件添加这些文件（显示加载状态）
    onFilesAdding?.(uploadingFiles);

    // 立即通知父组件：上传开始（在关闭弹窗之前）
    onUploadStart?.();

    // 立即关闭弹窗，不等待上传完成
    onClose();

    // 立即提示空文件已跳过
    if (skippedEmptyFiles) {
      const skippedCount = emptyFiles.length;
      toast.warning(`${skippedCount} 个空文件已跳过`);
    }

    // 在后台继续处理文件上传（只处理会被上传的文件）
    setIsDragging(false);

    processFiles(filesToDisplay)
      .then(({ filesWithId, hasErrors }) => {


        // 根据不同情况处理用户提示
        if (filesWithId.length > 0) {
          // 有成功上传的文件
          toast.success(`成功上传 ${filesWithId.length} 个文件`);
          // 调用回调通知父组件（更新文件状态为已完成）
          onFileUpload(filesWithId);
        } else {
          // 没有成功上传的文件
          if (hasErrors) {
            // 只有错误，显示提示

          } else {
            // 其他情况

          }
        }
      })
      .catch((error) => {
        // 这里应该不会执行，因为 processFiles 内部已经处理了所有错误
        console.error('文件处理外层错误:', error);
        toast.error('文件处理失败，请重试');
      })
      .finally(() => {
        setIsDragging(false);
        // 通知父组件：上传结束（只有等到 parse_status 为 completed 才会调用）
        onUploadEnd?.();
      });
  };

  // 点击外部关闭
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
      setIsDragging(false);
    }
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[9999]"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`w-[600px] h-[260px] bg-white rounded-[20px] p-6 border shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] relative z-[10000] ${
          isDragging ? 'border-blue-500 border-2' : 'border-[#E9ECF2]'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="hidden"
          id="file-upload"
          multiple
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.txt"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer w-full h-full flex flex-col items-center justify-center"
        >
          <img
            src="/settings/settings-dragfiles@2x.png"
            alt="上传文件"
            className="w-[50px] h-[50px] mb-4"
          />
          <p className="text-[#333333] text-lg mb-2 font-medium leading-10">
            将文件拖放到此处
          </p>
          <p className="text-[#666666] text-base leading-10">
            将文件拖放到此处以添加到对话中或者点击上传
          </p>
          <p className="text-gray-400 text-xs mt-4">
            支持50mb以内的 PDF、Word、TXT 格式的文件
          </p>
        </label>
      </div>
    </div>
  );
}