
/**
 * 通用工具函数
 *
 * 【前端】全项目共用
 *
 * 导出：
 * - cn(...inputs) — Tailwind CSS类名合并（基于clsx+tailwind-merge）
 *
 * 引用方：
 * - components/* — 样式合并
 */
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}