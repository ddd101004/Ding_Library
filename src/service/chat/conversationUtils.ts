/**
 * 根据内容生成会话标题
 * @param content - 消息内容
 * @param maxLength - 最大长度（默认30）
 * @returns 生成的标题
 */
export const generateConversationTitle = (
  content: string,
  maxLength: number = 30
): string => {
  let userContent = content;

  // 处理包含文件内容的情况
  if (content.includes('=== 用户问题 ===')) {
    const parts = content.split('=== 用户问题 ===');
    if (parts.length > 1) {
      userContent = parts[1].trim();
    }
  }

  // 提取纯文本内容（去除文件标记等）
  const cleanContent = userContent
    .replace(/【文件名称】：.*?\n/g, '')
    .replace(/【文件内容】：/g, '')
    .replace(/===.*?===/g, '')
    .replace(/\s+/g, " ")
    .trim();

  // 如果清理后内容为空，使用默认标题
  if (!cleanContent) {
    return "新对话";
  }

  if (cleanContent.length <= maxLength) {
    return cleanContent;
  }

  return cleanContent.slice(0, maxLength) + "...";
};

/**
 * 格式化历史消息中的文件内容显示
 * @param content - 原始消息内容
 * @returns 格式化后的内容
 */
export const formatHistoricalMessageContent = (content: string): string => {
  // 检查是否包含文件内容标记
  if (!content.includes('=== 上传的文件内容 ===')) {
    return content;
  }

  // 提取文件名称
  const fileNameMatch = content.match(/【文件名称】：(.*?)\n/);
  const fileName = fileNameMatch ? fileNameMatch[1] : '未知文件';

  // 提取文件内容（在【文件内容】：和=== 用户问题 ===之间）
  const contentMatch = content.match(/【文件内容】：\n(.*?)(?=\n\n=== 用户问题 ===|$)/s);
  const fileContent = contentMatch ? contentMatch[1].trim() : '';

  // 提取用户问题
  const userQuestionMatch = content.match(/=== 用户问题 ===\n(.*)$/s);
  const userQuestion = userQuestionMatch ? userQuestionMatch[1].trim() : '';

  // 构建格式化后的内容
  let formattedContent = '';

  if (fileName) {
    formattedContent += `上传的文件内容：\n1.文件名称：${fileName}\n`;

    if (fileContent) {
      // 如果文件内容太长，截取并添加省略号
      const displayContent = fileContent.length > 100
        ? fileContent.substring(0, 100) + '...'
        : fileContent;
      formattedContent += `2.文件内容：${displayContent}\n`;
    }
  }

  if (userQuestion) {
    formattedContent += userQuestion;
  }

  return formattedContent || content;
};

/**
 * 格式化消息内容用于显示（处理历史消息中的文件内容）
 * @param content - 原始消息内容
 * @returns 格式化后的显示内容
 */
export const formatMessageForDisplay = (content: string): string => {
  // 检查是否是包含文件内容的消息
  if (content.includes('=== 上传的文件内容 ===')) {
    return formatHistoricalMessageContent(content);
  }

  // 检查是否是新的格式（已经格式化过的）
  if (content.includes('上传的文件内容：\n1.文件名称：')) {
    return content; // 已经是新格式，直接返回
  }

  return content; // 普通消息，直接返回
};