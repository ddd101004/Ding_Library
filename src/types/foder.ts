
/**
 * 文件夹(知识库)类型定义
 *
 * 【前端】知识库模块使用
 *
 * 导出：
 * - Folder — 文件夹信息（id/名称/描述/封面/创建时间/内容数等）
 *
 * 注意：文件名为 foder.ts（拼写错误，应为 folder），保持原名以避免引用断裂
 */

export interface Folder {
  folder_id: string;
  folder_name: string;
  description?: string;
  color?: string;
  cover_image?: string | null;
  cover_image_url?: string | null;
  sort_order?: number;
  item_count: number;
  fastgpt_dataset_id?: string | null;
  create_time?: string;
  update_time?: string;
}