/**
 * EBSCO会话管理服务
 *
 * 处理EBSCO API的会话创建和管理
 * SessionToken必须在所有API请求中使用
 */

import logger from "@/helper/logger";
import axios from "axios";
import { getAuthToken } from "./auth";
import { EbscoConfigSingleton } from "./config";
import { extractXmlField, extractXmlError } from "./xmlParser";
import { getConfigValue, setConfigValue } from "@/db/ebscoConfig";
import type { SessionCache } from "./types";

// Session 内存缓存（一级缓存 - 快速访问）
let currentSession: SessionCache | null = null;

// Session超时时间（毫秒），默认30分钟
const SESSION_TIMEOUT = 30 * 60 * 1000;

/**
 * 从数据库加载 Session 缓存
 */
async function loadSessionFromDB(): Promise<SessionCache | null> {
  try {
    const dbKey = "ebsco.cache.session";
    const data = await getConfigValue<SessionCache>(dbKey);

    if (data && data.sessionToken && data.lastUsed) {
      const now = Date.now();

      // 检查是否过期
      if (data.lastUsed + SESSION_TIMEOUT > now) {
        logger.info("从数据库加载Session缓存", {
          sessionTokenPreview: data.sessionToken.substring(0, 16) + "...",
          expiresIn: Math.floor((data.lastUsed + SESSION_TIMEOUT - now) / 1000),
        });
        return data;
      } else {
        logger.info("数据库中的Session已过期", {
          sessionTokenPreview: data.sessionToken.substring(0, 16) + "...",
        });
      }
    }

    return null;
  } catch (error) {
    logger.error("从数据库加载Session失败", { error });
    return null;
  }
}

/**
 * 保存 Session 到数据库
 */
async function saveSessionToDB(session: SessionCache): Promise<void> {
  try {
    const dbKey = "ebsco.cache.session";
    await setConfigValue(dbKey, session, "json", "EBSCO Session缓存", "cache");

    logger.info("保存Session到数据库", {
      sessionTokenPreview: session.sessionToken.substring(0, 16) + "...",
    });
  } catch (error) {
    logger.error("保存Session到数据库失败", { error });
  }
}

/**
 * 创建新会话
 * @param authToken 可选的认证Token，如果不提供则自动获取
 * @param guest 是否为访客模式
 * @param org 组织ID
 * @param profile 配置文件ID
 */
export async function createSession(
  authToken?: string,
  guest: boolean = false,
  org?: string,
  profile?: string
): Promise<string> {
  try {
    const token = authToken || (await getAuthToken());

    // 获取配置
    const config = await EbscoConfigSingleton.getInstance();
    const endpoint = `${config.apiBaseUrl}/edsapi/rest/createsession`;
    const sessionProfile = profile || config.profile;

    // 构建查询参数
    const params = new URLSearchParams();
    // 明确指定 guest 参数（UID 认证需要 guest=n）
    params.append("guest", guest ? "y" : "n");
    if (org) params.append("org", org);
    if (sessionProfile) params.append("profile", sessionProfile);

    const url = `${endpoint}?${params.toString()}`;

    logger.info("开始创建EBSCO会话", {
      url,
      guest,
      org,
      profile: sessionProfile,
    });

    // 使用 axios 发送请求，内置超时控制（30秒）
    // EBSCO 创建会话接口返回 JSON 而不是 XML
    const response = await axios.get(url, {
      headers: {
        "x-authenticationToken": token,
      },
      timeout: 30000,
      validateStatus: () => true, // 不自动抛出 HTTP 错误
    });

    if (!(response.status >= 200 && response.status < 300)) {
      const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      logger.error("创建EBSCO会话失败", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });
      throw new Error(
        `创建会话失败: ${response.status} ${response.statusText}`
      );
    }

    // EBSCO API 返回 JSON 格式响应
    const data = response.data;
    const sessionToken = data.SessionToken;

    if (!sessionToken) {
      logger.error("创建会话响应缺少SessionToken", { response: JSON.stringify(data) });
      throw new Error("会话响应缺少SessionToken");
    }

    // 缓存Session（内存 + 数据库）
    const now = Date.now();
    const session: SessionCache = {
      sessionToken: sessionToken,
      authToken: token,
      createdAt: now,
      lastUsed: now,
    };

    currentSession = session;

    // 保存到数据库（异步，不阻塞）
    saveSessionToDB(session).catch(err =>
      logger.error("保存Session到数据库失败（后台）", { error: err })
    );

    logger.info("EBSCO会话创建成功", {
      sessionTokenPreview: sessionToken.substring(0, 16) + "...",
    });

    return sessionToken;
  } catch (error: any) {
    // 特殊处理超时错误
    if (error.code === "ECONNABORTED") {
      logger.error("创建EBSCO会话超时", {
        error: "请求超时（30秒）",
        message: error.message,
      });
      throw new Error("创建EBSCO会话超时，请检查网络连接或稍后重试");
    }

    logger.error("创建EBSCO会话异常", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * 结束会话
 * @param sessionToken 会话Token
 */
export async function endSession(sessionToken: string): Promise<void> {
  try {
    // 获取配置
    const config = await EbscoConfigSingleton.getInstance();
    const endpoint = `${config.apiBaseUrl}/edsapi/rest/endsession`;

    logger.info("开始结束EBSCO会话", {
      sessionTokenPreview: sessionToken.substring(0, 16) + "...",
    });

    // 使用 axios 发送请求，内置超时控制（10秒）
    const response = await axios.get(endpoint, {
      headers: {
        "x-sessionToken": sessionToken,
        ...(currentSession?.authToken && { "x-authenticationToken": currentSession.authToken }),
      },
      timeout: 15000,
      responseType: 'text',
      validateStatus: () => true,
    });

    if (!(response.status >= 200 && response.status < 300)) {
      const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      logger.warn("结束EBSCO会话失败", {
        status: response.status,
        error: errorText,
      });
    }

    // 清除内存缓存
    currentSession = null;

    logger.info("EBSCO会话已结束", {
      sessionTokenPreview: sessionToken.substring(0, 16) + "...",
    });
  } catch (error: any) {
    // 特殊处理超时错误
    if (error.code === "ECONNABORTED") {
      logger.error("结束EBSCO会话超时", {
        error: "请求超时（10秒）",
        message: error.message,
      });
    } else {
      logger.error("结束EBSCO会话异常", {
        error: error.message,
      });
    }
    // 即使异常也清除缓存
    currentSession = null;
  }
}

/**
 * 获取或创建会话
 * 如果已有有效会话则返回，否则创建新会话
 * @param authToken 可选的认证Token
 * @param forceNew 是否强制创建新会话
 */
export async function getOrCreateSession(
  authToken?: string,
  forceNew: boolean = false
): Promise<string> {
  try {
    // 先获取当前有效的 Auth Token（用于验证 Session 关联性）
    const currentAuthToken = authToken || (await getAuthToken());

    // 如果不强制创建新会话，尝试使用现有会话
    if (!forceNew) {
      // 检查内存缓存
      if (currentSession) {
        const now = Date.now();
        if (now - currentSession.lastUsed < SESSION_TIMEOUT) {
          // 验证 Session 关联的 Auth Token 是否与当前一致
          if (currentSession.authToken === currentAuthToken) {
            // 更新最后使用时间
            currentSession.lastUsed = now;
            logger.info("使用内存缓存的EBSCO会话", {
              sessionTokenPreview: currentSession.sessionToken.substring(0, 16) + "...",
            });
            return currentSession.sessionToken;
          } else {
            // Auth Token 不匹配，Session 无效
            logger.warn("内存中的Session关联的AuthToken已变更，需要创建新Session", {
              sessionTokenPreview: currentSession.sessionToken.substring(0, 16) + "...",
            });
            currentSession = null;
          }
        } else {
          logger.info("内存中的Session已过期", {
            sessionTokenPreview: currentSession.sessionToken.substring(0, 16) + "...",
          });
          currentSession = null;
        }
      }

      // 内存缓存不存在或已过期，尝试从数据库加载
      if (!currentSession) {
        const dbSession = await loadSessionFromDB();
        if (dbSession) {
          // 验证数据库中 Session 关联的 Auth Token 是否与当前一致
          if (dbSession.authToken === currentAuthToken) {
            // 恢复到内存缓存
            currentSession = dbSession;
            currentSession.lastUsed = Date.now();
            logger.info("从数据库恢复Session到内存缓存");
            return dbSession.sessionToken;
          } else {
            // Auth Token 不匹配，数据库中的 Session 无效
            logger.warn("数据库中的Session关联的AuthToken已变更，需要创建新Session", {
              sessionTokenPreview: dbSession.sessionToken.substring(0, 16) + "...",
            });
          }
        }
      }
    }

    // 创建新会话（传入已获取的 Auth Token，避免重复获取）
    logger.info("创建新EBSCO会话", { forceNew });
    return await createSession(currentAuthToken);
  } catch (error: any) {
    logger.error("获取或创建EBSCO会话失败", { error: error.message });
    throw error;
  }
}

/**
 * 更新会话的最后使用时间
 * @param sessionToken 会话Token
 */
export function touchSession(sessionToken: string): void {
  if (currentSession && currentSession.sessionToken === sessionToken) {
    const now = Date.now();
    currentSession.lastUsed = now;

    // 定期保存到数据库（异步，不阻塞）
    saveSessionToDB(currentSession).catch(err =>
      logger.error("更新Session到数据库失败（后台）", { error: err })
    );
  }
}

/**
 * 清除所有会话缓存
 */
export async function clearAllSessions(): Promise<void> {
  logger.info("开始清除EBSCO会话");

  if (currentSession) {
    await endSession(currentSession.sessionToken);
  }

  currentSession = null;
  logger.info("EBSCO会话已清除");
}

/**
 * 清理过期会话
 * 建议定时执行
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const now = Date.now();

  if (currentSession && now - currentSession.lastUsed >= SESSION_TIMEOUT) {
    logger.info("发现过期EBSCO会话", {
      sessionTokenPreview: currentSession.sessionToken.substring(0, 16) + "...",
    });

    await endSession(currentSession.sessionToken);
    return 1;
  }

  return 0;
}

/**
 * 获取会话缓存状态
 */
export function getSessionCacheStatus(): Array<{
  sessionToken: string;
  createdAt: Date;
  lastUsed: Date;
  age: number;
  idle: number;
}> {
  if (!currentSession) {
    return [];
  }

  const now = Date.now();
  return [{
    sessionToken: currentSession.sessionToken.substring(0, 16) + "...",
    createdAt: new Date(currentSession.createdAt),
    lastUsed: new Date(currentSession.lastUsed),
    age: Math.floor((now - currentSession.createdAt) / 1000),
    idle: Math.floor((now - currentSession.lastUsed) / 1000),
  }];
}

/**
 * 获取会话总数
 */
export function getSessionCount(): number {
  return currentSession ? 1 : 0;
}

/**
 * 清除会话配置缓存
 * 当配置更新后调用此方法重新加载配置
 */
export function clearSessionConfigCache(): void {
  EbscoConfigSingleton.clearCache();
}

/**
 * 更新会话配置缓存
 * 用于手动更新配置，避免重新查询数据库
 */
export function updateSessionConfigCache(
  config: Partial<{
    profile: string;
    apiBaseUrl: string;
  }>
): void {
  EbscoConfigSingleton.updateCache(config);
}

/**
 * 导出配置单例类（用于测试或高级用途）
 */
export { EbscoConfigSingleton };
