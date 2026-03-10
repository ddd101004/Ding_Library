import { apiGet, apiPost } from "@/api/request";

/**
 * COS 上传签名响应
 */
export interface CosUploadSignatureResponse {
  cos_key: string;
  signed_url: string;
  expires_at: string;
  method: string;
  headers: {
    "Content-Type": string;
  };
}

/**
 * AI 伴读论文请求
 */
export interface CreateAiReadingPaperRequest {
  cos_key: string;
  file_name: string;
  file_size: number;
  file_type: string;
  title?: string;
  authors?: string;
  keywords?: string;
}

/**
 * AI 伴读论文响应
 */
export interface CreateAiReadingPaperResponse {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  file_type: string;
  parse_status: "pending" | "parsing" | "completed" | "failed";
  parsed_content?: string;
  parse_error?: string;
  create_time: string;
}

/**
 * 步骤1: 获取COS上传签名
 */
export async function getCosUploadSignature(
  file: File
): Promise<CosUploadSignatureResponse> {
  const fileExtension = file.name.split(".").pop()?.toLowerCase() || "";

  const response = await apiPost<CosUploadSignatureResponse>(
    "/api/cos/upload-signature",
    {
      file_name: file.name,
      file_size: file.size,
      file_type: fileExtension,
      file_extension: fileExtension,
    }
  );

  if (!response.data) throw new Error("未获取到上传签名信息");
  return response.data;
}

/**
 * 步骤2: 上传文件到COS
 */
export async function uploadFileToCos(
  file: File,
  signature: CosUploadSignatureResponse
): Promise<void> {
  const response = await fetch(signature.signed_url, {
    method: signature.method,
    headers: signature.headers,
    body: file,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`COS上传失败: ${response.status} - ${errorText}`);
  }
}

/**
 * 步骤3-4: 创建论文记录并轮询解析状态
 */
export async function createAiReadingPaper(
  params: CreateAiReadingPaperRequest
): Promise<CreateAiReadingPaperResponse> {
  const response = await apiPost<CreateAiReadingPaperResponse>(
    "/api/ai-reading/papers",
    params
  );
  if (!response.data) throw new Error("未获取到论文记录信息");
  return response.data;
}


/**
 * 步骤3-5: 轮询论文解析状态（包括AI元数据提取）
 */
export async function waitForPaperParsingCompleted(
  params: CreateAiReadingPaperRequest,
  maxWaitTime: number = 60000
): Promise<CreateAiReadingPaperResponse> {
  const startTime = Date.now();
  const checkInterval = 2000;

  while (Date.now() - startTime < maxWaitTime) {
    const response = await apiPost<CreateAiReadingPaperResponse>(
      "/api/ai-reading/papers",
      params
    );

    if (!response.data) throw new Error("未获取到论文信息");

    const { parse_status, parse_error } = response.data;

    if (parse_status === "completed") {
      return response.data;
    } else if (parse_status === "failed") {
      throw new Error(`论文解析失败: ${parse_error || "未知错误"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error("等待论文解析完成超时");
}


/**
 * 完整上传流程: 签名 → 上传 → 创建记录 → 等待解析完成
 * @param file 文件对象
 * @param onProgress 进度回调
 * @param onFileCompleted 文件完成回调（个别文件完成后立即调用）
 */
export async function uploadFileWithNewFlow(
  file: File,
  onProgress?: (progress: number) => void,
  onFileCompleted?: (fileName: string, result: {
    id: string;
    cos_key: string;
    title: string;
    parse_status: string;
  }) => void
): Promise<{
  id: string;
  cos_key: string;
  title: string;
  parse_status: string;
  parseError?: string;
}> {
  onProgress?.(10);

  // 步骤1: 获取COS上传签名
  const signature = await getCosUploadSignature(file);
  onProgress?.(30);

  // 步骤2: 上传文件到COS
  await uploadFileToCos(file, signature);
  onProgress?.(60);

  // 步骤3: 准备创建论文记录的参数
  const createParams: CreateAiReadingPaperRequest = {
    cos_key: signature.cos_key,
    file_name: file.name,
    file_size: file.size,
    file_type: file.name.split(".").pop()?.toLowerCase() || "",
  };

  try {
    // 步骤4-5: 轮询直到解析完成（包括AI元数据提取）
    const completedPaper = await waitForPaperParsingCompleted(
      createParams,
      60000
    );
    onProgress?.(100);

    const result = {
      id: completedPaper.id,
      cos_key: signature.cos_key,
      title: completedPaper.title,
      parse_status: completedPaper.parse_status,
    };

    // 当文件解析完成时，立即调用回调
    onFileCompleted?.(file.name, result);

    return result;
  } catch (error: any) {
    if (
      error.message.includes("解析失败") ||
      error.message.includes("等待论文解析完成超时")
    ) {
      const failedResult = {
        id: "",
        cos_key: signature.cos_key,
        title: file.name,
        parse_status: "failed" as const,
        parseError: error.message || "文件解析失败",
      };

      // 即使失败也调用回调，让UI更新状态
      onFileCompleted?.(file.name, failedResult);

      return failedResult;
    }
    throw error;
  }
}
