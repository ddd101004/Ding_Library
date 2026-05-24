// src/pages/login.tsx
/**
 * 登录页 /login — 用户登录
 *
 * 【前端】路由：/login
 *
 * 职责：
 * - 邮箱+密码登录表单
 * - 登录成功后跳转首页
 * - 记住密码功能
 */
import LoginPage from "../components/auth/login/LoginPage";

export default function Login() {
  return <LoginPage />;
}