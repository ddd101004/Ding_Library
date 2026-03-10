/**
 * EBSCO认证服务
 *
 * 处理EBSCO API的认证逻辑，包括IP认证和UID认证
 * 实现Token缓存和自动刷新机制
 */

import logger from "@/helper/logger";
import axios from "axios";
import { EbscoConfigSingleton } from "./config";
import { getConfigValue, setConfigValue } from "@/db/ebscoConfig";
import type { AuthRequest, AuthResponse, TokenCache } from "./types";

// Token 内存缓存（一级缓存 - 快速访问）
const tokenCache: Map<string, TokenCache> = new Map();

// 认证请求锁（防止并发认证）
const authLocks: Map<string, Promise<string>> = new Map();

// Token提前刷新时间（秒），默认提前5分钟刷新
const TOKEN_REFRESH_BUFFER = 300;

/**
 * 从数据库加载 Token 缓存
 */
async function loadTokenFromDB(cacheKey: string): Promise<TokenCache | null> {
  try {
    const dbKey = `ebsco.cache.${cacheKey}`;
    const data = await getConfigValue<TokenCache>(dbKey);

    if (data && data.token && data.expiresAt) {
      // 检查是否过期
      if (data.expiresAt > Date.now()) {
        logger.info("从数据库加载Token缓存", {
          cacheKey,
          expiresIn: Math.floor((data.expiresAt - Date.now()) / 1000),
        });
        return data;
      }
    }

    return null;
  } catch (error) {
    logger.error("从数据库加载Token失败", { cacheKey, error });
    return null;
  }
}

/**
 * 保存 Token 到数据库
 */
async function saveTokenToDB(cacheKey: string, token: string, expiresAt: number): Promise<void> {
  try {
    const dbKey = `ebsco.cache.${cacheKey}`;
    const data: TokenCache = { token, expiresAt };

    await setConfigValue(dbKey, data, "json", "EBSCO Token缓存", "cache");

    logger.info("保存Token到数据库", {
      cacheKey,
      expiresIn: Math.floor((expiresAt - Date.now()) / 1000),
    });
  } catch (error) {
    logger.error("保存Token到数据库失败", { cacheKey, error });
  }
}

/**
 * IP认证
 * 使用IP地址进行认证，不需要用户凭据
 */
export async function authenticateByIP(): Promise<string> {
  try {
    // 获取配置
    const config = await EbscoConfigSingleton.getInstance();
    const endpoint = `${config.apiBaseUrl}/authservice/rest/ipauth`;

    logger.info("开始EBSCO IP认证", { endpoint });

    const response = await axios.post(
      endpoint,
      {},
      {
        headers: {
          "Content-Type": "application/json",
        },
        validateStatus: () => true,
      }
    );

    if (!(response.status >= 200 && response.status < 300)) {
      const errorText = await response.data;
      logger.error("EBSCO IP认证失败", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`IP认证失败: ${response.status} ${response.statusText}`);
    }

    const data: AuthResponse = response.data;

    if (!data.AuthToken) {
      logger.error("EBSCO IP认证响应缺少AuthToken", { data });
      throw new Error("认证响应缺少AuthToken");
    }

    // 缓存Token（内存 + 数据库）
    const cacheKey = "ip-auth";
    const expiresAt =
      Date.now() + (data.AuthTimeout - TOKEN_REFRESH_BUFFER) * 1000;

    // 写入内存缓存
    tokenCache.set(cacheKey, {
      token: data.AuthToken,
      expiresAt,
    });

    // 写入数据库缓存
    await saveTokenToDB(cacheKey, data.AuthToken, expiresAt);

    logger.info("EBSCO IP认证成功", {
      tokenPreview: data.AuthToken.substring(0, 8) + "...",
      timeout: data.AuthTimeout,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return data.AuthToken;
  } catch (error: any) {
    logger.error("EBSCO IP认证异常", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * UID认证
 * 使用用户ID和密码进行认证
 */
export async function authenticateByUID(
  userId?: string,
  password?: string
): Promise<string> {
  try {
    // 获取配置
    const config = await EbscoConfigSingleton.getInstance();
    const endpoint = `${config.apiBaseUrl}/authservice/rest/uidauth`;
    const authUserId = userId || config.userId;
    const authPassword = password || config.password;

    if (!authUserId || !authPassword) {
      throw new Error("缺少EBSCO用户ID或密码配置");
    }

    const requestBody: AuthRequest = {
      UserId: authUserId,
      Password: authPassword,
    };

    logger.info("开始EBSCO UID认证", { endpoint, userId: authUserId });

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    if (!(response.status >= 200 && response.status < 300)) {
      const errorText = await response.data;
      logger.error("EBSCO UID认证失败", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(`UID认证失败: ${response.status} ${response.statusText}`);
    }

    const data: AuthResponse = response.data;

    if (!data.AuthToken) {
      logger.error("EBSCO UID认证响应缺少AuthToken", { data });
      throw new Error("认证响应缺少AuthToken");
    }

    // 缓存Token（内存 + 数据库）
    const cacheKey = `uid-auth-${authUserId}`;
    const expiresAt =
      Date.now() + (data.AuthTimeout - TOKEN_REFRESH_BUFFER) * 1000;

    // 写入内存缓存
    tokenCache.set(cacheKey, {
      token: data.AuthToken,
      expiresAt,
    });

    // 写入数据库缓存
    await saveTokenToDB(cacheKey, data.AuthToken, expiresAt);

    logger.info("EBSCO UID认证成功", {
      userId: authUserId,
      tokenPreview: data.AuthToken.substring(0, 8) + "...",
      timeout: data.AuthTimeout,
      expiresAt: new Date(expiresAt).toISOString(),
    });

    return data.AuthToken;
  } catch (error: any) {
    logger.error("EBSCO UID认证异常", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 获取认证Token
 * 自动根据配置选择IP或UID认证
 * 如果缓存中有有效Token则直接返回，否则重新认证
 *
 * 使用互斥锁机制防止并发请求导致的重复认证
 */
export async function getAuthToken(userId?: string): Promise<string> {
  try {
    // 获取配置
    const config = await EbscoConfigSingleton.getInstance();
    const authType = config.authType;
    const cacheKey =
      authType === "ip" ? "ip-auth" : `uid-auth-${userId || config.userId}`;

    // 检查内存缓存（一级缓存）
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      logger.info("使用内存缓存的AuthToken", {
        cacheKey,
        authType,
        expiresIn: Math.floor((cached.expiresAt - Date.now()) / 1000),
      });
      return cached.token;
    }

    // 内存缓存过期或不存在，尝试从数据库加载（二级缓存）
    const dbCached = await loadTokenFromDB(cacheKey);
    if (dbCached) {
      // 恢复到内存缓存
      tokenCache.set(cacheKey, dbCached);
      logger.info("从数据库恢复AuthToken到内存缓存", { cacheKey, authType });
      return dbCached.token;
    }

    // 检查是否有正在进行的认证请求
    const existingAuthPromise = authLocks.get(cacheKey);
    if (existingAuthPromise) {
      logger.info("等待正在进行的认证请求", { cacheKey, authType });
      return await existingAuthPromise;
    }

    // 缓存过期或不存在，重新认证（加锁）
    logger.info("AuthToken缓存过期或不存在，重新认证", { authType, cacheKey });

    // 创建认证 Promise 并加锁
    const authPromise = (async () => {
      try {
        let token: string;
        if (authType === "ip") {
          token = await authenticateByIP();
        } else if (authType === "uid") {
          token = await authenticateByUID(userId);
        } else {
          throw new Error(`不支持的认证类型: ${authType}`);
        }
        return token;
      } finally {
        // 认证完成后释放锁
        authLocks.delete(cacheKey);
        logger.info("认证请求锁已释放", { cacheKey });
      }
    })();

    // 将认证 Promise 存入锁表
    authLocks.set(cacheKey, authPromise);
    logger.info("认证请求已加锁", { cacheKey });

    // 等待认证完成
    return await authPromise;
  } catch (error: any) {
    logger.error("获取AuthToken失败", { error: error.message });
    throw error;
  }
}

/**
 * 清除Token缓存
 */
export function clearTokenCache(userId?: string): void {
  if (userId) {
    const cacheKey = `uid-auth-${userId}`;
    tokenCache.delete(cacheKey);
    authLocks.delete(cacheKey); // 同时清除锁
    logger.info("清除指定用户的Token缓存和认证锁", { cacheKey });
  } else {
    tokenCache.clear();
    authLocks.clear(); // 清除所有锁
    logger.info("清除所有Token缓存和认证锁");
  }
}

/**
 * 获取缓存状态
 */
export function getTokenCacheStatus(): Array<{
  key: string;
  expiresAt: Date;
  isExpired: boolean;
  hasActiveLock: boolean;
}> {
  const now = Date.now();
  const status: Array<{
    key: string;
    expiresAt: Date;
    isExpired: boolean;
    hasActiveLock: boolean;
  }> = [];

  tokenCache.forEach((value, key) => {
    status.push({
      key,
      expiresAt: new Date(value.expiresAt),
      isExpired: value.expiresAt <= now,
      hasActiveLock: authLocks.has(key),
    });
  });

  return status;
}

/**
 * 定时清理过期Token
 * 建议每小时执行一次
 */
export function cleanupExpiredTokens(): number {
  const now = Date.now();
  let cleanedCount = 0;

  tokenCache.forEach((value, key) => {
    if (value.expiresAt <= now) {
      tokenCache.delete(key);
      cleanedCount++;
    }
  });

  if (cleanedCount > 0) {
    logger.info("清理过期Token", { count: cleanedCount });
  }

  return cleanedCount;
}

/**
 * 获取认证锁状态（用于监控和调试）
 */
export function getAuthLockStatus(): Array<{ key: string }> {
  const status: Array<{ key: string }> = [];

  authLocks.forEach((_, key) => {
    status.push({ key });
  });

  return status;
}

/**
 * 清除认证配置缓存
 * 当配置更新后调用此方法重新加载配置
 */
export function clearAuthConfigCache(): void {
  EbscoConfigSingleton.clearCache();
}

/**
 * 更新认证配置缓存
 * 用于手动更新配置，避免重新查询数据库
 */
export function updateAuthConfigCache(
  config: Partial<{
    authType: string;
    userId: string;
    password: string;
    apiBaseUrl: string;
  }>
): void {
  EbscoConfigSingleton.updateCache(config);
}

/**
 * 导出配置单例类（用于测试或高级用途）
 */
export { EbscoConfigSingleton };
