import fs from "fs";
import path from "path";
import logger from "@/helper/logger";

// 万方检索日志目录
const WANFANG_LOG_DIR = process.env.NODE_ENV === "production"
  ? "/var/logs/ai-library/wanfang"
  : path.join(process.cwd(), "logs", "wanfang");

// 万方检索日志文件路径
const WANFANG_LOG_FILE = path.join(WANFANG_LOG_DIR, "wanfang-search.log");

// 确保日志目录存在
function ensureLogDir(): void {
  try {
    if (!fs.existsSync(WANFANG_LOG_DIR)) {
      fs.mkdirSync(WANFANG_LOG_DIR, { recursive: true });
    }
  } catch (error) {
    logger.error("创建万方日志目录失败:", error);
  }
}

// 格式化日志内容
function formatLogContent(
  endpoint: string,
  request: any,
  response: any | null,
  error: any | null
): string {
  const timestamp = new Date().toISOString();
  const separator = "=".repeat(80);

  let content = `${separator}\n`;
  content += `时间: ${timestamp}\n`;
  content += `接口: ${endpoint}\n`;
  content += `${separator}\n\n`;

  // 请求部分
  content += `【请求内容】\n`;
  content += `URL: ${process.env.WANFANG_API_BASE_URL || "https://api.wanfangdata.com.cn/openwanfang"}${endpoint}\n`;
  content += `Method: POST\n`;
  content += `Headers:\n`;
  content += `  X-Ca-AppKey: ${process.env.WANFANG_APP_KEY || "未配置"}\n`;
  content += `  Content-Type: application/json\n\n`;
  content += `Body:\n`;
  content += JSON.stringify(request, null, 2);
  content += `\n\n`;

  // 响应部分
  if (response) {
    content += `【响应内容】\n`;
    content += `Status: 200\n`;
    content += `Data:\n`;
    content += JSON.stringify(response, null, 2);
    content += `\n\n`;
  }

  // 错误部分
  if (error) {
    content += `【错误信息】\n`;
    content += JSON.stringify(error, null, 2);
    content += `\n\n`;
  }

  return content;
}

// 保存万方检索日志（覆盖模式，只保留最近一次）
export function saveWanfangSearchLog(
  endpoint: string,
  request: any,
  response: any | null = null,
  error: any | null = null
): void {
  try {
    ensureLogDir();

    const logContent = formatLogContent(endpoint, request, response, error);

    // 覆盖写入，只保留最近一次的日志
    fs.writeFileSync(WANFANG_LOG_FILE, logContent, "utf8");

    logger.info(`万方检索日志已保存: ${WANFANG_LOG_FILE}`);
  } catch (err) {
    logger.error("保存万方检索日志失败:", err);
  }
}
