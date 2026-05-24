/**
 * 响应类型定义
 *
 * 【前后端共用】
 *
 * 导出：
 * - ResponseDataType<T> — 通用API响应类型（code + data + message）
 */
export type ResponseDataType<T> = {
  code: number;
  data: T;
  message: string;
};
