import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { toast } from "sonner";

/**
 * API 响应类型（与后端 responseHelper 保持一致）
 */
export interface ApiResponse<T = any> {
  code: number; // HTTP状态码：200成功，其他失败
  message: string;
  data: T;
}

/**
 * 业务错误对象（非 Error 类型，避免触发 Next.js 错误覆盖层）
 */
export interface BusinessError {
  message: string;
  isWarning: boolean;
  code?: number;
  isAuthError?: boolean; // 标记是否为认证错误
}

/**
 * 请求配置类型
 */
export interface RequestConfig extends AxiosRequestConfig {
  requireAuth?: boolean; // 是否需要认证
  skipContentType?: boolean; // 是否跳过自动设置 Content-Type（用于文件上传）
  silentAuthError?: boolean; // 是否静默处理认证错误（不跳转登录）
}

/**
 * 获取存储的 Token
 */
export function getToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

/**
 * 保存 Token
 */
export function saveToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

/**
 * 清除 Token
 */
export function clearToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}

/**
 * 检查是否是需要认证的请求
 */
function isAuthRequired(config: RequestConfig): boolean {
  // 如果明确指定了 requireAuth，则使用该值
  if (config.requireAuth !== undefined) {
    return config.requireAuth;
  }
  
  // 默认情况下，只有 GET 请求不需要认证
  // 因为页面加载时的搜索请求通常是 GET 请求
  const method = config.method?.toUpperCase() || 'GET';
  return method !== 'GET';
}

/**
 * 创建 Axios 实例
 */
const axiosInstance: AxiosInstance = axios.create({
  baseURL: "", // 使用相对路径
  timeout: 30000, // 30秒超时
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 请求拦截器
 */
axiosInstance.interceptors.request.use(
  (config: any) => {
    const requestConfig = config as RequestConfig;
    
    // 获取 token
    const token = getToken();
    
    // 判断是否需要认证
    const authRequired = isAuthRequired(requestConfig);
    
    // 如果需要认证且有 token，添加 Authorization 头
    if (authRequired && token && config.headers) {
      config.headers["Authorization"] = `Bearer ${token}`;
    } else if (!authRequired && token && config.headers) {
      // 即使不需要认证，如果存在 token 也带上（用于获取个性化内容）
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // 如果是 FormData 或者明确要求跳过 Content-Type，删除自动设置的 Content-Type
    if (config.data instanceof FormData || requestConfig.skipContentType) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const { code, message } = response.data;
    const requestConfig = response.config as RequestConfig;

    // 业务逻辑错误处理
    if (code !== 200) {
      if (message) {
        // 对于 503 警告，使用 warning 而不是 error
        if (code === 503) {
          toast.warning(message);
        } else {
          toast.error(message);
        }
      }
      return Promise.reject({
        message: message || "操作失败",
        isWarning: code === 503,
        code,
      } as BusinessError);
    }

    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    const requestConfig = error.config as RequestConfig;

    // 处理请求取消（AbortError）
    if (axios.isCancel(error)) {
      console.log('请求已取消:', error.message);
      return Promise.reject({
        ...error,
        name: 'AbortError',
        message: '请求已取消',
      } as any);
    }

    // HTTP 错误处理（网络错误、服务器错误等）
    if (error.response) {
      const { status, data } = error.response;
      
      // 判断是否需要认证
      const authRequired = isAuthRequired(requestConfig || {});

      // 处理 401 未授权错误（token过期）
      if (status === 401) {
        // 清除本地存储的 token（无论是否需要认证）
        clearToken();
        
        // 判断是否静默处理认证错误
        const silentAuthError = requestConfig?.silentAuthError || false;
        
        if (authRequired) {
          // 对于需要认证的请求
          if (!silentAuthError) {
            // 显示友好提示
            toast.error("登录已过期，请重新登录");

            if (typeof window !== "undefined") {
              // 检查当前是否已经在登录页面，避免无限重定向
              const currentPath = window.location.pathname + window.location.search;

              // 如果已经在登录页面，不需要再次重定向
              if (!currentPath.startsWith('/login')) {
                // 延迟 1.5 秒后跳转，给用户时间看到提示
                setTimeout(() => {
                  const redirectUrl = `/login?redirect=${encodeURIComponent(
                    currentPath
                  )}`;
                  window.location.href = redirectUrl;
                }, 1500);
              }
            }
          }
          
          // 返回认证错误对象
          return Promise.reject({
            message: "登录已过期，请重新登录",
            isWarning: false,
            code: 401,
            isAuthError: true, // 标记为认证错误
            silent: silentAuthError, // 标记是否静默处理
          } as BusinessError);
        } else {
          // 对于不需要认证的请求（如页面加载时的搜索请求）
          // 只清除 token，不跳转登录，不显示错误提示
          console.warn('非认证请求返回401，清除token但不跳转');
          
          // 静默处理，不显示错误提示
          return Promise.reject({
            message: "认证已过期，请登录后重试",
            isWarning: false,
            code: 401,
            isAuthError: true,
            silent: true, // 标记为静默处理
          } as BusinessError);
        }
      }

      // 处理 501 和 503 警告
      if (status === 501 || status === 503) {
        if (data?.message) {
          if (status === 503) {
            toast.warning(data.message);
          } else {
            toast.error(data.message);
          }
        }
        return Promise.reject({
          message: data?.message || "操作失败",
          isWarning: status === 503,
          code: status,
        } as BusinessError);
      }

      // 处理 403 无权限错误
      if (status === 403) {
        toast.error("没有权限访问");
        return Promise.reject({
          message: "没有权限访问",
          isWarning: false,
          code: 403,
        } as BusinessError);
      }

      // 处理 404 资源不存在
      if (status === 404) {
        toast.error("请求的资源不存在");
        return Promise.reject({
          message: "请求的资源不存在",
          isWarning: false,
          code: 404,
        } as BusinessError);
      }

      // 处理 500 服务器错误
      if (status >= 500) {
        toast.error("服务器错误");
        return Promise.reject({
          message: "服务器错误",
          isWarning: false,
          code: status,
        } as BusinessError);
      }

      // 处理其他 HTTP 错误
      const errorMessage = data?.message || `请求失败: ${status}`;
      toast.error(errorMessage);
      return Promise.reject({
        message: errorMessage,
        isWarning: false,
        code: status,
      } as BusinessError);
    }

    // 处理网络错误
    if (error.request) {
      toast.error("网络错误，请检查网络连接");
      return Promise.reject({
        message: "网络错误，请检查网络连接",
        isWarning: false,
      } as BusinessError);
    }

    // 其他错误
    return Promise.reject(error);
  }
);

/**
 * 统一 API 请求方法
 * @param url 请求URL
 * @param config 请求配置
 */
export async function apiRequest<T = any>(
  url: string,
  config: RequestConfig = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await axiosInstance.request<ApiResponse<T>>({
      url,
      ...config,
    });
    return response.data;
  } catch (error: any) {
    // 如果是静默处理的认证错误，不显示 toast
    if (error.isAuthError && error.silent) {
      console.warn('静默处理的认证错误:', error.message);
      throw error;
    }
    
    console.error("API请求异常:", error);
    throw error;
  }
}

/**
 * GET 请求 - 默认不需要认证
 */
export function apiGet<T = any>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  const finalConfig: RequestConfig = {
    ...config,
    method: "GET",
    requireAuth: config?.requireAuth || false, // GET 请求默认不需要认证
  };
  return apiRequest<T>(url, finalConfig);
}

/**
 * POST 请求 - 支持 FormData 上传，默认需要认证
 * @param url 请求URL
 * @param data 请求数据
 * @param configOrSignal 请求配置或 AbortSignal
 */
export function apiPost<T = any>(
  url: string,
  data?: any,
  configOrSignal?: RequestConfig | AbortSignal
): Promise<ApiResponse<T>> {
  // 判断第三个参数是 RequestConfig 还是 AbortSignal
  const isConfig = configOrSignal &&
    (typeof configOrSignal === 'object' && 'requireAuth' in configOrSignal);

  const config: RequestConfig = isConfig ? configOrSignal as RequestConfig : {};
  const signal = isConfig ? undefined : configOrSignal as AbortSignal;

  // 如果是 FormData，设置跳过 Content-Type
  const finalConfig: RequestConfig = {
    ...config,
    method: "POST",
    data,
    requireAuth: config?.requireAuth ?? true, // POST 请求默认需要认证
    signal, // 添加 AbortSignal
  };

  // 如果是 FormData，自动跳过 Content-Type 设置
  if (data instanceof FormData) {
    finalConfig.skipContentType = true;

    // 对于文件上传，增加超时时间
    if (!finalConfig.timeout) {
      finalConfig.timeout = 60000; // 60秒超时
    }
  }

  return apiRequest<T>(url, finalConfig);
}

/**
 * PUT 请求 - 默认需要认证
 */
export function apiPut<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    ...config,
    method: "PUT",
    data,
    requireAuth: config?.requireAuth ?? true, // PUT 请求默认需要认证
  });
}

/**
 * DELETE 请求 - 默认需要认证
 */
export function apiDel<T = any>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    ...config,
    method: "DELETE",
    requireAuth: config?.requireAuth ?? true, // DELETE 请求默认需要认证
  });
}

/**
 * PATCH 请求 - 默认需要认证
 */
export function apiPatch<T = any>(
  url: string,
  data?: any,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, {
    ...config,
    method: "PATCH",
    data,
    requireAuth: config?.requireAuth ?? true, // PATCH 请求默认需要认证
  });
}

/**
 * 静默认证的 GET 请求（用于页面加载）
 */
export function apiGetSilent<T = any>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  const finalConfig: RequestConfig = {
    ...config,
    method: "GET",
    requireAuth: false,
    silentAuthError: true, // 静默处理认证错误
  };
  return apiRequest<T>(url, finalConfig);
}

/**
 * 需要认证的 GET 请求
 */
export function apiGetAuth<T = any>(
  url: string,
  config?: RequestConfig
): Promise<ApiResponse<T>> {
  const finalConfig: RequestConfig = {
    ...config,
    method: "GET",
    requireAuth: true,
  };
  return apiRequest<T>(url, finalConfig);
}

/**
 * 导出 axios 实例（用于特殊场景）
 */
export { axiosInstance };

/**
 * 专门用于文件上传的方法（替代原生 fetch）
 */
export async function apiUploadFile<T = any>(
  url: string,
  formData: FormData,
  onProgress?: (progress: number) => void
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `上传失败: ${response.status}`);
    }

    const result = await response.json();

    if (result.code !== 200) {
      throw new Error(result.message || '上传失败');
    }

    return result;
  } catch (error: any) {
    console.error('文件上传失败:', error);
    toast.error(error.message || '文件上传失败');
    throw error;
  }
}

/**
 * 专门用于文件下载的方法（带认证）
 */
export async function apiDownloadFile(
  url: string,
  params?: Record<string, any>,
  filename?: string
): Promise<void> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 构建查询参数
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    const fullUrl = `${url}${queryString}`;

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers,
    });

    // 处理认证错误
    if (response.status === 401) {
      clearToken();
      toast.error("登录已过期，请重新登录");

      // 延迟跳转登录页
      setTimeout(() => {
        const currentPath = window.location.pathname + window.location.search;
        if (!currentPath.startsWith('/login')) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
        }
      }, 1500);

      throw new Error("登录已过期，请重新登录");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `下载失败: ${response.status}`);
    }

    // 创建下载链接
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename || 'download';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
  } catch (error: any) {
    console.error('文件下载失败:', error);

    // 如果不是认证错误，显示错误提示
    if (!error.message?.includes('登录已过期')) {
      toast.error(error.message || '文件下载失败');
    }

    throw error;
  }
}