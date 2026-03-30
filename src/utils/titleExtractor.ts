/**
 * 从混合标题中提取英文部分
 * 例如：从 "中文标题 English Title" 或 "日本語タイトル English Title" 中提取 "English Title"
 *
 * @param title - 混合标题
 * @returns 英文部分，如果未找到则返回原标题
 */
export function extractEnglishTitle(title: string): string {
  if (!title) {
    return "";
  }

  // 查找第一个连续的大写英文字母开头的词，这通常是英文标题的开始
  // 匹配模式：空格后跟大写字母，或者字符串开头就是大写字母（且后续包含更多英文单词）
  const patterns = [
    // 模式1：查找空格后跟大写字母的位置（最常见的情况）
    /\s+[A-Z][a-zA-Z\s\-\.]*/,
    // 模式2：如果整个标题以大写字母开头且没有中文/日文字符，可能是纯英文
    /^[A-Z][a-zA-Z\s\-\.]*$/,
  ];

  // 首先尝试查找空格后的英文部分
  const match = title.match(/\s+([A-Z][a-zA-Z0-9\s\-\'\.\,\:\;\(\)]+)(?:\s*$)/);

  if (match && match[1]) {
    const extracted = match[1].trim();
    // 验证提取的内容确实包含足够的英文字符（至少3个字母）
    const letterCount = (extracted.match(/[a-zA-Z]/g) || []).length;
    if (letterCount >= 3) {
      return extracted;
    }
  }

  // 如果没有找到空格分隔的英文，尝试直接查找大写字母开头的连续英文
  const directMatch = title.match(/[A-Z][a-zA-Z0-9\s\-\'\.\,\:\;\(\)]{10,}/);
  if (directMatch) {
    return directMatch[0].trim();
  }

  // 如果都失败了，返回原标题
  return title;
}

/**
 * 判断标题是否包含英文部分
 *
 * @param title - 标题
 * @returns 是否包含英文
 */
export function hasEnglishTitle(title: string): boolean {
  if (!title) {
    return false;
  }
  // 检查是否包含英文字母（至少3个）
  const letterCount = (title.match(/[a-zA-Z]/g) || []).length;
  return letterCount >= 3;
}
