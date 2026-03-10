// use-fileHandler.ts
import { useState, useCallback } from 'react';
import { FileWithContent } from '@/types/file';

export const useFileHandler = () => {
  const [uploadedFiles, setUploadedFiles] = useState<FileWithContent[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 处理个别文件完成 - 当单个文件解析完成时立即更新状态
  const handleFileCompleted = useCallback((fileName: string, fileId: string, uploadedPaperId: string) => {
    setUploadedFiles(prev =>
      prev.map(file => {
        // 根据文件名匹配并更新状态
        if (file.file?.name === fileName) {
          return {
            ...file,
            isUploading: false,
            fileId,
            uploadedPaperId
          };
        }
        return file;
      })
    );
  }, []);

  // 处理文件上传
  const handleFileUpload = useCallback((files: FileWithContent[]) => {
    // 如果没有成功上传的文件，不执行任何操作
    if (files.length === 0) {
      return;
    }

    // 更新已存在文件的状态（移除 isUploading 标记）
    setUploadedFiles(prev => {
      const updatedFiles = prev.map(existingFile => {
        // 查找匹配的上传完成文件（根据文件名匹配）
        const uploadedFile = files.find(f => f.file.name === existingFile.file.name);
        if (uploadedFile) {
          // 用上传完成的文件替换上传中的文件
          return { ...uploadedFile, isUploading: false };
        }
        return existingFile;
      });

      return updatedFiles;
    });

    setIsUploading(false);

    // 注意：不在这里强制关闭弹窗，让调用方决定何时关闭
  }, []);

  // 设置上传状态
  const setUploadingStatus = useCallback((status: boolean) => {
    setIsUploading(status);
  }, []);
 // 清空所有文件
  const clearUploadedFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);
  // 移除文件（带存储键同步）
  const handleRemoveFileWithStorage = useCallback((index: number, storageKeys: string[], onAllFilesRemoved?: () => void) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);

      // 同步更新指定的sessionStorage键
      if (newFiles.length === 0) {
        // 如果删除后没有文件了，清空所有指定的键
        storageKeys.forEach(key => {
          sessionStorage.removeItem(key);
        });
      } else {
        // 更新指定的sessionStorage键
        const fileData = newFiles.map(fileWithContent => ({
          name: fileWithContent.file.name,
          type: fileWithContent.file.type,
          size: fileWithContent.file.size,
          fileId: fileWithContent.fileId || null,
          uploadedPaperId: fileWithContent.uploadedPaperId || null
        }));

        storageKeys.forEach(key => {
          sessionStorage.setItem(key, JSON.stringify(fileData));
        });
      }

      // 如果删除后没有文件了，触发回调
      if (newFiles.length === 0 && onAllFilesRemoved) {
        onAllFilesRemoved();
      }
      return newFiles;
    });
  }, []);

  // 移除文件（兼容性版本，保持原有接口）
  const handleRemoveFile = useCallback((index: number, onAllFilesRemoved?: () => void, additionalStorageKeys?: string[]) => {
    setUploadedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);

      // 同步更新sessionStorage
      if (newFiles.length === 0) {
        // 如果删除后没有文件了，清空所有相关的sessionStorage
        sessionStorage.removeItem("transferredFiles");
        sessionStorage.removeItem("transferredFiles_home");
        sessionStorage.removeItem("transferredFiles_nav");
        sessionStorage.removeItem("transferredFiles_checked");

        // 清理额外的指定键名
        if (additionalStorageKeys) {
          additionalStorageKeys.forEach(key => {
            sessionStorage.removeItem(key);
          });
        }
      } else {
        // 更新所有可能包含这些文件的sessionStorage键
        const fileData = newFiles.map(fileWithContent => ({
          name: fileWithContent.file.name,
          type: fileWithContent.file.type,
          size: fileWithContent.file.size,
          fileId: fileWithContent.fileId || null,
          uploadedPaperId: fileWithContent.uploadedPaperId || null
        }));

        sessionStorage.setItem("transferredFiles_home", JSON.stringify(fileData));
        sessionStorage.setItem("transferredFiles_nav", JSON.stringify(fileData));
        sessionStorage.setItem("transferredFiles_checked", JSON.stringify(fileData));
      }

      // 如果删除后没有文件了，触发回调
      if (newFiles.length === 0 && onAllFilesRemoved) {
        onAllFilesRemoved();
      }
      return newFiles;
    });
  }, []);

  // 格式化文件内容
  const formatFileContent = useCallback((files: FileWithContent[]): string => {
    if (files.length === 0) return "";

    const fileNames = files
      .map(
        (file) => `【文件名称】：${file.file.name}`
      )
      .join("\n");

    return `\n=== 上传的文件 ===\n${fileNames}\n=== 用户问题 ===\n`;
  }, []);

  // 保存文件到sessionStorage
  const saveFilesToSession = useCallback((files: FileWithContent[]) => {
    if (files.length > 0) {
      const fileData = files.map(fileWithContent => ({
        name: fileWithContent.file.name,
        type: fileWithContent.file.type,
        size: fileWithContent.file.size,
        fileId: fileWithContent.fileId || null,
        uploadedPaperId: fileWithContent.uploadedPaperId || null
      }));
      sessionStorage.setItem("transferredFiles", JSON.stringify(fileData));
    } else {
      sessionStorage.removeItem("transferredFiles");
    }
  }, []);

  // 从sessionStorage加载文件
  const loadFilesFromSession = useCallback((): FileWithContent[] => {
    const fileDataStr = sessionStorage.getItem("transferredFiles");
    if (fileDataStr) {
      try {
        const fileData = JSON.parse(fileDataStr);
        return fileData.map((item: any) => ({
          file: {
            name: item.name,
            type: item.type,
            size: item.size || 0,
          },
          fileId: item.fileId || null,
          uploadedPaperId: item.uploadedPaperId || null
        }));
      } catch (error) {
        console.error("Failed to load files from storage", error);
        sessionStorage.removeItem("transferredFiles");
      }
    }
    return [];
  }, []);

  return {
    uploadedFiles,
    setUploadedFiles,
    showUploadModal,
    setShowUploadModal,
    isUploading,
    setUploadingStatus,
    handleFileUpload,
    handleFileCompleted,
    handleRemoveFile,
    handleRemoveFileWithStorage,
    formatFileContent,
    clearUploadedFiles,
    saveFilesToSession,
    loadFilesFromSession
  };
};