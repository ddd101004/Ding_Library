import { useState, useCallback } from 'react';
import { apiPost } from '@/api/request';
import { CacheManager } from '@/utils/cacheUtils';

interface PreloadConfig {
  cacheKey: string;
  cacheTime?: number;
  defaultData: string[];
}

export const usePreload = () => {
  const [isLoading, setIsLoading] = useState(false);

  // 预加载数据
  const preloadData = useCallback(async (
    endpoint: string,
    params: any,
    config: PreloadConfig
  ): Promise<string[]> => {
    const { cacheKey, cacheTime = 3600000, defaultData } = config;

    // 尝试从缓存获取
    const cachedData = CacheManager.get<string[]>(cacheKey, cacheTime);
    if (cachedData) {
      return cachedData;
    }

    // 没有缓存或缓存过期，调用API
    setIsLoading(true);
    try {
      const response = await apiPost(endpoint, params);
      
      if (response.code === 200) {
        const data = response.data?.questions || response.data?.keywords || defaultData;
        CacheManager.set(cacheKey, data);
        return data;
      } else {
        throw new Error(response.message || '预加载失败');
      }
    } catch (error) {
      console.error('预加载失败:', error);
      CacheManager.set(cacheKey, defaultData);
      return defaultData;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 批量预加载
  const preloadMultiple = useCallback(async (
    preloadConfigs: Array<{
      endpoint: string;
      params: any;
      config: PreloadConfig;
    }>
  ): Promise<Record<string, string[]>> => {
    const results: Record<string, string[]> = {};

    // 并行执行所有预加载请求
    const promises = preloadConfigs.map(async ({ endpoint, params, config }) => {
      const data = await preloadData(endpoint, params, config);
      results[config.cacheKey] = data;
    });

    await Promise.all(promises);
    return results;
  }, [preloadData]);

  return {
    preloadData,
    preloadMultiple,
    isLoading
  };
};