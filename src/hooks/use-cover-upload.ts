 import { useState, useCallback } from 'react';
  import { toast } from 'sonner';
  import { apiPost } from '@/api/request';

  interface CoverUploadResponse {
    file_path: string;
    file_url: string;
    file_name: string;
    file_size: number;
  }

  export const useCoverUpload = () => {
    const [isUploading, setIsUploading] = useState(false);
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [cosKey, setCosKey] = useState<string | null>(null);

    // 检查文件类型是否支持
    const isSupportedFileType = (fileName: string): boolean => {
      const ext = fileName.split('.').pop()?.toLowerCase();
      return ['jpg', 'jpeg', 'png'].includes(ext || '');
    };

    // 检查文件大小是否超过限制
    const isFileSizeValid = (file: File): boolean => {
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
      return file.size <= MAX_FILE_SIZE;
    };

    // 处理封面上传（本地存储版本）
    const handleCoverUpload = async (file: File): Promise<void> => {
      // 验证文件
      if (!isSupportedFileType(file.name)) {
        toast.error('不支持的文件格式，请上传 jpg、jpeg 或 png 格式的图片');
        return;
      }

      if (!isFileSizeValid(file)) {
        toast.error('文件大小超过限制，请选择小于 2MB 的图片');
        return;
      }

      setIsUploading(true);

      try {
        // 准备 FormData
        const formData = new FormData();
        formData.append('file', file);

        // 直接上传到本地服务器
        const response = await apiPost<CoverUploadResponse>(
          '/api/upload/cover',
          formData
        );

        if (!response.data) {
          throw new Error('上传失败，响应数据为空');
        }

        const { file_path, file_url } = response.data;

        // 创建本地预览
        const reader = new FileReader();
        reader.onload = (e) => {
          setCoverImage(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        // 保存文件路径（兼容旧字段名 cosKey）
        setCosKey(file_path);

        toast.success('封面上传成功');

      } catch (error: any) {
        console.error('封面上传失败:', error);
        const errorMessage = error instanceof Error ? error.message : '上传失败';
        toast.error(`封面上传失败: ${errorMessage}`);
      } finally {
        setIsUploading(false);
      }
    };

    // 设置封面图片（用于编辑时显示现有封面）
    const setCoverImageUrl = useCallback((url: string) => {
      setCoverImage(url);
      setCosKey(null); // 设置现有图片时，不需要 cosKey
    }, []);

    // 重置封面
    const resetCover = useCallback(() => {
      setCoverImage(null);
      setCosKey(null);
    }, []);

    return {
      isUploading,
      coverImage,
      cosKey,
      handleCoverUpload,
      setCoverImageUrl,
      resetCover
    };
  };