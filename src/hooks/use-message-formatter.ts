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