// 统一管理所有API URL

export const api = {
  // 内部API
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    sendVerificationCode: '/api/auth/send-verification-code',
    checkPhone: '/api/auth/check-phone',
    sendCode: '/api/auth/send-code',
    verifyCode: '/api/auth/verify-code',
    resetPassword: '/api/auth/reset-pwd'
  },
  // 第三方API
  ebsco: {
    token: 'https://auth.ebsco.com/auth/oauth/v2/token',
    search: 'https://search.ebscohost.com/edsapi/rest/search'
  },
  services: {
    email: process.env.NEXT_PUBLIC_EMAIL_API_URL || ''
  }
};
