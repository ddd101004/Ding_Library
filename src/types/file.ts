export interface FileWithContent {
  file: { name: string; type: string; size: number };
  uploadedPaperId?: string; // AI伴读系统返回的真实论文ID
  fileId?: string; // 文件上传后返回的文件ID，用于attachment_ids
  isUploading?: boolean; // 文件是否正在上传或解析中
}