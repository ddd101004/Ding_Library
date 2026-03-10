import { User } from "@prisma/client";
import { verifyVerificationCode } from "@/utils/auth";
import dayjs from "dayjs";

export const checkCodeValid = async ({
  user,
  code,
}: {
  user: User | null | undefined;
  code: string;
}) => {
  if (!user) {
    return { valid: false, msg: "用户不存在" };
  }

  // 校验发送验证码的时候是否超过五分钟
  if (dayjs().diff(dayjs(user.code_send_time), "minute") > 5) {
    return { valid: false, msg: "验证码已过期" };
  }

  // 检查用户是否有验证码
  if (!user.verification_code) {
    return { valid: false, msg: "验证码不存在" };
  }

  const isCodeValid = await verifyVerificationCode(code, user.verification_code);
  if (!isCodeValid) {
    return { valid: false, msg: "验证码输入有误" };
  }

  return { valid: true, msg: "" };
};
