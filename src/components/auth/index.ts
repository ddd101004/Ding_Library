/**
 * 认证模块统一导出 — 将auth目录下的通用组件、布局组件和各流程组件集中导出
 *
 * 导出的通用组件：
 * - AuthInput — 认证表单输入框
 * - AuthButton — 认证表单提交按钮
 * - VerificationCodeInput — 6位验证码输入组件
 *
 * 导出的布局组件：
 * - AuthPageLayout — 认证页面布局容器
 *
 * 导出的流程组件：
 * - LoginPage — 登录/注册页面（含模式切换）
 * - LoginForm — 登录表单（密码/验证码两种方式）
 * - RegisterStep1 — 注册第一步（昵称+手机号+密码）
 * - RegisterStep2 — 注册第二步（验证码确认）
 * - ForgotPasswordPage — 忘记密码页面（三步流程编排）
 * - ForgotPasswordStep1 — 忘记密码第一步（输入手机号+发送验证码）
 * - ForgotPasswordStep2 — 忘记密码第二步（输入验证码）
 * - ForgotPasswordStep3 — 忘记密码第三步（设置新密码）
 */
// 通用组件
export { AuthInput } from "./common/AuthInput";
export { AuthButton } from "./common/AuthButton";
export { VerificationCodeInput } from "./common/VerificationCodeInput";

// 布局组件
export { AuthPageLayout } from "./layout/AuthPageLayout";

// 登录相关
export { default as LoginPage } from "./login/LoginPage";
export { LoginForm } from "./login/LoginForm";

// 注册相关
export { RegisterStep1 } from "./register/RegisterStep1";
export { RegisterStep2 } from "./register/RegisterStep2";

// 重置密码相关
export { default as ForgotPasswordPage } from "./forgot-password/ForgotPasswordPage";
export { ForgotPasswordStep1 } from "./forgot-password/ForgotPasswordStep1";
export { ForgotPasswordStep2 } from "./forgot-password/ForgotPasswordStep2";
export { ForgotPasswordStep3 } from "./forgot-password/ForgotPasswordStep3";
