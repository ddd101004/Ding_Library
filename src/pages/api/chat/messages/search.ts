import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import { searchMessages } from "@/db/chatMessage";
import { parsePageNumber, parseLimitParam } from "@/utils/parsePageParams";
import { validateString, validateId } from "@/utils/validateString";

/**
 * GET - 搜索消息
 */
const handleGet = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { keyword, conversation_id, page, limit } = req.query;

  // 参数校验
  const keywordResult = validateString(keyword, "关键词", { limitKey: "keyword" });
  if (!keywordResult.valid) {
    return sendWarnningResponse(res, keywordResult.error || "关键词校验失败");
  }

  // 会话 ID 校验（可选）
  if (conversation_id) {
    const idResult = validateId(conversation_id, "会话 ID");
    if (!idResult.valid) {
      return sendWarnningResponse(res, idResult.error || "会话 ID 校验失败");
    }
  }

  const result = await searchMessages({
    user_id: userId,
    keyword: keyword as string,
    conversation_id: conversation_id as string | undefined,
    page: parsePageNumber(page),
    limit: parseLimitParam(limit),
  });

  if (!result) {
    throw new Error("搜索失败");
  }

  return sendSuccessResponse(res, "搜索成功", result);
};

/**
 * 消息搜索 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "GET") {
    return await handleGet(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持GET请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "消息搜索" })
);
