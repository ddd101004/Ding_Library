/**
 * 认证工具函数 — 密码哈希、验证码哈希、JWT生成与验证
 *
 * 【后端】所有函数仅在API路由和service层使用
 *
 * 导出函数：
 * - hashPassword(password) — bcrypt哈希密码（salt轮次10）
 * - verifyPassword(password, hashed) — bcrypt验证密码
 * - hashVerificationCode(code) — bcrypt哈希验证码（salt轮次8，性能优先）
 * - verifyVerificationCode(code, hashed) — bcrypt验证验证码
 * - generateJWT(userId) — 生成JWT令牌（过期时间取自constants）
 * - verifyJWT(token) — 验证JWT令牌，返回payload
 * - getToken() — 从localStorage获取token（仅浏览器环境）
 *
 * 引用方：
 * - db/user.ts — hashVerificationCode
 * - middleware/auth/withAuth.ts — verifyJWT
 * - pages/api/admin/login.ts — generateJWT, verifyPassword
 * - pages/api/auth/login.ts — generateJWT, verifyPassword, hashVerificationCode, verifyVerificationCode
 * - pages/api/auth/register.ts — generateJWT, hashPassword
 * - pages/api/auth/reset-pwd.ts — hashPassword, verifyVerificationCode
 * - pages/api/auth/verify-code.ts — verifyVerificationCode
 * - service/checkCodeValid.ts — verifyVerificationCode
 */
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { TOKEN_EXPIRE_IN } from "@/constants";

export interface JWTPayload {
  userId: string;
  iat: number;
  exp: number;
}

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

// 哈希验证码 - 使用较少的salt轮次以提高性能（验证码有效期短）
export const hashVerificationCode = async (code: string): Promise<string> => {
  const salt = await bcrypt.genSalt(8);
  return bcrypt.hash(code, salt);
};

// 验证验证码
export const verifyVerificationCode = async (
  code: string,
  hashedCode: string
): Promise<boolean> => {
  return bcrypt.compare(code, hashedCode);
};

export const generateJWT = (userId: string): string => {
  return jwt.sign({ userId }, process.env.JWT_SECRET as string, {
    expiresIn: TOKEN_EXPIRE_IN,
  });
};

export const getToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

export const verifyJWT = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as JWTPayload);
      }
    });
  });
};
