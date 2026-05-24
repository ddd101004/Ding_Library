/**
 * 全局常量定义
 *
 * 【前后端共用】
 *
 * 导出：
 * - SCORE_NAME — 评分字段名("token")
 * - PRODUCT_NAME — 产品名称
 * - TOKEN_EXPIRE_IN — JWT过期时间("7d")
 * - UNAUTHORIZED_TIPS — 登录过期提示
 * - REGISTER_TYPE — 注册类型("phone")
 * - ACCOUNT_NAME — 账号名称
 * - VERIFICATION_CODE_INTERVAL — 验证码发送间隔(60秒)
 * - CONVERSATION_MAX_TOKENS — 对话最大token数(64000)
 * - MAX_FILE_SIZE — 最大上传文件大小(50MB)
 * - ADMIN_ROLE/USER_ROLE — 角色常量
 * - DEFAULT_RESET_PASSWORD — 管理员重置默认密码
 * - PDFJS_CMAP_URL/PDFJS_STANDARD_FONT_DATA_URL — PDF.js资源URL
 */
export const SCORE_NAME = "token";
export const PRODUCT_NAME = "AI Library";

// 用户token有效期
export const TOKEN_EXPIRE_IN = "7d";

// 登录信息过期提示
export const UNAUTHORIZED_TIPS = "登录信息已过期,请重新登录";

// 用户注册类型  手机号
export const REGISTER_TYPE = "phone";

// 账号名称
export const ACCOUNT_NAME = "手机";

export const VERIFICATION_CODE_INTERVAL = 60; // 验证码发送间隔(秒)
export const VERIFICATION_CODE_MAX_COUNT_PER_MINUTE = 5; // 每分钟内最大发送次数

// 对话最大支持的 token 数
export const CONVERSATION_MAX_TOKENS = 64000;

// 文件上传大小限制
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

// PDF.js CMap 文件 URL（用于支持 CJK 字符正确显示）
export const PDFJS_CMAP_URL = "https://public.century-cloud.com/cmaps/";

// PDF.js 标准字体 URL（用于支持 PDF 标准 14 字体的正确显示和文本选择）
export const PDFJS_STANDARD_FONT_DATA_URL =
  "https://public.century-cloud.com/standard_fonts/";

// 用户角色
export const ADMIN_ROLE = "admin";
export const USER_ROLE = "user";

// 管理员重置默认密码
export const DEFAULT_RESET_PASSWORD = process.env.DEFAULT_RESET_PASSWORD || "Aa123456";
