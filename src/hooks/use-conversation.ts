import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiPost } from '@/api/request';
import { FileWithContent } from '@/types/file';
import { toast } from 'sonner';

interface SendMessageParams {
  inputText: string;
  uploadedFiles: FileWithContent[];
  isDeepThinkActive: boolean;
  isPaperSearchActive?: boolean;
  currentFunction?: string | null;
  formatFileContent: (files: FileWithContent[]) => string;
  saveFilesToSession: (files: FileWithContent[]) => void;
}

export const useConversation = () => {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = useCallback(async ({
    inputText,
    uploadedFiles,
    isDeepThinkActive,
    isPaperSearchActive,
    currentFunction,
    formatFileContent,
    saveFilesToSession
  }: SendMessageParams) => {
    // 检查输入文本是否为空
    if (!inputText.trim()) {
      toast.warning("输入框不能为空，请输入消息内容");
      return;
    }

    setIsSending(true);
    try {
      // 注意：根据要求，不再拼接文件内容到content中，文件内容通过attachment_ids传递
      // const fileContent = formatFileContent(uploadedFiles);
      // const fullContent = fileContent
      //   ? `${fileContent}${inputText.trim()}`
      //   : inputText.trim();
      // 保持为纯用户输入内容
      const fullContent = inputText.trim();

      // 创建新对话
      const requestBody: any = {
        is_deep_think: isDeepThinkActive,
      };

      // 如果是AI伴读功能，需要添加AI伴读相关的字段
      if (currentFunction === "aiReading") {
        // AI伴读模式下，收集所有文件的 uploadedPaperId
        const paperIds = uploadedFiles
          .filter((file) => file.uploadedPaperId)
          .map((file) => file.uploadedPaperId);

        if (paperIds.length > 0) {
          requestBody.uploaded_paper_ids = paperIds;
          requestBody.conversation_type = "paper_reading";
          requestBody.context_mode = "auto";
        }
      }

      const createRes = await apiPost("/api/chat/conversations", requestBody);

      if (createRes.code !== 200) {
        throw new Error(`创建对话失败: ${createRes.message}`);
      }

      const responseData = createRes;

      if (responseData.code !== 200) {
        throw new Error(`创建对话失败: ${responseData.message || "未知错误"}`);
      }

      if (!responseData.data?.conversation_id) {
        throw new Error("创建对话失败: 缺少对话ID");
      }

      const conversationId = responseData.data.conversation_id;

      // 保存文件到sessionStorage
      saveFilesToSession(uploadedFiles);

      // 根据功能类型选择跳转路径
      let pathname = "/chatconversation";

      // 如果是AI伴读功能，跳转到AI伴读页面
      if (currentFunction === "aiReading") {
        pathname = "/ai-reading-chat";
      }

      // 跳转到对话页面
      router.push({
        pathname: pathname,
        query: {
          conversationId: conversationId,
          initialMessage: fullContent,
          userDisplayMessage: inputText.trim(),
          hasFiles: uploadedFiles.length > 0,
          fileCount: uploadedFiles.length,
          functionType: currentFunction,
          isDeepThink: isDeepThinkActive,
          isPaperSearch: isPaperSearchActive ? "true" : "false",
        },
      });
    } catch (error) {
      console.error("发送失败:", error);
      toast.error("创建对话失败，请重试");
    } finally {
      setIsSending(false);
    }
  }, [router]);

  return {
    handleSendMessage,
    isSending
  };
};