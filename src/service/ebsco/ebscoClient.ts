/**
 * EBSCO 统一 HTTP 客户端
 *
 * 封装所有 EBSCO API 请求逻辑，统一处理：
 * - Headers 管理（认证和会话 Token）
 * - XML 响应解析
 * - 错误处理
 * - 日志记录
 */

import axios, { AxiosError } from 'axios';
import logger from '@/helper/logger';
import { getAuthToken } from './auth';
import { getOrCreateSession, touchSession } from './session';
import { parseXmlResponse, extractXmlError } from './xmlParser';
import { EbscoConfigSingleton } from './config';

/**
 * EBSCO 请求选项
 */
export interface EbscoRequestOptions {
  /** 可选的认证 Token，不提供则自动获取 */
  authToken?: string;
  /** 可选的会话 Token，不提供则自动创建 */
  sessionToken?: string;
  /** 是否自动更新会话使用时间，默认 true */
  touchSession?: boolean;
  /** 请求超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 操作名称，用于日志记录 */
  operationName?: string;
}

/**
 * EBSCO 请求响应
 */
export interface EbscoResponse<T = any> {
  /** 解析后的数据 */
  data: T;
  /** 原始 XML 文本 */
  rawXml: string;
  /** 响应时间（毫秒） */
  responseTime: number;
}

/**
 * EBSCO API 客户端类
 */
class EbscoClient {
  /**
   * 发送 GET 请求
   * @param path API 路径（相对于 base URL）
   * @param params 查询参数
   * @param options 请求选项
   * @returns 解析后的响应
   */
  async get<T = any>(
    path: string,
    params: Record<string, string | number | boolean> = {},
    options: EbscoRequestOptions = {}
  ): Promise<EbscoResponse<T>> {
    return this.request<T>('GET', path, params, options);
  }

  /**
   * 发送 POST 请求
   * @param path API 路径
   * @param body 请求体数据
   * @param options 请求选项
   * @returns 解析后的响应
   */
  async post<T = any>(
    path: string,
    body: any = {},
    options: EbscoRequestOptions = {}
  ): Promise<EbscoResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  /**
   * 统一请求方法
   * @param method HTTP 方法
   * @param path API 路径
   * @param data 查询参数或请求体
   * @param options 请求选项
   */
  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    data: any = {},
    options: EbscoRequestOptions = {}
  ): Promise<EbscoResponse<T>> {
    const {
      authToken,
      sessionToken,
      touchSession: shouldTouchSession = true,
      timeout = 30000,
      operationName = path,
    } = options;

    try {
      // 获取必要的 Tokens
      const token = authToken || (await getAuthToken());
      const session = sessionToken || (await getOrCreateSession(token));

      // 获取配置
      const config = await EbscoConfigSingleton.getInstance();

      // 构建完整 URL
      const url = this.buildUrl(config.apiBaseUrl, path, method === 'GET' ? data : {});

      logger.info(`开始 EBSCO ${method} 请求`, {
        operationName,
        url: url.substring(0, 200),
      });

      const startTime = Date.now();

      // 使用 axios 发送请求
      const response = await axios({
        method,
        url,
        headers: {
          'x-authenticationToken': token,
          'x-sessionToken': session,
          ...(method === 'POST' && { 'Content-Type': 'application/json' }),
        },
        ...(method === 'POST' && { data }),
        timeout,
        responseType: 'text', // 获取 XML 文本响应
        validateStatus: () => true, // 不自动抛出错误，手动处理
      });

      const responseTime = Date.now() - startTime;

      // 处理 HTTP 错误
      if (response.status >= 400) {
        const errorText = typeof response.data === 'string'
          ? response.data
          : JSON.stringify(response.data);

        logger.error(`EBSCO ${method} 请求失败`, {
          operationName,
          status: response.status,
          statusText: response.statusText,
          error: errorText.substring(0, 500),
          dataType: typeof response.data,
          dataLength: response.data?.length || 0,
          headers: response.headers,
        });

        throw new Error(
          `EBSCO 请求失败 (${response.status}): ${response.statusText}`
        );
      }

      // 获取 XML 响应
      const rawXml = response.data as string;

      // 检查业务错误
      const error = extractXmlError(rawXml);
      if (error) {
        logger.error(`EBSCO ${method} 返回业务错误`, {
          operationName,
          errorCode: error.code,
          errorMessage: error.message,
        });
        throw new Error(`EBSCO 错误 (${error.code}): ${error.message}`);
      }

      // 解析 XML
      const parsedData = await parseXmlResponse<T>(rawXml);

      // 更新会话使用时间
      if (shouldTouchSession) {
        touchSession(session);
      }

      logger.info(`EBSCO ${method} 请求成功`, {
        operationName,
        responseTime: `${responseTime}ms`,
      });

      return {
        data: parsedData,
        rawXml,
        responseTime,
      };
    } catch (error: any) {
      // 处理 axios 错误
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error(`EBSCO ${method} 请求异常`, {
          operationName,
          error: axiosError.message,
          code: axiosError.code,
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          stack: axiosError.stack,
        });

        // 提供更友好的错误信息
        if (axiosError.code === 'ECONNREFUSED') {
          throw new Error(`无法连接到 EBSCO API 服务器: ${axiosError.message}`);
        } else if (axiosError.code === 'ETIMEDOUT') {
          throw new Error(`EBSCO API 请求超时: ${axiosError.message}`);
        } else if (axiosError.code === 'ENOTFOUND') {
          throw new Error(`无法解析 EBSCO API 域名: ${axiosError.message}`);
        }
      } else {
        logger.error(`EBSCO ${method} 请求异常`, {
          operationName,
          error: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  /**
   * 构建完整 URL
   * @param baseUrl 基础 URL
   * @param path 路径
   * @param params 查询参数
   */
  private buildUrl(
    baseUrl: string,
    path: string,
    params: Record<string, string | number | boolean>
  ): string {
    // 确保路径以 / 开头
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // 构建基础 URL
    const url = new URL(normalizedPath, baseUrl);

    // 添加查询参数
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    // EBSCO API 使用逗号作为搜索语法分隔符，不应该被 URL 编码
    // URLSearchParams 会将逗号编码为 %2C，需要还原
    return url.toString().replace(/%2C/gi, ',');
  }
}

/**
 * 导出单例实例
 */
export const ebscoClient = new EbscoClient();

/**
 * 便捷方法：GET 请求
 */
export const ebscoGet = <T = any>(
  path: string,
  params?: Record<string, string | number | boolean>,
  options?: EbscoRequestOptions
) => ebscoClient.get<T>(path, params, options);

/**
 * 便捷方法：POST 请求
 */
export const ebscoPost = <T = any>(
  path: string,
  body?: any,
  options?: EbscoRequestOptions
) => ebscoClient.post<T>(path, body, options);
