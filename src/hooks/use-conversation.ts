/**
 * 对话创建与跳转 Hook — 从聊天主页创建新对话并跳转到对话详情页
 *
 * 核心函数：
 * - handleSendMessage(params) — 创建新对话API，保存文件到sessionStorage，跳转到对话详情页
 *   params包含：inputText(输入文本)、uploadedFiles(上传文件)、isDeepThinkActive(深度思考)、
 *   isPaperSearchActive(论文搜索)、currentFunction(功能类型)、formatFileContent(文件格式化)、saveFilesToSession(文件存储)
 * - isSending — 是否正在发送（创建对话）
 *
 * 使用组件：
 * - ChatHome — 聊天主页，发送消息时创建新对话并跳转
 * - ChatConversation — 对话详情页，发送初始消息时创建对话
 * - CheckedChat — 已选对话页，发送消息时创建对话
 */
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
      toast.warning("请输入消息内容");
      return;
    }

    setIsSending(true);
    try {
      //   ? `${fileContent}${inputText.trim()}`
      //   : inputText.trim();
      // 保持为纯用户输入内容
      const fullContent = inputText.trim();

      // 创建新对话
      const requestBody: any = {
        is_deep_think: isDeepThinkActive,
      };


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