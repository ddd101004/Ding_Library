import logger from "@/helper/logger";
import nodemailer from "nodemailer";

export const sendEmail = async (
  email: string,
  subject: string,
  html: string
) => {
  const transporter = nodemailer.createTransport({
    service: "qq",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 60000,
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: subject,
    html: html,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error: any) {
    logger.error(`邮件发送失败失败: ${error?.message}`, { error });
    return;
  }
};
