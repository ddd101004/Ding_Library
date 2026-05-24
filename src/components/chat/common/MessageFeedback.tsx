/**
 * 消息反馈 — 点赞/点踩按钮，提交用户对AI回复的评价并实时更新UI状态
 *
 * 【前端】对话模块通用组件
 *
 * 职责：
 * - 渲染点赞(ThumbsUp)和点踩(ThumbsDown)图标按钮，间距50px
 * - 点击后调用POST /api/chat/feedback提交反馈（message_id + feedback_type）
 * - 乐观更新：点击后立即切换UI状态，请求失败时回滚到之前状态
 * - 反馈类型：like/dislike/cancel_like/cancel_dislike（已点赞再点击=取消点赞）
 * - 已选择的按钮变为teal色高亮，未选择的保持默认灰色
 * - 使用currentVersionMessageId确保反馈提交到正确版本的消息
 * - 防重复提交：isLiking/isDisliking状态锁
 *
 * 引用的API：
 * - POST /api/chat/feedback — 提交消息反馈
 *
 * 引用方：
 * - common/MessageActions — 消息操作栏中的反馈按钮区域
 */
import React, { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { apiPost } from "@/api/request";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageFeedbackProps {
  messageId: string;
  currentVersionMessageId?: string;
  isLiked: boolean;
  isDisliked: boolean;
  onFeedbackSuccess?: (messageId: string, feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike') => void;
}

// 反馈状态类型
type FeedbackStatus = "none" | "like" | "dislike";

const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  currentVersionMessageId,
  isLiked = false,
  isDisliked = false,
  onFeedbackSuccess,
}) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<{
    like?: "success" | "error";
    dislike?: "success" | "error";
  }>({});

  const [currentFeedback, setCurrentFeedback] = useState<FeedbackStatus>(() => {
    if (isLiked) return "like";
    if (isDisliked) return "dislike";
    return "none";
  });

  // 同步外部状态变化
  useEffect(() => {
    if (isLiked) {
      setCurrentFeedback("like");
    } else if (isDisliked) {
      setCurrentFeedback("dislike");
    } else {
      setCurrentFeedback("none");
    }
  }, [isLiked, isDisliked]);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);

    // 保存当前状态用于回滚
    const previousFeedback = currentFeedback;
    // 立即更新UI状态
    const isCanceling = currentFeedback === "like";
    const newFeedbackStatus = isCanceling ? "none" : "like";
    setCurrentFeedback(newFeedbackStatus);

    try {
      const feedbackType = isCanceling ? "cancel_like" : "like";

      // 使用当前版本的实际 message_id，如果没有提供则使用 messageId
      const actualMessageId = currentVersionMessageId || messageId;

      const response = await apiPost("/api/chat/feedback", {
        message_id: actualMessageId,
        feedback_type: feedbackType,
      });

      if (response.code === 200) {
        setFeedbackStatus((prev) => ({ ...prev, like: "success" }));
        onFeedbackSuccess?.(messageId, feedbackType);
      } else {
        throw new Error(response.message || "操作失败");
      }

      setTimeout(
        () => setFeedbackStatus((prev) => ({ ...prev, like: undefined })),
        2000
      );
    } catch (error: any) {
      console.error("Like feedback failed:", error);
      // 请求失败，回滚状态
      setCurrentFeedback(previousFeedback);
      setFeedbackStatus((prev) => ({ ...prev, like: "error" }));

      if (error.message?.includes("消息不存在")) {
        console.warn("消息不存在，可能是ID不匹配:", messageId);
      }
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (isDisliking) return;
    setIsDisliking(true);

    // 保存当前状态用于回滚
    const previousFeedback = currentFeedback;
    // 立即更新UI状态
    const isCanceling = currentFeedback === "dislike";
    const newFeedbackStatus = isCanceling ? "none" : "dislike";
    setCurrentFeedback(newFeedbackStatus);

    try {
      const feedbackType = isCanceling ? "cancel_dislike" : "dislike";

      // 使用当前版本的实际 message_id，如果没有提供则使用 messageId
      const actualMessageId = currentVersionMessageId || messageId;

      const response = await apiPost("/api/chat/feedback", {
        message_id: actualMessageId,
        feedback_type: feedbackType,
      });

      if (response.code === 200) {
        setFeedbackStatus((prev) => ({ ...prev, dislike: "success" }));
        onFeedbackSuccess?.(messageId, feedbackType);
      } else {
        throw new Error(response.message || "操作失败");
      }

      setTimeout(
        () => setFeedbackStatus((prev) => ({ ...prev, dislike: undefined })),
        2000
      );
    } catch (error: any) {
      console.error("Dislike feedback failed:", error);
      // 请求失败，回滚状态
      setCurrentFeedback(previousFeedback);
      setFeedbackStatus((prev) => ({ ...prev, dislike: "error" }));

      if (error.message?.includes("消息不存在")) {
        console.warn("消息不存在，可能是ID不匹配:", messageId);
      }
    } finally {
      setIsDisliking(false);
    }
  };

  return (
    <div className="flex items-center">
      {/* 点赞图标 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            <ThumbsUp
              className={`cursor-pointer hover:opacity-80 transition-opacity ${
                currentFeedback === "like" ? "text-[#0D9488]" : ""
              }`}
              style={{ width: "21px", height: "20px" }}
              onClick={handleLike}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>点赞</p>
        </TooltipContent>
      </Tooltip>

      {/* 点踩图标 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative" style={{ marginLeft: "50px" }}>
            <ThumbsDown
              className={`cursor-pointer hover:opacity-80 transition-opacity ${
                currentFeedback === "dislike" ? "text-[#0D9488]" : ""
              }`}
              style={{
                width: "21px",
                height: "20px",
              }}
              onClick={handleDislike}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>点踩</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default MessageFeedback;
