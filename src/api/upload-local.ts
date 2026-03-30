import { apiPost } from "@/api/request";

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
 * 本地文件上传流程
 *
 * 步骤：直接上传文件到本地服务器 → 创建数据库记录
 *
 * @param file 文件对象
 * @param onProgress 进度回调
 * @param onFileCompleted 文件完成回调
 */
export async function uploadFileToLocal(
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
  onProgress?.(20);

  // 步骤1: 准备 FormData
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", file.name);

  try {
    onProgress?.(40);

   const response = await apiPost<CreateAiReadingPaperResponse>(
    "/api/uploaded-papers",
    formData
  );

    onProgress?.(80);

    if (!response.data) {
      throw new Error("未获取到论文记录信息");
    }

    const { id, title, parse_status } = response.data;

    onProgress?.(100);

    const result = {
      id,
      cos_key: id || "", // 兼容旧字段
      title: title || file.name,
      parse_status: parse_status || "pending",
    };

    // 文件上传完成时调用回调
    onFileCompleted?.(file.name, result);

    return result;
  } catch (error: any) {
    console.error("文件上传失败:", error);

    const failedResult = {
      id: "",
      cos_key: "",
      title: file.name,
      parse_status: "failed" as const,
      parseError: error.message || "文件上传失败",
    };

    // 即使失败也调用回调，让UI更新状态
    onFileCompleted?.(file.name, failedResult);

    return failedResult;
  }
}
