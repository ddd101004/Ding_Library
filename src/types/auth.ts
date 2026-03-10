// 登录凭证类型
export interface LoginCredentials {
  phone_number: string;
  password?: string;
  verification_code?: string;
}

// 注册数据类型
export interface RegisterData {
  phone_number: string;
  username: string;
  password: string;
  verification_code: string;
  type: "phone" | "email";
}

// 重置密码数据类型
export interface ResetPasswordData {
  phone_number: string;
  verification_code: string;
  password: string;
}

// 用户信息类型
export interface UserInfo {
  id: string;
  username: string;
  phone: string;
  token: string;
}

// 验证码类型
export type CodeType = "login" | "register" | "resetPassword";

// API 错误类型
export interface ApiError extends Error {
  code?: string;
  statusCode?: number;
  isWarning?: boolean;
}

// 表单步骤数据类型
export interface RegisterStep1Data {
  username: string;
  phone: string;
  password: string;
}

export interface RegisterStep2Data extends RegisterStep1Data {
  verificationCode: string;
}
