import axios, { AxiosInstance } from "axios";
import logger from "@/helper/logger";

// AMiner API 响应类型
export interface AminerApiResponse<T = any> {
  code: number;
  data: T;
  total?: number; // 可选，部分接口有此字段
  msg?: string;
  success?: boolean;
  log_id?: string;
}

// AMiner API 配置
const AMINER_API_BASE_URL =
  process.env.AMINER_API_BASE_URL ||
  "https://datacenter.aminer.cn/gateway/open_platform/api";
const AMINER_TOKEN = process.env.AMINER_API_TOKEN!;

/**
 * 创建 Axios 实例
 */
export const aminerClient: AxiosInstance = axios.create({
  baseURL: AMINER_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json;charset=utf-8",
    Authorization: AMINER_TOKEN,
  },
});

/**
 * 请求拦截器
 */
aminerClient.interceptors.request.use(
  (config) => {
    logger.info(
      `AMiner API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        params: config.params,
        data: config.data,
      }
    );
    return config;
  },
  (error) => {
    logger.error("AMiner API Request Error:", error);
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
aminerClient.interceptors.response.use(
  (response) => {
    logger.info(`AMiner API Response: ${response.config.url}`, {
      status: response.status,
      data: response.data,
    });

    // 检查业务状态码
    if (response.data.code && response.data.code !== 200) {
      // 40401 表示无数据，不应视为错误，返回空数据
      if (response.data.code === 40401) {
        logger.info("AMiner API: No data found (40401)", {
          url: response.config.url,
        });
        // 返回空数据结构，保持与正常响应一致的格式
        return {
          ...response.data,
          data: response.data.data ?? [],
        };
      }

      const error = new Error(response.data.msg || "AMiner API Error");
      logger.error("AMiner API Business Error:", {
        code: response.data.code,
        message: response.data.msg,
      });
      throw error;
    }

    return response.data;
  },
  (error) => {
    logger.error("AMiner API Response Error:", {
      message: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  }
);

/**
 * 通用错误处理
 * @param error 错误对象
 */
export function handleAminerError(error: any): never {
  if (error.response) {
    const { code, msg } = error.response.data || {};
    switch (code) {
      case 40001:
        throw new Error("参数错误");
      case 40301:
        throw new Error("权限禁用");
      case 40302:
        throw new Error("Token过期");
      case 40306:
        throw new Error("访问频率过快");
      case 40307:
        throw new Error("无效的API Key");
      case 40308:
        throw new Error("无效的Token");
      case 50001:
        throw new Error("服务出错");
      default:
        throw new Error(msg || "未知错误");
    }
  }
  throw error;
}
