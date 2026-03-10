import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/middleware/auth/withAuth";
import { withErrorHandler } from "@/middleware/error/withErrorHandler";
import {
  sendSuccessResponse,
  sendWarnningResponse,
  sendMethodNotAllowedResponse,
} from "@/helper/responseHelper";
import {
  createFeedback,
  getFeedbackByUserAndMessage,
  updateFeedback,
  deleteFeedback,
} from "@/db/messageFeedback";
import { getMessageById } from "@/db/chatMessage";
import { verifyConversationOwner } from "@/db/chatConversation";
import { validateId, validateString } from "@/utils/validateString";

const handlePost = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  const { message_id, feedback_type, feedback_content } = req.body;

  // 参数校验
  const messageIdResult = validateId(message_id, "消息 ID");
  if (!messageIdResult.valid) {
    return sendWarnningResponse(res, messageIdResult.error || "消息 ID 校验失败");
  }

  const typeResult = validateString(feedback_type, "反馈类型", { max: 20 });
  if (!typeResult.valid) {
    return sendWarnningResponse(res, typeResult.error || "反馈类型校验失败");
  }

  if (feedback_content) {
    const contentResult = validateString(feedback_content, "反馈内容", {
      limitKey: "feedback_content",
      required: false,
    });
    if (!contentResult.valid) {
      return sendWarnningResponse(res, contentResult.error || "反馈内容校验失败");
    }
  }

  // 验证 feedback_type：只支持点赞/点踩及其取消操作
  const validTypes = ["like", "dislike", "cancel_like", "cancel_dislike"];
  if (!validTypes.includes(feedback_type)) {
    return sendWarnningResponse(res, "无效的反馈类型");
  }

  // 获取消息信息
  const message = await getMessageById(message_id);

  if (!message) {
    return sendWarnningResponse(res, "消息不存在");
  }

  // 验证会话所有权
  const isOwner = await verifyConversationOwner(
    message.conversation_id,
    userId
  );
  if (!isOwner) {
    return sendWarnningResponse(res, "无权访问此消息");
  }

  // 检查用户是否已经对该消息有过反馈
  const existingFeedback = await getFeedbackByUserAndMessage(
    userId,
    message_id
  );

  let result;
  let actionMessage = "";

  if (feedback_type === "cancel_like" || feedback_type === "cancel_dislike") {
    // 取消反馈：删除现有记录（仅当类型匹配时）
    if (existingFeedback) {
      const expectedType = feedback_type === "cancel_like" ? "like" : "dislike";
      if (existingFeedback.feedback_type !== expectedType) {
        return sendWarnningResponse(res, "没有找到可取消的反馈");
      }
      const deleted = await deleteFeedback(existingFeedback.feedback_id);
      if (!deleted) {
        throw new Error("取消反馈失败");
      }
      result = { feedback_id: null, action: "deleted" };
      actionMessage =
        feedback_type === "cancel_like" ? "已取消点赞" : "已取消点踩";
    } else {
      return sendWarnningResponse(res, "没有找到可取消的反馈");
    }
  } else if (feedback_type === "like" || feedback_type === "dislike") {
    // 点赞/点踩反馈：互斥处理
    if (existingFeedback) {
      // 更新现有反馈
      result = await updateFeedback(existingFeedback.feedback_id, {
        feedback_type,
        feedback_content,
        update_time: new Date(),
      });
    } else {
      // 创建新反馈
      result = await createFeedback({
        message_id,
        user_id: userId,
        feedback_type,
        feedback_content,
      });
    }
    actionMessage = feedback_type === "like" ? "点赞成功" : "点踩成功";
  }

  if (!result) {
    throw new Error("提交反馈失败");
  }

  return sendSuccessResponse(res, actionMessage, {
    feedback_id: result.feedback_id,
    action: feedback_type.includes("cancel") ? "canceled" : feedback_type,
  });
};

/**
 * 消息反馈 API
 */
const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  userId: string
) => {
  if (req.method === "POST") {
    return await handlePost(req, res, userId);
  } else {
    return sendMethodNotAllowedResponse(res, "仅支持POST请求");
  }
};

export default withAuth(
  withErrorHandler(handler, { logPrefix: "消息反馈" })
);
