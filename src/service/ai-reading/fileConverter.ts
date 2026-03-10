/**
 * 文件转换服务
 *
 * 使用 LibreOffice 将 DOCX、TXT 等文件转换为 PDF 格式
 * 支持本地文件和 COS 文件的转换
 */

import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import logger from "@/helper/logger";
import { downloadFile } from "@/lib/cos/cosClient";

// libreoffice-convert 是 CommonJS 模块，需要使用 require
// eslint-disable-next-line @typescript-eslint/no-require-imports
const libreofficeConvert = require("libreoffice-convert");

// 将 callback 风格转换为 Promise (使用 convertWithOptions 以支持自定义路径)
const convertWithOptionsAsync = promisify(libreofficeConvert.convertWithOptions);

/**
 * LibreOffice 二进制文件路径配置
 * 支持各平台安装路径
 */
const SOFFICE_BINARY_PATHS = [
  // Alpine Linux (Docker 容器)
  "/usr/bin/soffice",
  "/usr/bin/libreoffice",
  // Homebrew 安装路径 (Apple Silicon)
  "/opt/homebrew/bin/soffice",
  // Homebrew 安装路径 (Intel Mac)
  "/usr/local/bin/soffice",
  // macOS 标准安装路径
  "/Applications/LibreOffice.app/Contents/MacOS/soffice",
  // Linux 其他路径
  "/snap/bin/libreoffice",
  "/opt/libreoffice/program/soffice",
  // Windows 路径
  "C:/Program Files/LibreOffice/program/soffice.exe",
  "C:/Program Files (x86)/LibreOffice/program/soffice.exe",
];

// ==================== 类型定义 ====================

/**
 * 转换结果
 */
export interface ConversionResult {
  success: boolean;
  pdfBuffer?: Buffer; // 转换后的 PDF 数据
  pdfPath?: string; // 保存的 PDF 文件路径（如果指定了输出路径）
  error?: string;
}

/**
 * 转换选项
 */
export interface ConversionOptions {
  timeout?: number; // 超时时间（毫秒），默认 120000 (2分钟)
  outputPath?: string; // 输出文件路径（可选）
}

// ==================== 支持的转换格式 ====================

/**
 * 支持转换为 PDF 的文件类型
 * LibreOffice 支持 DOCX、DOC、TXT 转换为 PDF
 */
export const CONVERTIBLE_TYPES = ["docx", "doc", "txt"] as const;
export type ConvertibleType = (typeof CONVERTIBLE_TYPES)[number];

/**
 * 检查文件类型是否需要转换
 *
 * @param fileType - 文件类型
 * @returns 是否需要转换（PDF 不需要转换，DOCX 和 TXT 需要转换）
 */
export function needsConversion(fileType: string): boolean {
  const normalizedType = fileType.toLowerCase();
  return CONVERTIBLE_TYPES.includes(normalizedType as ConvertibleType);
}

/**
 * 检查文件类型是否支持转换
 *
 * @param fileType - 文件类型
 * @returns 是否支持
 */
export function isConvertibleType(fileType: string): boolean {
  return CONVERTIBLE_TYPES.includes(fileType.toLowerCase() as ConvertibleType);
}

// ==================== 核心转换函数 ====================

/**
 * 将文件转换为 PDF（通过文件路径）
 *
 * @param inputPath - 输入文件路径
 * @param options - 转换选项
 * @returns 转换结果
 */
export async function convertToPdf(
  inputPath: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const { timeout = 120000, outputPath } = options;

  try {
    // 检查输入文件是否存在
    if (!fs.existsSync(inputPath)) {
      return {
        success: false,
        error: "输入文件不存在",
      };
    }

    // 读取输入文件
    const inputBuffer = fs.readFileSync(inputPath);

    logger.info("开始文件转换", {
      inputPath: path.basename(inputPath),
      inputSize: inputBuffer.length,
      timeout,
    });

    // 执行转换
    // libreoffice-convert 的 convertWithOptions 函数参数：
    // convertWithOptions(inputBuffer, outputFormat, filterName, options, callback)
    // 对于 PDF 转换，outputFormat 是 '.pdf'
    const pdfBuffer = await convertWithOptionsAsync(inputBuffer, ".pdf", undefined, {
      sofficeBinaryPaths: SOFFICE_BINARY_PATHS,
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        success: false,
        error: "转换结果为空",
      };
    }

    logger.info("文件转换成功", {
      inputPath: path.basename(inputPath),
      outputSize: pdfBuffer.length,
    });

    // 如果指定了输出路径，保存文件
    if (outputPath) {
      fs.writeFileSync(outputPath, pdfBuffer);
      return {
        success: true,
        pdfBuffer,
        pdfPath: outputPath,
      };
    }

    return {
      success: true,
      pdfBuffer,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // 提供更详细的错误提示
    let detailedError = `转换失败: ${errorMessage}`;

    if (errorMessage.includes("Could not find soffice binary")) {
      detailedError = "转换失败: 未找到 LibreOffice，请确保已安装 LibreOffice 并配置正确的路径";
    } else if (
      errorMessage.includes("Could not find platform independent libraries") ||
      errorMessage.includes("Document is empty")
    ) {
      detailedError =
        "转换失败: LibreOffice 配置异常，请检查 LibreOffice 安装完整性或尝试重新安装";
    }

    logger.error("文件转换失败", {
      inputPath: path.basename(inputPath),
      error: errorMessage,
      platform: process.platform,
    });

    return {
      success: false,
      error: detailedError,
    };
  }
}

/**
 * 将 Buffer 数据转换为 PDF
 *
 * @param inputBuffer - 输入文件 Buffer
 * @param options - 转换选项
 * @returns 转换结果
 */
export async function convertBufferToPdf(
  inputBuffer: Buffer,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  const { timeout = 120000, outputPath } = options;

  try {
    if (!inputBuffer || inputBuffer.length === 0) {
      return {
        success: false,
        error: "输入数据为空",
      };
    }

    logger.info("开始 Buffer 转换", {
      inputSize: inputBuffer.length,
      timeout,
    });

    // 执行转换
    const pdfBuffer = await convertWithOptionsAsync(inputBuffer, ".pdf", undefined, {
      sofficeBinaryPaths: SOFFICE_BINARY_PATHS,
    });

    if (!pdfBuffer || pdfBuffer.length === 0) {
      return {
        success: false,
        error: "转换结果为空",
      };
    }

    logger.info("Buffer 转换成功", {
      outputSize: pdfBuffer.length,
    });

    // 如果指定了输出路径，保存文件
    if (outputPath) {
      fs.writeFileSync(outputPath, pdfBuffer);
      return {
        success: true,
        pdfBuffer,
        pdfPath: outputPath,
      };
    }

    return {
      success: true,
      pdfBuffer,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Buffer 转换失败", {
      error: errorMessage,
    });

    return {
      success: false,
      error: `转换失败: ${errorMessage}`,
    };
  }
}

// ==================== COS 文件转换 ====================

/**
 * 从 COS 下载文件并转换为 PDF
 *
 * @param cosKey - COS 对象 key
 * @param fileType - 文件类型
 * @returns 转换结果（包含 PDF Buffer）
 */
export async function convertFromCos(
  cosKey: string,
  fileType: string
): Promise<ConversionResult> {
  // 生成临时文件路径
  const tempDir = os.tmpdir();
  const tempInputPath = path.join(tempDir, `convert_input_${uuidv4()}.${fileType}`);
  const tempOutputPath = path.join(tempDir, `convert_output_${uuidv4()}.pdf`);

  logger.info("开始从 COS 下载文件进行转换", {
    cosKey,
    fileType,
    tempInputPath,
  });

  try {
    // 从 COS 下载文件
    const downloaded = await downloadFile(cosKey, tempInputPath);

    if (!downloaded) {
      return {
        success: false,
        error: "从 COS 下载文件失败",
      };
    }

    // 验证文件是否成功下载
    if (!fs.existsSync(tempInputPath)) {
      return {
        success: false,
        error: "下载的文件不存在",
      };
    }

    // 执行转换
    const result = await convertToPdf(tempInputPath, {
      outputPath: tempOutputPath,
    });

    if (!result.success) {
      return result;
    }

    // 读取转换后的 PDF
    const pdfBuffer = fs.readFileSync(tempOutputPath);

    logger.info("COS 文件转换完成", {
      cosKey,
      pdfSize: pdfBuffer.length,
    });

    return {
      success: true,
      pdfBuffer,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("COS 文件转换失败", {
      cosKey,
      fileType,
      error: errorMessage,
    });

    return {
      success: false,
      error: `转换失败: ${errorMessage}`,
    };
  } finally {
    // 清理临时文件
    try {
      if (fs.existsSync(tempInputPath)) {
        fs.unlinkSync(tempInputPath);
      }
      if (fs.existsSync(tempOutputPath)) {
        fs.unlinkSync(tempOutputPath);
      }
      logger.info("已清理临时转换文件", {
        tempInputPath,
        tempOutputPath,
      });
    } catch (cleanupError: unknown) {
      const errorMsg = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      logger.warn("清理临时转换文件失败", {
        error: errorMsg,
      });
    }
  }
}

/**
 * TXT 文件特殊处理：转换编码并生成 PDF
 *
 * 对于 TXT 文件，LibreOffice 可能无法正确识别中文编码
 * 此函数会尝试检测编码并转换为 UTF-8
 *
 * @param txtPath - TXT 文件路径
 * @param options - 转换选项
 * @returns 转换结果
 */
export async function convertTxtToPdf(
  txtPath: string,
  options: ConversionOptions = {}
): Promise<ConversionResult> {
  try {
    // 读取文件内容
    let content = fs.readFileSync(txtPath, "utf-8");

    // 对于 TXT，先保存为 UTF-8 编码的临时文件
    const tempDir = os.tmpdir();
    const tempTxtPath = path.join(tempDir, `txt_utf8_${uuidv4()}.txt`);

    // 写入 UTF-8 格式
    fs.writeFileSync(tempTxtPath, content, "utf-8");

    // 转换为 PDF
    const result = await convertToPdf(tempTxtPath, options);

    // 清理临时文件
    try {
      if (fs.existsSync(tempTxtPath)) {
        fs.unlinkSync(tempTxtPath);
      }
    } catch {
      // 忽略清理错误
    }

    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `TXT 转换失败: ${errorMessage}`,
    };
  }
}
