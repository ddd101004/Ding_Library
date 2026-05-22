/**
 * localStorage缓存管理器 — 基于localStorage的TTL缓存工具
 *
 * 【前端】仅在浏览器环境使用（依赖localStorage）
 *
 * 导出：
 * - CacheManager 类（静态方法）
 *   - get(key, maxAge) — 读取缓存，maxAge默认1小时，过期自动清除
 *   - set(key, data) — 写入缓存（附带timestamp）
 *   - remove(key) — 删除指定缓存
 *
 * 引用方：
 * - hooks/use-preload.ts — 预加载Hook，缓存AI问题和关键词数据
 */
// 缓存管理工具
export interface CacheData<T> {
  data: T;
  timestamp: number;
}

export class CacheManager {
  static get<T>(key: string, maxAge: number = 3600000): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const { data, timestamp }: CacheData<T> = JSON.parse(cached);
      
      if (Date.now() - timestamp > maxAge) {
        localStorage.removeItem(key);
        return null;
      }

      return data;
    } catch (error) {
      console.error(`Failed to get cache for ${key}:`, error);
      return null;
    }
  }

  static set<T>(key: string, data: T): void {
    try {
      const cacheData: CacheData<T> = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error(`Failed to set cache for ${key}:`, error);
    }
  }

  static remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove cache for ${key}:`, error);
    }
  }
}