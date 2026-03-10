import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import logger from "@/helper/logger";

// ========== 配置 ==========

const DOC_DELIVERY_API_BASE_URL =
  process.env.DOC_DELIVERY_API_BASE_URL ||
  "https://doctxm.sgst.cn/elibraryfull-api";
const DOC_DELIVERY_APP_ID = process.env.DOC_DELIVERY_APP_ID!;
const DOC_DELIVERY_APP_KEY = process.env.DOC_DELIVERY_APP_KEY!;

// ========== 类型定义 ==========

/**
 * 文献传递响应基础结构
 */
export interface DocDeliveryResponse<T = any> {
  code: number;
  msg: string;
  data: T;
  time: number;
}

/**
 * 请求文献传递参数
 */
export interface RequestDocDeliveryParams {
  title: string; // 文章名称（必填）
  periodical_name?: string; // 期刊名称
  year?: string; // 出版年份
  page?: string; // 起始页码
  subject_type_id?: string; // 学科类别ID
  period?: string; // 期
  volume?: string; // 卷
  author?: string; // 作者
  language?: string; // 语言
  publisher?: string; // 出版社
  doctype_id?: string; // 文章类型ID
  other?: string; // 其他信息
}

/**
 * 请求文献传递响应数据
 */
export interface RequestDocDeliveryResult {
  taskId: string; // 任务ID，用于后续查询
}

/**
 * 查询文献传递任务参数
 */
export interface GetDocDeliveryParams {
  taskId: string; // 任务ID
}

/**
 * 文献传递任务状态码
 */
export const DOC_DELIVERY_STATUS = {
  0: "查询失败",
  1: "提交中",
  2: "服务中",
  3: "已上传",
  4: "已下载",
  8: "完成结束",
  9: "无法完成结束",
} as const;

export type DocDeliveryStatusCode = keyof typeof DOC_DELIVERY_STATUS;

/**
 * 获取状态码对应的中文描述
 */
export function getStatusText(code: number): string {
  return DOC_DELIVERY_STATUS[code as DocDeliveryStatusCode] || `未知状态(${code})`;
}

/**
 * 文献传递任务状态（第三方API原始返回）
 */
interface DocDeliveryTaskRawResult {
  code: string; // 原始状态码（字符串）
}

/**
 * 文献传递任务状态（转译后）
 */
export interface DocDeliveryTaskResult {
  status: number; // 任务状态码
  status_text: string; // 状态中文描述
}

/**
 * 获取全文URL参数
 */
export interface GetFulltextUrlParams {
  libAttachId: string; // 文献附件ID
}

// ========== 工具函数 ==========

/**
 * 生成时间戳
 */
function generateTimestamp(): string {
  return Date.now().toString();
}

/**
 * 生成签名（通用）
 * 签名规则: MD5(prefix=appid=appkey=timestamp) 大写
 *
 * @param prefix - 签名前缀（request接口用title，其他接口用taskId/libAttachId）
 * @param timestamp - 时间戳
 * @returns 大写的MD5签名
 */
function generateSign(prefix: string, timestamp: string): string {
  const signStr = [prefix, DOC_DELIVERY_APP_ID, DOC_DELIVERY_APP_KEY, timestamp].join("=");
  return crypto.createHash("md5").update(signStr).digest("hex").toUpperCase();
}

// ========== Axios 实例 ==========

const docDeliveryClient: AxiosInstance = axios.create({
  baseURL: DOC_DELIVERY_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
  },
});

// 请求拦截器
docDeliveryClient.interceptors.request.use(
  (config) => {
    logger.info(
      `DocDelivery API Request: ${config.method?.toUpperCase()} ${config.url}`,
      {
        params: config.params,
        data: config.data,
      }
    );

    return config;
  },
  (error) => {
    logger.error("DocDelivery API Request Error:", error);
    return Promise.reject(error);
  }
);

// 响应拦截器
docDeliveryClient.interceptors.response.use(
  (response) => {
    logger.info(`DocDelivery API Response: ${response.config.url}`, {
      status: response.status,
      data: response.data,
    });
    return response.data;
  },
  (error) => {
    logger.error("DocDelivery API Response Error:", {
      message: error.message,
      response: error.response?.data,
    });
    return Promise.reject(error);
  }
);

// ========== API 函数 ==========

/**
 * 请求文献传递
 * 提交文献传递请求，返回任务ID
 * @param params 文献信息参数
 * @returns 任务ID
 */
export async function requestDocDelivery(
  params: RequestDocDeliveryParams
): Promise<DocDeliveryResponse<RequestDocDeliveryResult>> {
  const timestamp = generateTimestamp();
  const sign = generateSign(params.title, timestamp);

  // 构建查询参数
  const queryParams: Record<string, string> = {
    appid: DOC_DELIVERY_APP_ID,
    timestamp,
    sign,
    title: params.title,
  };

  // 添加可选参数
  if (params.periodical_name)
    queryParams.periodical_name = params.periodical_name;
  if (params.year) queryParams.year = params.year;
  if (params.page) queryParams.page = params.page;
  if (params.subject_type_id)
    queryParams.subject_type_id = params.subject_type_id;
  if (params.period) queryParams.period = params.period;
  if (params.volume) queryParams.volume = params.volume;
  if (params.author) queryParams.author = params.author;
  if (params.language) queryParams.language = params.language;
  if (params.publisher) queryParams.publisher = params.publisher;
  if (params.doctype_id) queryParams.doctype_id = params.doctype_id;
  if (params.other) queryParams.other = params.other;

  const response = await docDeliveryClient.post("/requestdocdelivery", null, {
    params: queryParams,
  });

  return response as unknown as DocDeliveryResponse<RequestDocDeliveryResult>;
}

/**
 * 查询文献传递任务
 * 根据任务ID查询文献传递状态和结果
 * @param params 查询参数
 * @returns 任务状态和结果（含状态中文描述）
 */
export async function getDocDelivery(
  params: GetDocDeliveryParams
): Promise<DocDeliveryResponse<DocDeliveryTaskResult>> {
  const timestamp = generateTimestamp();
  const sign = generateSign(params.taskId, timestamp);

  const formData = new URLSearchParams();
  formData.append("taskId", params.taskId);
  formData.append("appId", DOC_DELIVERY_APP_ID);
  formData.append("timestamp", timestamp);
  formData.append("sign", sign);

  const response = await docDeliveryClient.post(
    "/getdocdelivery",
    formData.toString()
  );

  // 转换原始响应，添加状态中文描述
  const rawResponse = response as unknown as DocDeliveryResponse<DocDeliveryTaskRawResult>;
  const statusCode = parseInt(rawResponse.data?.code || "0", 10);

  return {
    code: rawResponse.code,
    msg: rawResponse.msg,
    time: rawResponse.time,
    data: {
      status: statusCode,
      status_text: getStatusText(statusCode),
    },
  };
}

/**
 * 获取全文URL
 * 根据文献附件ID获取全文下载URL
 * @param params 参数
 * @returns 全文URL
 */
export async function getFulltextUrl(
  params: GetFulltextUrlParams
): Promise<DocDeliveryResponse<string>> {
  const timestamp = generateTimestamp();
  const sign = generateSign(params.libAttachId, timestamp);

  const response = await docDeliveryClient.get("/fulltextUrl", {
    params: {
      libAttachId: params.libAttachId,
      appid: DOC_DELIVERY_APP_ID,
      timestamp,
      sign,
    },
  });

  return response as unknown as DocDeliveryResponse<string>;
}
