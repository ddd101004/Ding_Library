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