import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { apiGet, apiPost } from "@/api/request";
import { toast } from "sonner";
import {
  getPaperPdfUrl,
  PaperInfoFromAPI,
} from "@/service/ai-reading/paperUrlService";
import { AIOperation, SelectionContext } from "@/components/ai-reading/types";
import { Message } from "@/components/chat/ChatSplitLayout";

/**
 * AI 伴读特有功能 Hook
 * 处理 PDF 查看、论文标注、AI 操作、文件管理等功能
 */
export function useAiReadingFeatures() {
  const router = useRouter();

  // 论文信息管理
  const [paperInfo, setPaperInfo] = useState<any>(null);
  const [currentPdfInfo, setCurrentPdfInfo] = useState<PaperInfoFromAPI | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // 文件管理
  const [allUploadedFiles, setAllUploadedFiles] = useState<any[]>([]);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [aiReadingFiles, setAiReadingFiles] = useState<any[]>([]);

  // 标注管理
  const [paperAnnotations, setPaperAnnotations] = useState<Record<string, any[]>>({});

  // 引用内容
  const [citationContent, setCitationContent] = useState<string | null>(null);

  // Refs
  const isCreatingConversationRef = useRef(false);
  const conversationIdRef = useRef<string | null>(null);
  const isLoadingHistoryRef = useRef<string | null>(null);

  /**
   * 初始化文件列表 - 从 sessionStorage 加载
   * 注意：这个逻辑现在由 useAiReadingConversationData 接管，这里只做初始化
   */
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const aiReadingFilesStr = sessionStorage.getItem("aiReadingFiles");
        if (aiReadingFilesStr) {
          const files = JSON.parse(aiReadingFilesStr);
          // 只在初始化时设置，不要覆盖已有数据
          if (allUploadedFiles.length === 0) {
            setAllUploadedFiles(files);
          }
          setAiReadingFiles(files);
        } else {
          const transferredFiles = sessionStorage.getItem("transferredFiles_home");
          if (transferredFiles) {
            const files = JSON.parse(transferredFiles);
            // 只在初始化时设置，不要覆盖已有数据
            if (allUploadedFiles.length === 0) {
              setAllUploadedFiles(files);
            }
            sessionStorage.setItem("aiReadingFiles", JSON.stringify(files));
          }
        }
      } catch (error) {
        console.error("加载文件列表失败:", error);
      }
    }
  }, []);

  /**
   * 监听 AI 伴读文件变化
   * 注意：这个轮询逻辑可能与 useAiReadingConversationData 冲突，需要谨慎处理
   */
  useEffect(() => {
    const loadAiReadingFiles = () => {
      const filesStr = sessionStorage.getItem("aiReadingFiles");
      if (filesStr) {
        try {
          const files = JSON.parse(filesStr);
          console.log("AI伴读 - 从 sessionStorage 加载文件列表:", files.length, "个文件");
          setAiReadingFiles(files);
          // 不要在这里覆盖 allUploadedFiles，由 useAiReadingConversationData 管理
          // setAllUploadedFiles(files);
        } catch (error) {
          console.error("解析AI伴读文件失败:", error);
        }
      }
    };

    loadAiReadingFiles();

    const interval = setInterval(() => {
      const currentFilesStr = sessionStorage.getItem("aiReadingFiles");
      if (currentFilesStr) {
        try {
          const currentFiles = JSON.parse(currentFilesStr);
          setAiReadingFiles((prev) => {
            if (JSON.stringify(prev) !== currentFilesStr) {
              // 不要在这里覆盖 allUploadedFiles，由 useAiReadingConversationData 管理
              // setAllUploadedFiles(currentFiles);
              return currentFiles;
            }
            return prev;
          });
        } catch (error) {
          console.error("解析文件列表失败:", error);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * 加载论文标注
   */
  const loadPaperAnnotations = useCallback(async (paperId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return [];
      }

      const response = await apiGet("/api/ai-reading/annotations", {
        params: {
          uploaded_paper_id: paperId,
          page: 1,
          size: 1000,
        },
      });

      if (response.code === 200 && response.data?.items) {
        const annotations = response.data.items;

        const highlightAreas = annotations
          .map((annotation: any) => {
            let positionData = annotation.positionJson || annotation.position_json;

            if (positionData) {
              let positions = [];

              if (typeof positionData === "string") {
                try {
                  positions = JSON.parse(positionData);
                } catch (e) {
                  return [];
                }
              } else if (Array.isArray(positionData)) {
                positions = positionData;
              }

              const areas = positions.map((pos: any) => {
                const pageIndex = pos.page_index !== undefined
                  ? pos.page_index
                  : pos.page_number
                  ? pos.page_number - 1
                  : 0;

                return {
                  pageIndex: Math.max(0, pageIndex),
                  left: parseFloat(pos.left) || 0,
                  top: parseFloat(pos.top) || 0,
                  width: parseFloat(pos.width) || 0,
                  height: parseFloat(pos.height) || 0,
                  color: annotation.color === "blue"
                    ? "rgba(59, 130, 246, 0.3)"
                    : annotation.color === "yellow"
                    ? "rgba(251, 191, 36, 0.3)"
                    : "rgba(59, 130, 246, 0.3)",
                };
              });
              return areas;
            }
            return [];
          })
          .filter((areas: any[]) => areas.length > 0)
          .flat();

        setPaperAnnotations((prev) => ({
          ...prev,
          [paperId]: highlightAreas,
        }));

        return highlightAreas;
      }
      return [];
    } catch (error) {
      console.error("[标注加载失败]", error);
      return [];
    }
  }, []);

  /**
   * 加载文件 PDF 信息
   */
  const loadFilePdfInfo = useCallback(async (fileId: string) => {
    if (!fileId) {
      console.warn("文件ID为空，无法加载PDF信息");
      return;
    }

    setIsPdfLoading(true);
    try {
      const pdfInfo = await getPaperPdfUrl(fileId);
      if (pdfInfo) {
        setCurrentPdfInfo(pdfInfo);
      } else {
        console.error("PDF信息加载失败");
        setCurrentPdfInfo(null);
        toast.error("文件PDF信息加载失败");
      }
    } catch (error) {
      console.error("加载PDF信息异常:", error);
      setCurrentPdfInfo(null);
      toast.error("加载文件PDF信息失败");
    } finally {
      setIsPdfLoading(false);
    }
  }, []);

  /**
   * 当文件列表加载完成后，自动加载第一个文件的 PDF 信息
   */
  useEffect(() => {
    // 只有当没有正在加载 PDF 且没有 PDF 信息时才自动加载
    if (allUploadedFiles.length > 0 && !isPdfLoading && !currentPdfInfo) {
      const firstFile = allUploadedFiles[0];
      const fileId = firstFile.uploadedPaperId || firstFile.fileId;

      if (fileId) {
        console.log("AI伴读 - 自动加载第一个文件的 PDF 信息:", fileId);
        loadFilePdfInfo(fileId);
      }
    }
  }, [allUploadedFiles, isPdfLoading, currentPdfInfo, loadFilePdfInfo]);

  /**
   * 切换文件
   */
  const handleFileSwitch = useCallback(async (fileIndex: number) => {
    if (fileIndex < 0 || fileIndex >= allUploadedFiles.length) {
      console.warn("无效的文件索引:", fileIndex);
      return;
    }

    const selectedFile = allUploadedFiles[fileIndex];
    const fileId = selectedFile.uploadedPaperId || selectedFile.fileId;

    if (!fileId) {
      console.error("文件缺少ID:", selectedFile);
      toast.error("文件信息不完整，无法切换");
      return;
    }

    setSelectedFileIndex(fileIndex);
    await loadFilePdfInfo(fileId);

    if (!paperAnnotations[fileId]) {
      await loadPaperAnnotations(fileId);
    }
  }, [allUploadedFiles, loadFilePdfInfo, loadPaperAnnotations, paperAnnotations]);

  /**
   * 清除引用内容
   */
  const clearCitation = useCallback(() => {
    setCitationContent(null);
  }, []);

  /**
   * 处理高亮标注
   */
  const handleHighlightAnnotation = useCallback(async (
    highlightData: {
      text: string;
      pageNumber: number;
      positionJson: object;
      areas: any[];
    },
    uploadedPaperId: string,
    getToken: () => string | null
  ) => {
    try {
      if (!uploadedPaperId) {
        toast.error("缺少论文信息，无法保存标注");
        return;
      }

      const token = getToken();
      if (!token) {
        toast.error("用户未登录，无法保存标注");
        return;
      }

      const response = await apiPost("/api/ai-reading/annotations", {
        uploaded_paper_id: uploadedPaperId,
        annotation_text: highlightData.text,
        annotation_type: "highlight",
        color: "blue",
        page_number: highlightData.pageNumber,
        position_json: highlightData.positionJson,
      });

      if (response.code === 200) {
        const newHighlightAreas = (highlightData.positionJson as any[]).map(
          (pos: any) => ({
            pageIndex: pos.page_index || pos.page_number - 1,
            left: pos.left,
            top: pos.top,
            width: pos.width,
            height: pos.height,
            color: "rgba(59, 130, 246, 0.3)",
          })
        );

        setPaperAnnotations((prev) => ({
          ...prev,
          [uploadedPaperId]: [
            ...(prev[uploadedPaperId] || []),
            ...newHighlightAreas,
          ],
        }));
      } else {
        throw new Error(response.message || "保存标亮失败");
      }
    } catch (error: any) {
      console.error("[标注保存失败]", error);
    }
  }, []);

  /**
   * 返回 ChatHome 并清理 AI 伴读相关数据
   */
  const handleBackToChat = useCallback(() => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("aiReadingFiles");
      sessionStorage.removeItem("aiReadingConversationId");
    }

    router.push("/chat");
  }, [router]);

  /**
   * 处理关闭 AI 伴读功能
   */
  const handleCloseAiReading = useCallback(() => {
    clearCitation();
    handleBackToChat();
  }, [clearCitation, handleBackToChat]);

  /**
   * 根据 paperId 加载论文信息
   */
  const loadPaperInfoById = useCallback(async (paperId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("用户未登录");
      }

      const response = await apiGet("/api/ai-reading/papers/" + paperId);

      if (response.code === 200 && response.data) {
        const paper = response.data;

        const paperData = {
          id: paper.id,
          title: paper.title,
          authors: paper.authors || [],
          abstract: paper.abstract || "",
          keywords: paper.keywords || [],
          file_name: paper.file_name,
          file_size: paper.file_size,
          file_type: paper.file_type,
          parse_status: paper.parse_status,
          parsed_content: paper.parsed_content || "",
          page_count: paper.page_count,
          word_count: paper.word_count,
          file_url: paper.file_url,
        };

        setPaperInfo(paperData);

        // 设置 PDF 信息
        if (paperData.file_url) {
          setCurrentPdfInfo({
            id: paperData.id,
            file_url: paperData.file_url,
          } as any);
        }

        // 创建文件对象并添加到文件列表
        const fileData = {
          uploadedPaperId: paper.id,
          fileId: paper.id,
          fileName: paper.file_name,
          name: paper.title,
          file: {
            name: paper.file_name,
            size: paper.file_size,
            type: paper.file_type,
          },
          content: paper.parsed_content || "",
          fileUrl: paper.file_url,
        };

        setAllUploadedFiles([fileData]);
        setSelectedFileIndex(0);

        // 存储到 sessionStorage
        if (typeof window !== "undefined") {
          sessionStorage.setItem("aiReadingFiles", JSON.stringify([fileData]));
        }

        console.log("AI伴读 - 论文信息加载成功:", paperData);
        return paperData;
      } else {
        throw new Error(response.message || "加载论文信息失败");
      }
    } catch (error: any) {
      console.error("加载论文信息失败:", error);
      toast.error(error.message || "加载论文信息失败");
      return null;
    }
  }, [setPaperInfo, setCurrentPdfInfo, setAllUploadedFiles, setSelectedFileIndex]);

  return {
    // 状态
    paperInfo,
    setPaperInfo,
    currentPdfInfo,
    setCurrentPdfInfo,
    isPdfLoading,
    allUploadedFiles,
    setAllUploadedFiles,
    selectedFileIndex,
    setSelectedFileIndex,
    paperAnnotations,
    setPaperAnnotations,
    citationContent,
    setCitationContent,
    aiReadingFiles,
    setAiReadingFiles,

    // Refs
    isCreatingConversationRef,
    conversationIdRef,
    isLoadingHistoryRef,

    // 方法
    loadPaperAnnotations,
    loadFilePdfInfo,
    loadPaperInfoById,
    handleFileSwitch,
    clearCitation,
    handleHighlightAnnotation,
    handleBackToChat,
    handleCloseAiReading,
  };
}
