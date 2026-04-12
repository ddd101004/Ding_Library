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
      password: credentials.password ? btoa(credentials.password) : undefined,
    };

    // 错误会自动 toast + reject，这里只处理成功的情况
    const response = await apiPost("/api/auth/login", encodedCredentials);

    const { token, user_id, username, phone_number } = response.data;
    saveToken(token);
    updateUserInfo({ id: user_id, username, phone: phone_number, token });

    // 登录成功后，重置侧边栏为收起状态
    if (typeof window !== "undefined") {
      localStorage.setItem("isSidebarOpen", JSON.stringify(false));
    }

    // 处理重定向
    const redirectPath = router.query.redirect as string;
    await router.push(redirectPath || "/chat");

    return response.data;
  };

  /**
   * 注册
   */
  const register = async (data: RegisterData) => {
    // 密码需要 base64 编码后再传给后端
    const encodedData = {
      ...data,
      password: btoa(data.password), // base64 编码
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
      password: btoa(password),
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
