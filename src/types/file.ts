/**
 * 文件相关类型定义
 *
 * 【前端】文件上传组件使用
 *
 * 导出：
 * - FileWithContent — 带内容的文件信息（文件元数据+上传状态+解析内容）
 */
export interface FileWithContent {
  file: { name: string; type: string; size: number };
  fileId?: string; // 文件上传后返回的文件ID
  isUploading?: boolean; // 文件是否正在上传或解析中
}