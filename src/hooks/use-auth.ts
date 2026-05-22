/**
 * 认证 Hook — 处理登录、注册、验证码、重置密码等认证流程
 *
 * 核心函数：
 * - login(credentials) — 密码/验证码登录，base64编码密码后调用API，保存token并跳转
 * - register(data) — 注册并自动登录，base64编码密码后调用API
 * - sendVerificationCode(phone, type) — 发送短信验证码（登录/注册/重置密码）
 * - checkPhone(phone) — 检查手机号是否已注册
 * - verifyCode(phone, code) — 验证验证码是否正确
 * - resetPassword(phone, code, password) — 重置密码，base64编码新密码后调用API
 *
 * 使用组件：
 * - LoginForm — 登录表单（login + sendVerificationCode + checkPhone + verifyCode + useCountdown）
 * - RegisterStep1 — 注册第一步手机号验证（checkPhone + useFormValidation）
 * - RegisterStep2 — 注册第二步填写信息（register + useCountdown）
 * - ForgotPasswordStep1 — 忘记密码第一步（checkPhone + useFormValidation）
 * - ForgotPasswordStep2 — 忘记密码第二步验证码（sendVerificationCode + verifyCode + useCountdown）
 * - ForgotPasswordStep3 — 忘记密码第三步重置密码（resetPassword + useFormValidation）
 */
import { useRouter } from "next/router";
import { useUser } from "@/components/contexts/UserContext";
import { apiPost, saveToken } from "@/api/request";
import { toast } from "sonner";

interface LoginCredentials {
  phone_number: string;
  password?: string;
  verification_code?: string;
}

interface RegisterData {
  phone_number: string;
  username: string;
  password: string;
  verification_code: string;
  type: "phone" | "email";
}

type CodeType = "login" | "register" | "resetPassword";

export function useAuth() {
  const { updateUserInfo } = useUser();
  const router = useRouter();

  /**
   * 登录
   */
  const login = async (credentials: LoginCredentials) => {
    // 如果使用密码登录，需要 base64 编码
    const encodedCredentials = {
      ...credentials,
      password: credentials.password
        ? Buffer.from(credentials.password).toString("base64")
        : undefined,
    };

    // 错误会自动 toast + reject，这里只处理成功的情况
    const response = await apiPost("/api/auth/login", encodedCredentials);

    const { token, user_id, username, phone_number, role } = response.data;
    saveToken(token);
    updateUserInfo({ id: user_id, username, phone: phone_number, role: role || "user", token });

    // 登录成功后，重置侧边栏为收起状态
    if (typeof window !== "undefined") {
      localStorage.setItem("isSidebarOpen", JSON.stringify(false));
    }

    // 处理重定向 - 使用 window.location.href 强制完整页面跳转
    // 避免客户端路由与 AuthChecker 状态不同步的问题
    const redirectPath = router.query.redirect as string;
    // 管理员跳转到管理后台，普通用户跳转到聊天页
    const defaultPath = role === "admin" ? "/admin" : "/chat";
    const targetUrl = redirectPath || defaultPath;
    window.location.href = targetUrl;

    return response.data;
  };

  /**
   * 注册
   */
  const register = async (data: RegisterData) => {
    // 密码需要 base64 编码后再传给后端
    const encodedData = {
      ...data,
      password: Buffer.from(data.password).toString("base64"),
    };
    const response = await apiPost("/api/auth/register", encodedData);

    // 注册成功后自动登录
    const { token, user_id, username, phone_number } = response.data;
    saveToken(token);
    updateUserInfo({ id: user_id, username, phone: phone_number, token });

    // 注册成功后，重置侧边栏为收起状态
    if (typeof window !== "undefined") {
      localStorage.setItem("isSidebarOpen", JSON.stringify(false));
    }

    return response.data;
  };

  /**
   * 发送验证码
   */
  const sendVerificationCode = async (phone_number: string, type: CodeType) => {
    await apiPost("/api/auth/send-code", {
      phone_number,
      type,
    });
  };

  /**
   * 检查手机号是否已注册
   */
  const checkPhone = async (phone_number: string) => {
    const response = await apiPost("/api/auth/check-phone", {
      phone_number,
    });

    return response.data?.exists || false;
  };

  /**
   * 验证验证码
   */
  const verifyCode = async (
    phone_number: string,
    verification_code: string
  ) => {
    const response = await apiPost("/api/auth/verify-code", {
      phone_number,
      verification_code,
    });
    return response.data.data;
  };

  /**
   * 重置密码
   */
  const resetPassword = async (
    phone_number: string,
    verification_code: string,
    password: string
  ) => {
    await apiPost("/api/auth/reset-pwd", {
      phone_number,
      verification_code,
      password: Buffer.from(password).toString("base64"),
    });
    toast.success("密码重置成功，请重新登录");
  };

  return {
    login,
    register,
    sendVerificationCode,
    checkPhone,
    verifyCode,
    resetPassword,
  };
}
