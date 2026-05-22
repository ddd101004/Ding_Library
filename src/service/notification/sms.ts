/**
 * 短信验证码发送服务 — 当前为开发模式（仅打印到控制台），生产环境可切换回腾讯云短信
 *
 * 【后端】仅在验证码发送API中使用
 *
 * 导出函数：
 * - sendSms(phoneNumber, code, templateId?) — 发送短信验证码（开发模式仅打印，生产环境调用腾讯云短信API）
 *
 * 引用方：
 * - pages/api/auth/send-code.ts — 发送验证码API
 */
const sendSms = async (
  phoneNumber: string | string[],
  code: string,
  templateId?: string
) => {
  // 格式化手机号显示
  const phoneNumbers = Array.isArray(phoneNumber) ? phoneNumber : [phoneNumber];

  // 打印分隔线
  console.log("\n" + "=".repeat(60));
  console.log("短信验证码发送（开发模式）");
  console.log("=".repeat(60));
  console.log(`手机号: ${phoneNumbers.join(", ")}`);
  console.log(`验证码: ${code}`);
  console.log(`时间: ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`);
  console.log("=".repeat(60) + "\n");

  // 返回成功状态（保持与原API一致的返回格式）
  return { Code: "Ok" };
};

export default sendSms;
