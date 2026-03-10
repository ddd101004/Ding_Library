// pages/api/auth/verify-code.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { verifyVerificationCode } from '@/utils/auth';
import logRequest from '@/middleware/monitoring/logRequest';
import { BusinessOperationMonitor, recordBusinessMetric } from '@/middleware/monitoring/apiMonitor';
import logger from '@/helper/logger';
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendErrorResponse,
  sendMethodNotAllowedResponse
} from '@/helper/responseHelper';
import {
  getUserByPhoneNumber,
  resetCodeAttemptCount,
  lockUserAccount,
  incrementCodeAttemptCount,
  clearVerificationCode,
} from '@/db/user';

// 验证码最大尝试次数
const MAX_ATTEMPTS = 5;
// 锁定时间（毫秒）：15分钟
const LOCK_DURATION = 15 * 60 * 1000;

/**
 * POST - 验证短信验证码
 */
const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  const { phone_number, verification_code } = req.body;

  // 业务监控
  const monitor = new BusinessOperationMonitor('verify_code', {
    phoneNumber: phone_number ? phone_number.slice(0, 3) + '****' + phone_number.slice(-4) : 'unknown',
  });

  try {
    logger.info('验证码验证请求', { phone: phone_number ? phone_number.slice(0, 3) + '****' + phone_number.slice(-4) : 'unknown' });

    // 检查验证码是否正确
    const user = await getUserByPhoneNumber(phone_number);

    if (!user) {
      logger.warn('验证失败 - 用户不存在', { phone: phone_number ? phone_number.slice(0, 3) + '****' + phone_number.slice(-4) : 'unknown' });
      monitor.failure(new Error('用户不存在'));
      recordBusinessMetric('verify_code_failed', { reason: 'user_not_found' });
      return sendWarnningResponse(res, '验证失败，请检查输入');
    }

    // 检查账户是否被锁定
    if (user.code_locked_until && new Date(user.code_locked_until) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.code_locked_until).getTime() - Date.now()) / 60000
      );
      logger.warn('账户已锁定', { userId: user.user_id, remainingMinutes });
      monitor.failure(new Error('账户已锁定'));
      recordBusinessMetric('verify_code_locked', { remainingMinutes });
      return sendWarnningResponse(res, `验证码尝试次数过多，账户已锁定${remainingMinutes}分钟`);
    }

    // 如果锁定时间已过，重置计数器
    if (user.code_locked_until && new Date(user.code_locked_until) <= new Date()) {
      await resetCodeAttemptCount(user.user_id);
    }

    // 验证验证码 - 使用bcrypt比较
    const isCodeValid = user.verification_code
      ? await verifyVerificationCode(verification_code, user.verification_code)
      : false;

    if (!isCodeValid) {
      const attemptCount = (user.code_attempt_count || 0) + 1;
      logger.warn('验证码不匹配', { userId: user.user_id, attemptCount });

      // 如果达到最大尝试次数，锁定账户
      if (attemptCount >= MAX_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_DURATION);
        await lockUserAccount(user.user_id, lockUntil, attemptCount);
        logger.error('账户已锁定 - 达到最大尝试次数', { userId: user.user_id });
        monitor.failure(new Error('达到最大尝试次数'));
        recordBusinessMetric('verify_code_locked', { attemptCount });
        return sendWarnningResponse(res, '验证码错误次数过多，账户已锁定15分钟');
      }

      // 更新尝试次数
      await incrementCodeAttemptCount(user.user_id, attemptCount);

      const remainingAttempts = MAX_ATTEMPTS - attemptCount;
      monitor.failure(new Error('验证码错误'));
      recordBusinessMetric('verify_code_failed', { reason: 'invalid_code', attemptCount, remainingAttempts });
      return sendWarnningResponse(res, `验证码错误，还剩${remainingAttempts}次尝试机会`);
    }

    // 验证码正确，清空验证码和计数器
    await clearVerificationCode(user.user_id);

    logger.info('验证码验证成功', { userId: user.user_id });
    monitor.success({ userId: user.user_id });
    recordBusinessMetric('verify_code_success', { userId: user.user_id });

    return sendSuccessResponse(res, '验证码正确', {
      user_id: user.user_id,
    });
  } catch (error) {
    logger.error('验证码验证失败', { error: error instanceof Error ? error.message : String(error) });
    monitor.failure(error as Error);
    recordBusinessMetric('verify_code_error', { errorMessage: error instanceof Error ? error.message : String(error) });
    return sendErrorResponse(res, '验证码验证失败');
  }
};

/**
 * 验证码校验 API
 */
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  logRequest(req, res);

  if (req.method === 'POST') {
    return await handlePost(req, res);
  } else {
    return sendMethodNotAllowedResponse(res, '仅支持POST请求');
  }
};

export default handler;