import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiPost } from '@/api/request';

interface CoverUploadSignatureResponse {
  cos_key: string;
  signed_url: string;
  expires_at: string;
  method: string;
  headers: {
    "Content-Type": string;
  };
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

  // 处理封面上传
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
      // 1. 获取封面图上传签名（POST方法）
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

      const response = await apiPost<CoverUploadSignatureResponse>(
        "/api/folders/cover-upload-signature",
        {
          file_name: file.name,
          file_size: file.size,
          file_type: fileExtension,
        }
      );

      if (!response.data) {
        throw new Error('获取上传签名失败，响应数据为空');
      }

      const { cos_key, signed_url, method, headers } = response.data;

      // 2. 上传文件到 COS
      await fetch(signed_url, {
        method: method,
        headers: headers,
        body: file,
      });

      // 3. 创建本地预览
      const reader = new FileReader();
      reader.onload = (e) => {
        setCoverImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // 4. 保存 cos_key
      setCosKey(cos_key);

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