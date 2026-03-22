import { REGISTER_TYPE } from "@/constants";
import logger from "@/helper/logger";
import { checkCodeValid } from "@/service/checkCodeValid";
import { paginate } from "@/utils/paginate";
import prisma from "@/utils/prismaProxy";
import { Prisma } from "@prisma/client";
import { hashVerificationCode } from "@/utils/auth";

// 基础用户操作
export const createUser = async (
  phone_number: string,
  username: string,
  hashed_password: string
) => {
  try {
    const user = await prisma.user.create({
      data: {
        phone_number,
        username,
        hashed_password,
        phone_verified: false,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`创建用户失败: ${error?.message}`, { error });
    return;
  }
};

export const getUserByPhoneNumber = async (phone_number: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        phone_number,
        deleted_status: 0,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`查询用户失败: ${error?.message}`, { error });
    return;
  }
};

export const findUserByUserId = async (user_id: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { user_id, deleted_status: 0 },
      select: {
        user_id: true,
        phone_number: true,
        username: true,
        company_name: true,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`查询用户失败: ${error?.message}`, { error });
    return;
  }
};

/**
 * 获取用户完整资料（用于个人中心）
 */
export const getUserProfile = async (user_id: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { user_id, deleted_status: 0 },
      select: {
        user_id: true,
        phone_number: true,
        username: true,
        nickname: true,
        company_name: true,
        create_time: true,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`获取用户资料失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 更新用户资料
 */
export const updateUserProfile = async (
  user_id: string,
  data: {
    nickname?: string;
  }
) => {
  try {
    const user = await prisma.user.update({
      where: { user_id },
      data,
      select: {
        user_id: true,
        phone_number: true,
        username: true,
        nickname: true,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`更新用户资料失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 软删除用户账户
 */
export const softDeleteUser = async (user_id: string) => {
  try {
    const user = await prisma.user.update({
      where: { user_id },
      data: {
        deleted_status: 1,
        deleted_time: new Date(),
        // 清除敏感信息
        session_id: null,
      },
    });
    logger.info(`用户账户已删除: ${user_id}`);
    return user;
  } catch (error: any) {
    logger.error(`删除用户账户失败: ${error?.message}`, { error });
    return null;
  }
};

/**
 * 删除用户账户
 */
export const deleteUser = async (user_id: string) => {
  try {
    const user = await prisma.user.delete({
      where: { user_id }
    });
    logger.info(`用户账户已删除: ${user_id}`);
    return user;
  } catch (error: any) {
    logger.error(`删除用户账户失败: ${error?.message}`, { error });
    return null;
  }
};

export const findUserByUserIdInner = async (user_id: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { user_id },
    });
    return user;
  } catch (error: any) {
    logger.error(`查询用户详情失败: ${error?.message}`, { error });
    return;
  }
};

// 更新操作
export const updateUserByPhoneNumber = async (
  phone_number: string,
  updateData: {
    username?: string;
    country?: string;
    province?: string;
    city?: string;
    isp?: string;
    company_name?: string;
    hashed_password?: string;
    phone_verified?: boolean;
    verification_code?: string | null; 
    code_send_time?: Date | null;      
  }
) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { phone_number },
      data: updateData,
    });
    return updatedUser;
  } catch (error: any) {
    logger.error(`更新用户失败: ${error?.message}`, { error });
    return;
  }
};

export const updateUserByUserId = async (
  user_id: string,
  updateData: Prisma.UserUpdateInput
) => {
  try {
    const updatedUser = await prisma.user.update({
      where: { user_id },
      data: updateData,
    });
    return updatedUser;
  } catch (error: any) {
    logger.error(`更新用户失败: ${error?.message}`, { error });
    return;
  }
};

export const updateOperateTime = async (userId: string) => {
  try {
    const user = await prisma.user.update({
      where: { user_id: userId },
      data: { operate_time: new Date() },
    });
    return user;
  } catch (error: any) {
    const prismaError = error;
    if (prismaError?.code === 'P2025') {
      logger.warn(`更新操作时间失败: 用户不存在 ${userId}`);
    } else {
      logger.error(`更新操作时间失败: ${error?.message}`, { error });
    }
    return;
  }
};

export const upsertVerificationCode = async (
  phone_number: string,
  verification_code: string
) => {
  try {
    const hashedCode = await hashVerificationCode(verification_code);
    const now = new Date();

    // 获取现有用户以确定发送次数
    const existingUser = await getUserByPhoneNumber(phone_number);

    // 计算新的发送次数
    let newSendCount = 1; // 默认为1（新用户或超过1分钟）
    if (existingUser && existingUser.code_send_time) {
      const timeDiff = now.getTime() - existingUser.code_send_time.getTime();
      // 如果在1分钟内，次数+1；否则重置为1
      if (timeDiff < 60000 && timeDiff >= 0) {
        newSendCount = (existingUser.code_send_count_minute || 0) + 1;
      }
    }

    const user = await prisma.user.upsert({
      where: { phone_number },
      update: {
        verification_code: hashedCode,
        code_send_time: now,
        code_send_count_minute: newSendCount,
        code_attempt_count: 0,
        code_locked_until: null,
      },
      create: {
        phone_number,
        username: `user_${phone_number.slice(-4)}`,
        hashed_password: '', // 空密码
        verification_code: hashedCode,
        code_send_time: now,
        code_send_count_minute: 1,
        phone_verified: false,

        deleted_status: 0,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`更新/创建验证码失败: ${error?.message}`, { error });
    return;
  }
};

export const createUserWithVerificationCode = async (
  phone_number: string,
  verification_code: string,
  username: string,
  hashed_password: string
) => {
  try {
    const hashedCode = await hashVerificationCode(verification_code);
    
    const user = await prisma.user.create({
      data: {
        username,
        phone_number,
        hashed_password,
        verification_code: hashedCode,
        code_send_time: new Date(),
        phone_verified: false,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`创建带验证码用户失败: ${error?.message}`, { error });
    return;
  }
};

// 工具函数
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const verifyPhoneNumberCode = async (
  phone_number: string,
  verification_code: string
): Promise<boolean> => {
  try {
    const user = await getUserByPhoneNumber(phone_number);
    const { valid } = await checkCodeValid({ user, code: verification_code });
    return valid;
  } catch (error: any) {
    logger.error(`验证验证码失败: ${error?.message}`, { error });
    return false;
  }
};

export const getAllUserID = async () => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { create_time: "asc" },
      select: { user_id: true },
    });
    return users;
  } catch (error: any) {
    logger.error(`获取所有用户ID失败: ${error?.message}`, { error });
    return;
  }
};

// 验证码尝试计数和账户锁定相关操作
/**
 * 重置验证码尝试计数器
 */
export const resetCodeAttemptCount = async (user_id: string) => {
  try {
    const user = await prisma.user.update({
      where: { user_id },
      data: {
        code_attempt_count: 0,
        code_locked_until: null,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`重置验证码计数器失败: ${error?.message}`, { error });
    return;
  }
};

/**
 * 锁定用户账户
 */
export const lockUserAccount = async (user_id: string, lockUntil: Date, attemptCount: number) => {
  try {
    const user = await prisma.user.update({
      where: { user_id },
      data: {
        code_attempt_count: attemptCount,
        code_locked_until: lockUntil,
      },
    });
    return user;
  } catch (error: any) {
    logger.error(`锁定用户账户失败: ${error?.message}`, { error });
    return;
  }
};

/**
 * 增加验证码尝试次数
 */
export const incrementCodeAttemptCount = async (user_id: string, attemptCount: number) => {
  try {
    const user = await prisma.user.update({
      where: { user_id },
      data: { code_attempt_count: attemptCount },
    });
    return user;
  } catch (error: any) {
    logger.error(`更新验证码尝试次数失败: ${error?.message}`, { error });
    return;
  }
};

/**
 * 清空验证码和重置计数器（验证成功后）
 */
export const clearVerificationCode = async (user_id: string) => {
  try {
    const user = await prisma.user.update({
      where: { user_id },
      data: {
        verification_code: "",
        code_attempt_count: 0,
        code_locked_until: null,
      },
    });
    return user;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`清空验证码失败: ${errorMessage}`, { error });
    return;
  }
};