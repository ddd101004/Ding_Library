/**
 * 字符串长度校验工具
 * 用于 API 接口的用户输入校验
 */

/**
 * 默认长度限制配置
 * 注意：所有长度限制必须小于等于数据库对应字段的长度
 */
export const STRING_LIMITS = {
  // 认证相关 (参考: User 表)
  phone: { min: 11, max: 11 }, // 手机号固定 11 位
  password: { min: 6, max: 50 }, // 密码
  verification_code: { min: 4, max: 6 }, // 验证码 (db: VarChar(255))
  username: { min: 1, max: 50 }, // 用户名 (db: String, 默认 191)
  nickname: { min: 1, max: 50 }, // 昵称 (db: VarChar(50))
  email: { min: 5, max: 100 }, // 邮箱 (db: VarChar(100))

  // 搜索相关 (参考: SearchHistory 表)
  keyword: { min: 1, max: 100 }, // 搜索关键词 (db: VarChar(100))
  search_type: { min: 1, max: 20 }, // 搜索类型 (db: VarChar(20))

  // 聊天相关 (参考: ChatConversation, ChatMessage 表)
  message_content: { min: 1, max: 50000 }, // 消息内容 (db: LongText)
  conversation_title: { min: 0, max: 255 }, // 对话标题 (db: VarChar(255))
  model: { min: 1, max: 50 }, // 模型名称 (db: VarChar(50))
  conversation_type: { min: 1, max: 20 }, // 对话类型 (db: VarChar(20))
  context_mode: { min: 1, max: 20 }, // 上下文模式 (db: VarChar(20))

  // 消息引用相关 (参考: MessageCitation 表)
  citation_type: { min: 1, max: 20 }, // 引用类型 (db: VarChar(20))
  citation_format: { min: 1, max: 30 }, // 引用格式 (db: VarChar(20)) - 增加以支持 GB/T 7714-2015
  search_keywords: { min: 1, max: 500 }, // 搜索关键词 (db: VarChar(500))

  // 文件夹相关 (参考: PaperFolder 表)
  folder_name: { min: 1, max: 100 }, // 文件夹名称 (db: VarChar(100))
  description: { min: 0, max: 5000 }, // 描述 (db: Text)
  color: { min: 0, max: 20 }, // 颜色 (db: VarChar(20))
  cover_image: { min: 0, max: 500 }, // 封面图 URL (db: VarChar(500))

  // 反馈相关 (参考: MessageFeedback 表)
  feedback_type: { min: 1, max: 20 }, // 反馈类型 (db: VarChar(20))

  // 标注相关 (参考: PaperAnnotation 表)
  annotation_content: { min: 1, max: 50000 }, // 标注内容 (db: Text)
  annotation_note: { min: 0, max: 50000 }, // 标注笔记 (db: Text)
  annotation_type: { min: 1, max: 20 }, // 标注类型 (db: VarChar(20))

  // 论文相关 (参考: Paper, UserUploadedPaper 表)
  paper_title: { min: 1, max: 500 }, // 论文标题 (db: VarChar(500))
  source: { min: 1, max: 20 }, // 数据源 (db: VarChar(20))
  source_id: { min: 1, max: 200 }, // 来源 ID (db: VarChar(200))
  doi: { min: 1, max: 200 }, // DOI (db: VarChar(200))
  file_name: { min: 1, max: 255 }, // 文件名 (db: VarChar(255))
  file_path: { min: 1, max: 500 }, // 文件路径 (db: VarChar(500))
  file_type: { min: 1, max: 50 }, // 文件类型 (db: VarChar(50))
  mime_type: { min: 1, max: 100 }, // MIME 类型 (db: VarChar(100))

  // 学者相关 (参考: Scholar 表)
  scholar_name: { min: 1, max: 200 }, // 学者姓名 (db: VarChar(200))
  position: { min: 1, max: 200 }, // 职位 (db: VarChar(200))

  // 专利相关 (参考: Patent 表)
  patent_title: { min: 1, max: 500 }, // 专利标题 (db: VarChar(500))
  app_num: { min: 1, max: 100 }, // 申请号 (db: VarChar(100))
  pub_num: { min: 1, max: 100 }, // 公开号 (db: VarChar(100))

  // 通用
  id: { min: 1, max: 36 }, // ID 类字段 (db: VarChar(36), UUID)
  uuid: { min: 36, max: 36 }, // UUID (固定长度)
  url: { min: 1, max: 500 }, // URL (db: VarChar(500))
  title: { min: 1, max: 500 }, // 标题 (db: VarChar(500))
  short_text: { min: 1, max: 200 }, // 短文本
  medium_text: { min: 1, max: 1000 }, // 中等文本
  long_text: { min: 1, max: 5000 }, // 长文本

  // 配置相关 (参考: CommonConfig 表)
  config_key: { min: 1, max: 100 }, // 配置键名 (db: VarChar(100))

  // 论文 ID (可包含冒号分隔的 dbId:an 格式)
  paper_id: { min: 1, max: 100 }, // 论文 ID (db: VarChar(36) 或 dbId:an 格式)

  // 备注相关 (参考: FolderItem 表)
  notes: { min: 0, max: 5000 }, // 备注 (db: Text)
} as const;

export type StringLimitKey = keyof typeof STRING_LIMITS;

/**
 * 校验结果类型
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 校验字符串长度
 * @param value 要校验的值
 * @param fieldName 字段名称（用于错误提示）
 * @param options 校验选项
 * @returns 校验结果
 */
export function validateString(
  value: unknown,
  fieldName: string,
  options: {
    min?: number;
    max?: number;
    required?: boolean;
    limitKey?: StringLimitKey;
  } = {}
): ValidationResult {
  const { required = true, limitKey } = options;

  // 使用预设限制或自定义限制
  let min = options.min;
  let max = options.max;

  if (limitKey && STRING_LIMITS[limitKey]) {
    min = min ?? STRING_LIMITS[limitKey].min;
    max = max ?? STRING_LIMITS[limitKey].max;
  }

  // 默认值
  min = min ?? 0;
  max = max ?? 1000;

  // 空值检查
  if (value === undefined || value === null || value === "") {
    if (required) {
      return { valid: false, error: `${fieldName}不能为空` };
    }
    return { valid: true };
  }

  // 类型检查
  if (typeof value !== "string") {
    return { valid: false, error: `${fieldName}必须是字符串` };
  }

  const trimmedValue = value.trim();
  const length = trimmedValue.length;

  // 非空校验（trim 后）
  if (required && length === 0) {
    return { valid: false, error: `${fieldName}不能为空` };
  }

  // 最小长度校验
  if (length < min) {
    return { valid: false, error: `${fieldName}长度不能少于${min}个字符` };
  }

  // 最大长度校验
  if (length > max) {
    return { valid: false, error: `${fieldName}长度不能超过${max}个字符` };
  }

  return { valid: true };
}

/**
 * 批量校验字符串
 * @param validations 校验配置数组
 * @returns 校验结果，如果全部通过返回 null，否则返回第一个错误信息
 */
export function validateStrings(
  validations: Array<{
    value: unknown;
    fieldName: string;
    options?: {
      min?: number;
      max?: number;
      required?: boolean;
      limitKey?: StringLimitKey;
    };
  }>
): string | null {
  for (const { value, fieldName, options } of validations) {
    const result = validateString(value, fieldName, options);
    if (!result.valid) {
      return result.error || `${fieldName}校验失败`;
    }
  }
  return null;
}

/**
 * 校验 ID 格式（UUID 或普通 ID）
 * @param value ID 值
 * @param fieldName 字段名称
 * @param required 是否必填
 * @returns 校验结果
 */
export function validateId(
  value: unknown,
  fieldName: string,
  required = true
): ValidationResult {
  return validateString(value, fieldName, {
    required,
    limitKey: "id",
  });
}

/**
 * 校验手机号格式
 * @param value 手机号
 * @param fieldName 字段名称
 * @returns 校验结果
 */
export function validatePhone(
  value: unknown,
  fieldName = "手机号"
): ValidationResult {
  const strResult = validateString(value, fieldName, {
    required: true,
    limitKey: "phone",
  });

  if (!strResult.valid) {
    return strResult;
  }

  // 手机号格式校验
  const phoneRegex = /^1[1-9]\d{9}$/;
  if (!phoneRegex.test(value as string)) {
    return { valid: false, error: `${fieldName}格式不正确` };
  }

  return { valid: true };
}

/**
 * 校验邮箱格式
 * @param value 邮箱
 * @param fieldName 字段名称
 * @param required 是否必填
 * @returns 校验结果
 */
export function validateEmail(
  value: unknown,
  fieldName = "邮箱",
  required = true
): ValidationResult {
  const strResult = validateString(value, fieldName, {
    required,
    limitKey: "email",
  });

  if (!strResult.valid) {
    return strResult;
  }

  if (!required && (!value || (value as string).trim() === "")) {
    return { valid: true };
  }

  // 邮箱格式校验
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(value as string)) {
    return { valid: false, error: `${fieldName}格式不正确` };
  }

  return { valid: true };
}
