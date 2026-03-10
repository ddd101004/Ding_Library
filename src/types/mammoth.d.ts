/**
 * mammoth 类型声明
 *
 * mammoth 是一个用于从 .docx 文件中提取文本的库
 * 官方文档：https://www.npmjs.com/package/mammoth
 */

declare module 'mammoth' {
  /**
   * 提取结果
   */
  interface ExtractResult {
    value: string;        // 提取的文本内容
    messages: Message[];  // 提取过程中的消息
  }

  /**
   * 提取消息
   */
  interface Message {
    type: 'error' | 'warning' | 'info';
    message: string;
  }

  /**
   * 提取选项
   */
  interface ExtractOptions {
    arrayBuffer?: ArrayBuffer;  // Word 文件的 ArrayBuffer
    path?: string;              // Word 文件路径
  }

  /**
   * mammoth 对象
   */
  interface Mammoth {
    /**
     * 提取纯文本
     */
    extractRawText(options: ExtractOptions): Promise<ExtractResult>;

    /**
     * 转换为 HTML
     */
    convertToHtml(options: ExtractOptions): Promise<ExtractResult>;

    /**
     * 转换为 Markdown
     */
    convertToMarkdown(options: ExtractOptions): Promise<ExtractResult>;
  }

  const mammoth: Mammoth;
  export default mammoth;
}
