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
