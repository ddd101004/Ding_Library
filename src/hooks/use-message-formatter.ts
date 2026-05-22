/**
 * 消息格式化 Hook — 格式化聊天消息的时间戳和文件内容
 *
 * 核心函数：
 * - getCurrentTime() — 获取当前时间（zh-CN格式，时:分）
 * - formatFileContent(files) — 将文件列表格式化为文本摘要（文件名+内容）
 * - formatMessage(message) — 格式化单条消息，补充formattedTime/formattedFiles/fullContent
 *
 * 使用组件：
 * - ChatConversation — 对话详情页，格式化消息显示时间和文件附件
 * - useConversationData — 加载历史消息时获取时间格式化函数
 */
import { useMemo } from 'react';

interface FileData {
  name?: string;
  type?: string;
  size?: number;
  content?: string;
}

interface FormattedMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  formattedTime: string;
  files?: FileData[];
  formattedFiles?: string;
}

const useMessageFormatter = () => {
  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileContent = (files: FileData[]) => {
    if (!files || files.length === 0) return '';

    return files.reduce((acc, file, index) => {
      const fileInfo = `[文件 ${index + 1}: ${file.name || '未知文件'}]`;
      const fileContent = file.content ? `\n文件内容:\n${file.content}` : '';
      return `${acc}${fileInfo}${fileContent}\n\n`;
    }, '=== 上传的文件内容 ===\n\n');
  };

  const formatMessage = (message: FormattedMessage) => {
    return {
      ...message,
      formattedTime: message.timestamp || getCurrentTime(),
      formattedFiles: message.files ? formatFileContent(message.files) : '',
      fullContent: message.files
        ? `${message.formattedFiles || ''}${message.content}`
        : message.content,
    };
  };

  return useMemo(() => ({ getCurrentTime, formatFileContent, formatMessage }), []);
};

export default useMessageFormatter;