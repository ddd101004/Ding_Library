import { NextApiRequest } from "next";

export function getClientIp(req: NextApiRequest): string | undefined {
  const forwardedFor = req.headers["x-forwarded-for"] as string;
  if (forwardedFor) {
    // 如果请求头中包含X-Forwarded-For，获取第一个IP地址
    return forwardedFor.split(",")[0].trim();
  }

  // 否则，获取请求的连接的远程地址
  return req.socket.remoteAddress;
}
