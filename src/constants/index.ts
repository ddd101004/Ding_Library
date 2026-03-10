export const SCORE_NAME = "token";
export const PRODUCT_NAME = "Lingang Library";

// 用户token有效期
export const TOKEN_EXPIRE_IN = "7d";

// 登录信息过期提示
export const UNAUTHORIZED_TIPS = "登录信息已过期,请重新登录";

// 用户注册类型  手机号
export const REGISTER_TYPE = "phone";

// 账号名称
export const ACCOUNT_NAME = "手机";

export const VERIFICATION_CODE_INTERVAL = 60; // 验证码发送间隔(秒)

// 对话最大支持的 token 数
export const CONVERSATION_MAX_TOKENS = 64000;

// 文件上传大小限制
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

// COS 签名 URL 默认过期时间（7天，单位：秒）
export const COS_URL_EXPIRES = 7 * 24 * 60 * 60;

// PDF.js CMap 文件 URL（用于支持 CJK 字符正确显示）
export const PDFJS_CMAP_URL = "https://public.century-cloud.com/cmaps/";

// PDF.js 标准字体 URL（用于支持 PDF 标准 14 字体的正确显示和文本选择）
export const PDFJS_STANDARD_FONT_DATA_URL =
  "https://public.century-cloud.com/standard_fonts/";
