import { apiGet } from "@/api/request";

/**
 * 论文信息类型定义（对应后端API返回）
 */
export interface PaperInfoFromAPI {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  keywords: string[];
  publication_year: number | null;
  source: string;
  doi: string;
  file_url: string; // PDF文件的签名URL
  cos_key: string;
  file_name: string;
  file_size: number;
  file_type: string;
  mime_type: string;
  original_file_type?: string;
  parse_status: string;
  page_count: number | null;
  word_count: number | null;
  parse_error: string;
  parsed_at: Date | null;
  read_count: number;
  conversation_count: number;
  annotation_count: number;
  citation_count: number;
  last_read_at: Date;
  create_time: Date;
  update_time: Date;
}

/**
 * 获取论文的PDF文件URL和信息
 * @param paperId 论文ID
 * @returns Promise<PaperInfoFromAPI | null>
 */
export async function getPaperPdfUrl(paperId: string): Promise<PaperInfoFromAPI | null> {
  try {
    const response = await apiGet<PaperInfoFromAPI>(`/api/ai-reading/papers/${paperId}`);

    if (response?.code === 200 && response.data) {
      return response.data;
    } else {
      console.error("获取论文PDF URL失败:", response?.message || "未知错误");
      return null;
    }
  } catch (error) {
    console.error("获取论文PDF URL异常:", error);
    return null;
  }
}