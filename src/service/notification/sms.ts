/**
 * 发送短信验证码（开发模式：仅打印到控制台）
 * 生产环境可切换回腾讯云短信服务
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
