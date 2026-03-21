import { createLogger, format, transports } from "winston";
import fs from "fs";
import DailyRotateFile from "winston-daily-rotate-file";

const logDirectory =
  process.env.NODE_ENV === "production" ? "/var/logs/ai-library" : "logs";

// 检查日志目录是否存在，如果不存在则创建
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
    format.printf((info) => `${JSON.stringify(info)}\n`) // 添加换行符
  ),
  defaultMeta: { service: "ai-library" },
  transports: [
    // 使用日志轮转，自动管理日志文件大小和数量
    new DailyRotateFile({
      filename: `${logDirectory}/%DATE%-combined.log`,
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "14d",
    }),
    new DailyRotateFile({
      filename: `${logDirectory}/%DATE%-error.log`,
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    })
  );
}

export default logger;
