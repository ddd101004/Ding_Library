/**
 * 表单校验 Hook — 提供认证表单各字段的校验规则
 *
 * 核心函数：
 * - validatePhone(phone) — 校验手机号（1开头11位数字），返回错误信息或undefined
 * - validatePassword(password) — 校验密码（≥6位，含字母和数字），返回错误信息或undefined
 * - validateVerificationCode(code) — 校验验证码（6位数字），返回错误信息或undefined
 * - validateUsername(username) — 校验用户名（2-20字符），返回错误信息或undefined
 *
 * 使用组件：
 * - LoginForm — 登录表单（validatePhone）
 * - RegisterStep1 — 注册第一步手机号验证（validatePhone）
 * - ForgotPasswordStep1 — 忘记密码第一步（validatePhone）
 * - ForgotPasswordStep3 — 忘记密码第三步重置密码（validatePassword）
 */
export function useFormValidation() {
  /**
   * 验证手机号
   * @param phone 手机号
   * @returns 错误信息，undefined 表示验证通过
   */
  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return "请输入手机号";
    if (!/^1[2-9]\d{9}$/.test(phone)) return "请输入正确的11位手机号";
    return undefined;
  };

  /**
   * 验证密码
   * @param password 密码
   * @returns 错误信息，undefined 表示验证通过
   */
  const validatePassword = (password: string): string | undefined => {
    if (!password) return "请输入密码";
    if (!/^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(password)) {
      return "密码必须至少6位，且包含字母和数字";
    }
    return undefined;
  };

  /**
   * 验证验证码
   * @param code 验证码
   * @returns 错误信息，undefined 表示验证通过
   */
  const validateVerificationCode = (code: string): string | undefined => {
    if (!code) return "请输入验证码";
    if (!/^\d{6}$/.test(code)) return "验证码必须是6位数字";
    return undefined;
  };

  /**
   * 验证用户名
   * @param username 用户名
   * @returns 错误信息，undefined 表示验证通过
   */
  const validateUsername = (username: string): string | undefined => {
    if (!username) return "请输入用户名";
    if (username.length < 2) return "用户名至少2个字符";
    if (username.length > 20) return "用户名最多20个字符";
    return undefined;
  };

  return {
    validatePhone,
    validatePassword,
    validateVerificationCode,
    validateUsername,
  };
}
