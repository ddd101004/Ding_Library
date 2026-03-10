/**
 * EBSCO 配置管理服务
 *
 * 统一管理所有 EBSCO 相关配置
 * 使用单例模式避免重复数据库查询
 */

import logger from "@/helper/logger";
import { getConfigValue } from "@/db/ebscoConfig";

/**
 * EBSCO 完整配置类型
 */
export interface EbscoConfig {
  apiBaseUrl: string;
  authType: string;
  userId: string;
  password: string;
  profile: string;
}

/**
 * EBSCO 配置单例类
 * 统一管理所有 EBSCO 配置，避免重复查询和代码重复
 */
export class EbscoConfigSingleton {
  private static instance: EbscoConfig | null = null;
  private static loading: Promise<EbscoConfig> | null = null;

  /**
   * 获取 EBSCO 配置
   * 从数据库读取所有配置，并缓存结果
   */
  public static async getInstance(): Promise<EbscoConfig> {
    // 如果已有缓存，直接返回
    if (EbscoConfigSingleton.instance) {
      return EbscoConfigSingleton.instance;
    }

    // 如果正在加载，等待加载完成
    if (EbscoConfigSingleton.loading) {
      return EbscoConfigSingleton.loading;
    }

    // 开始加载配置
    EbscoConfigSingleton.loading = (async () => {
      logger.info("加载 EBSCO 配置");

      // 并行加载所有配置，提高性能
      const [apiBaseUrl, authType, userId, password, profile] =
        await Promise.all([
          getConfigValue("ebsco.api.base_url", "https://eds-api.ebscohost.com"),
          getConfigValue("ebsco.auth.type", "uid"),
          getConfigValue("ebsco.auth.user_id", ""),
          getConfigValue("ebsco.auth.password", ""),
          getConfigValue("ebsco.auth.profile", "edsapi"),
        ]);

      const config: EbscoConfig = {
        apiBaseUrl,
        authType: authType.toLowerCase(),
        userId,
        password,
        profile,
      };

      EbscoConfigSingleton.instance = config;
      EbscoConfigSingleton.loading = null;

      logger.info("EBSCO 配置加载完成", {
        apiBaseUrl: config.apiBaseUrl,
        authType: config.authType,
        hasUserId: !!config.userId,
        hasPassword: !!config.password,
        profile: config.profile,
      });

      return config;
    })();

    return EbscoConfigSingleton.loading;
  }

  /**
   * 清除配置缓存
   * 当配置更新后调用此方法重新加载配置
   */
  public static clearCache(): void {
    EbscoConfigSingleton.instance = null;
    EbscoConfigSingleton.loading = null;
    logger.info("清除 EBSCO 配置缓存");
  }

  /**
   * 更新配置缓存
   * 用于手动更新配置，避免重新查询数据库
   */
  public static updateCache(config: Partial<EbscoConfig>): void {
    if (EbscoConfigSingleton.instance) {
      EbscoConfigSingleton.instance = {
        ...EbscoConfigSingleton.instance,
        ...config,
      };
      logger.info("更新 EBSCO 配置缓存", config);
    }
  }

  /**
   * 获取当前缓存的配置（不触发加载）
   * 用于调试和监控
   */
  public static getCachedConfig(): EbscoConfig | null {
    return EbscoConfigSingleton.instance;
  }

  /**
   * 检查配置是否已加载
   */
  public static isLoaded(): boolean {
    return EbscoConfigSingleton.instance !== null;
  }
}
