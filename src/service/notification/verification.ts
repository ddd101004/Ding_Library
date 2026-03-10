import { PRODUCT_NAME } from "@/constants";
import { sendEmail } from "./email";

export const sendVerificationEmail = (email: string, code: string) => {
  const subject = `【${PRODUCT_NAME}】注册验证码`;
  const html = `尊敬的用户，<br><br>
    
    感谢您注册使用我们的AI产品——${PRODUCT_NAME}。为了保障您的账号安全，我们需要对您进行身份验证。请在注册页面输入以下验证码完成注册：<br><br>
    
    验证码： ${code}<br><br>
    
    请注意，验证码有效期为10分钟。若您没有进行注册操作，请忽略此邮件。<br><br>
    
    祝您使用愉快！<br><br>
    
    https://ai.supercat.cash<br><br>`;

  return sendEmail(email, subject, html);
};
