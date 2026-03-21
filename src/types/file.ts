export interface FileWithContent {
  file: { name: string; type: string; size: number };
  fileId?: string; // 文件上传后返回的文件ID
  isUploading?: boolean; // 文件是否正在上传或解析中
}