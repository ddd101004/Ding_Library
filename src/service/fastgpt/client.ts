/**
 * FastGPT RAG 平台 HTTP 客户端
 * 封装与 FastGPT API 的通信
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import FormData from "form-data";
import logger from "@/helper/logger";
import type { FastGPTResponse, FastGPTError } from "@/type/fastgpt";

/**
 * FastGPT 客户端配置
 */
interface FastGPTClientConfig {
  /** API 基础 URL */
  baseUrl: string;
  /** API 密钥 */
  apiKey: string;
  /** 请求超时时间（毫秒） */
  timeout?: number;
}

/**
 * FastGPT HTTP 客户端
 */
class FastGPTClient {
  private client: AxiosInstance;
  private config: FastGPTClientConfig;

  constructor(config: FastGPTClientConfig) {
    this.config = {
      timeout: 60000,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        logger.debug("[FastGPT] Request:", {
          method: config.method,
          url: config.url,
          params: config.params,
        });
        return config;
      },
      (error: AxiosError) => {
        logger.error("[FastGPT] Request Error:", error.message);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        logger.debug("[FastGPT] Response:", {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError<FastGPTError>) => {
        const errorInfo = {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        };
        logger.error("[FastGPT] Response Error:", errorInfo);
        return Promise.reject(error);
      }
    );
  }

  /**
   * GET 请求
   */
  async get<T>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<FastGPTResponse<T>> {
    const response = await this.client.get<FastGPTResponse<T>>(url, {
      params,
      ...config,
    });
    return response.data;
  }

  /**
   * POST 请求
   */
  async post<T>(
    url: string,
    data?: Record<string, unknown> | FormData,
    config?: AxiosRequestConfig
  ): Promise<FastGPTResponse<T>> {
    const response = await this.client.post<FastGPTResponse<T>>(url, data, config);
    const result = response.data;

    // 检查 FastGPT API 响应状态
    // code 为 200 表示成功，其他值表示失败
    if (result.code !== undefined && result.code !== 200) {
      logger.error("[FastGPT] API returned error code:", {
        code: result.code,
        statusText: result.statusText,
        message: result.message,
        url,
      });
      throw new Error(
        `FastGPT API 错误 [${result.code}]: ${result.message || result.statusText || "未知错误"}`
      );
    }

    return result;
  }

  /**
   * PUT 请求
   */
  async put<T>(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<FastGPTResponse<T>> {
    const response = await this.client.put<FastGPTResponse<T>>(url, data, config);
    return response.data;
  }

  /**
   * DELETE 请求
   */
  async delete<T>(
    url: string,
    params?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<FastGPTResponse<T>> {
    const response = await this.client.delete<FastGPTResponse<T>>(url, {
      params,
      ...config,
    });
    return response.data;
  }

  /**
   * POST 请求（返回原始响应，用于流式处理）
   */
  async postRaw(
    url: string,
    data?: Record<string, unknown>,
    config?: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    return this.client.post(url, data, config);
  }

  /**
   * 上传文件
   */
  async uploadFile<T>(
    url: string,
    formData: FormData,
    config?: AxiosRequestConfig
  ): Promise<FastGPTResponse<T>> {
    const response = await this.client.post<FastGPTResponse<T>>(url, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      ...config,
    });
    const result = response.data;

    // 检查 FastGPT API 响应状态
    if (result.code !== undefined && result.code !== 200) {
      logger.error("[FastGPT] Upload API returned error code:", {
        code: result.code,
        statusText: result.statusText,
        message: result.message,
        url,
      });
      throw new Error(
        `FastGPT 上传错误 [${result.code}]: ${result.message || result.statusText || "未知错误"}`
      );
    }

    return result;
  }

  /**
   * 获取 Axios 实例（用于高级用法）
   */
  getAxiosInstance(): AxiosInstance {
    return this.client;
  }
}

// 从环境变量读取配置
const FASTGPT_BASE_URL =
  process.env.FASTGPT_BASE_URL || "https://library-rag.century-cloud.com/api";
const FASTGPT_API_KEY = process.env.FASTGPT_API_KEY || "";

// 检查必要的环境变量
if (!FASTGPT_API_KEY) {
  logger.warn("[FastGPT] FASTGPT_API_KEY is not set in environment variables");
}

// 创建单例客户端
const fastgptClient = new FastGPTClient({
  baseUrl: FASTGPT_BASE_URL,
  apiKey: FASTGPT_API_KEY,
  timeout: 120000, // 2分钟超时，因为文件处理可能较慢
});

export { fastgptClient, FastGPTClient };
export type { FastGPTClientConfig };
