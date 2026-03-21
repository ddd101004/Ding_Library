import { useState } from "react";
import { apiPost, apiGet } from "@/api/request";
import { Message } from "@/components/chat/ChatSplitLayout";

interface UseMessageVersionsOptions {
  isFeedbackInProgressRef?: React.RefObject<boolean>;
  onErrorLogPrefix?: string;
}

interface UseMessageVersionsReturn {
  messageVersions: Record<string, any>;
  currentVersionMessageIds: Record<string, string>;
  setMessageVersions: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setCurrentVersionMessageIds: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  loadBatchMessageVersions: (
    conversationId: string,
    parentMessageIds: string[],
    formattedMessages: Message[],
    replaceWithLatest?: boolean,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => Promise<void>;
  loadMessageVersions: (
    messageId: string,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => Promise<void>;
  handlePreviousVersion: (
    messageId: string,
    messageVersions: Record<string, any>,
    switchToVersion: (messageId: string, targetVersion: number) => Promise<void>
  ) => Promise<void>;
  handleNextVersion: (
    messageId: string,
    messageVersions: Record<string, any>,
    switchToVersion: (messageId: string, targetVersion: number) => Promise<void>
  ) => Promise<void>;
  switchToVersion: (
    messageId: string,
    targetVersion: number,
    messageVersions: Record<string, any>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    currentVersionMessageIds: Record<string, string>,
    setCurrentVersionMessageIds: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => Promise<void>;
  handleFeedbackSuccess: (
    messageId: string,
    feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike',
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    messageVersions: Record<string, any>,
    setMessageVersions: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    currentVersionMessageIds: Record<string, string>
  ) => void;
}

/**
 * 消息版本管理 Hook
 * 提供消息版本加载、切换、反馈等功能
 */
export function useMessageVersions(
  options: UseMessageVersionsOptions = {}
): UseMessageVersionsReturn {
  const { isFeedbackInProgressRef } = options;

  const [messageVersions, setMessageVersions] = useState<Record<string, any>>({});
  const [currentVersionMessageIds, setCurrentVersionMessageIds] = useState<Record<string, string>>({});

  /**
   * 批量加载消息版本信息（刷新页面时使用）
   */
  const loadBatchMessageVersions = async (
    conversationId: string,
    parentMessageIds: string[],
    formattedMessages: Message[],
    replaceWithLatest: boolean = true,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    try {
      const response = await apiPost<{
        [key: string]: {
          totalVersions: number;
          currentVersion: number;
          rootMessageId: string;
          allVersions: Array<{
            message_id: string;
            content: string;
            reasoning_content: string | null;
            create_time: string;
            parent_message_id: string | null;
            status: string;
            is_liked: boolean;
            is_disliked: boolean;
          }>;
        };
      }>(`/api/chat/conversations/${conversationId}/message-versions`, {
        message_ids: parentMessageIds,
      });

      if (response.code === 200 && response.data) {
        const versionInfoMap = response.data;

        // 为每个版本的 message_id 都创建映射，指向同一个版本信息
        const expandedVersionMap: Record<string, any> = {};
        for (const [rootMessageId, versionInfo] of Object.entries(versionInfoMap)) {
          for (let i = 0; i < versionInfo.allVersions.length; i++) {
            const version = versionInfo.allVersions[i];
            expandedVersionMap[version.message_id] = {
              ...versionInfo,
              currentVersion: i + 1,
              isLiked: version.is_liked ?? false,
              isDisliked: version.is_disliked ?? false,
            };
          }
        }

        setMessageVersions(prev => ({
          ...prev,
          ...expandedVersionMap,
        }));

        const initialVersionIdsMap: Record<string, string> = {};
        for (const msg of formattedMessages) {
          if (!msg.backendId) continue;

          for (const [rootMessageId, versionInfo] of Object.entries(versionInfoMap)) {
            const versionIndex = versionInfo.allVersions.findIndex((v: any) => v.message_id === msg.backendId);

            if (versionIndex !== -1) {
              const latestVersion = versionInfo.allVersions[versionInfo.allVersions.length - 1];
              initialVersionIdsMap[msg.backendId] = latestVersion.message_id;
              break;
            }
          }
        }
        setCurrentVersionMessageIds(initialVersionIdsMap);

        if (replaceWithLatest && setMessages) {
          setMessages(prev => prev.map(msg => {
            for (const [rootMessageId, versionInfo] of Object.entries(versionInfoMap)) {
              const versionIndex = versionInfo.allVersions.findIndex((v: any) => v.message_id === msg.backendId);

              if (versionIndex !== -1) {
                const latestVersion = versionInfo.allVersions[versionInfo.allVersions.length - 1];
                const versionStatus = expandedVersionMap[msg.backendId!];

                return {
                  ...msg,
                  content: latestVersion.content,
                  thinking: latestVersion.reasoning_content || "",
                  totalVersions: versionInfo.totalVersions,
                  currentVersion: versionInfo.totalVersions,
                  isLiked: versionStatus?.isLiked || false,
                  isDisliked: versionStatus?.isDisliked || false,
                };
              }
            }

            return msg;
          }));
        } else {
          const newVersionIdsMap: Record<string, string> = {};

          for (const [rootMessageId, versionInfo] of Object.entries(versionInfoMap)) {
            const latestVersion = versionInfo.allVersions[versionInfo.allVersions.length - 1];

            for (const version of versionInfo.allVersions) {
              newVersionIdsMap[version.message_id] = latestVersion.message_id;
            }
          }

          setCurrentVersionMessageIds(prev => ({
            ...prev,
            ...newVersionIdsMap,
          }));

          if (setMessages) {
            setMessages(prev => {
              const updated = prev.map(msg => {
                for (const [rootMessageId, versionInfo] of Object.entries(versionInfoMap)) {
                  const versionIndex = versionInfo.allVersions.findIndex((v: any) => v.message_id === msg.backendId);

                  if (versionIndex !== -1) {
                    return {
                      ...msg,
                      totalVersions: versionInfo.totalVersions,
                      currentVersion: versionInfo.totalVersions,
                    };
                  }
                }

                return msg;
              });

              return updated;
            });
          }
        }
      }
    } catch (error) {
      console.error("批量加载版本信息失败:", error);
    }
  };

  /**
   * 加载单个消息版本信息（重新生成时使用）
   */
  const loadMessageVersions = async (
    messageId: string,
    setMessages?: React.Dispatch<React.SetStateAction<Message[]>>
  ) => {
    try {
      const response = await apiGet(`/api/chat/messages/${messageId}/versions`);

      if (response.code === 200 && response.data) {
        const versionInfo = response.data;

        setMessageVersions(prev => ({
          ...prev,
          [messageId]: versionInfo
        }));

        if (setMessages) {
          setMessages(prev => prev.map(msg => {
            const isRelatedMessage =
              msg.backendId === messageId ||
              msg.id === messageId ||
              (versionInfo.allVersions && versionInfo.allVersions.some((v: any) => v.message_id === msg.backendId));

            if (isRelatedMessage) {
              return {
                ...msg,
                totalVersions: versionInfo.totalVersions,
                currentVersion: versionInfo.currentVersion,
              };
            }
            return msg;
          }));
        }
      }
    } catch (error) {
      console.error("加载消息版本信息失败:", error);
    }
  };

  /**
   * 切换到上一个版本
   */
  const handlePreviousVersion = async (
    messageId: string,
    versions: Record<string, any>,
    switchToVersion: (messageId: string, targetVersion: number) => Promise<void>
  ) => {
    // 使用内部 messageVersions 状态而不是传入的参数
    const versionInfo = messageVersions[messageId];

    if (!versionInfo) {
      return;
    }

    if (!versionInfo || versionInfo.currentVersion <= 1) {
      return;
    }

    const targetVersion = versionInfo.currentVersion - 1;
    const actualMessageId = versionInfo.rootMessageId || messageId;

    await switchToVersion(actualMessageId, targetVersion);
  };

  /**
   * 切换到下一个版本
   */
  const handleNextVersion = async (
    messageId: string,
    versions: Record<string, any>,
    switchToVersion: (messageId: string, targetVersion: number) => Promise<void>
  ) => {
    // 使用内部 messageVersions 状态而不是传入的参数
    const versionInfo = messageVersions[messageId];

    if (!versionInfo) {
      return;
    }

    if (!versionInfo || versionInfo.currentVersion >= versionInfo.totalVersions) {
      return;
    }

    const targetVersion = versionInfo.currentVersion + 1;
    const actualMessageId = versionInfo.rootMessageId || messageId;
    await switchToVersion(actualMessageId, targetVersion);
  };

  /**
   * 切换到指定版本
   */
  const switchToVersion = async (
    messageId: string,
    targetVersion: number,
    versions: Record<string, any>,
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    currentVersionIds: Record<string, string>,
    setCurrentVersionIds: React.Dispatch<React.SetStateAction<Record<string, string>>>
  ) => {
    try {
      // 使用内部 messageVersions 状态而不是传入的参数
      const versionInfo = messageVersions[messageId];
      if (!versionInfo || !versionInfo.allVersions) {
        return;
      }

      const rootVersionInfo = messageVersions[versionInfo.rootMessageId] || versionInfo;
      const targetVersionData = rootVersionInfo.allVersions[targetVersion - 1];

      if (!targetVersionData) {
        return;
      }

      const allVersionIds = rootVersionInfo.allVersions.map((v: any) => v.message_id);
      const targetVersionInfo = messageVersions[targetVersionData.message_id];
      const latestIsLiked = targetVersionInfo?.isLiked || false;
      const latestIsDisliked = targetVersionInfo?.isDisliked || false;

      setMessages(prev => prev.map(msg => {
        const isInVersionGroup = msg.backendId && allVersionIds.includes(msg.backendId);

        if (isInVersionGroup) {
          if (msg.backendId) {
            setCurrentVersionIds(prev => ({
              ...prev,
              [msg.backendId!]: targetVersionData.message_id,
            }));
          }

          return {
            ...msg,
            content: targetVersionData.content,
            thinking: targetVersionData.reasoning_content || "",
            currentVersion: targetVersion,
            isLiked: latestIsLiked,
            isDisliked: latestIsDisliked,
          };
        }

        return msg;
      }));

      setMessageVersions(prev => {
        const updated = { ...prev };

        if (versionInfo.rootMessageId && updated[versionInfo.rootMessageId]) {
          const rootVersionInfo = updated[versionInfo.rootMessageId];
          updated[versionInfo.rootMessageId] = {
            ...rootVersionInfo,
            currentVersion: targetVersion,
            allVersions: rootVersionInfo.allVersions,
          };
        }

        for (const versionId of allVersionIds) {
          if (updated[versionId]) {
            const versionInfo = updated[versionId];
            updated[versionId] = {
              ...versionInfo,
              currentVersion: targetVersion,
              allVersions: versionInfo.allVersions,
            };
          }
        }

        return updated;
      });

    } catch (error) {
      console.error("切换版本失败:", error);
    }
  };

  /**
   * 处理反馈成功后的回调
   */
  const handleFeedbackSuccess = (
    messageId: string,
    feedbackType: 'like' | 'dislike' | 'cancel_like' | 'cancel_dislike',
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    versions: Record<string, any>,
    setVersions: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    currentVersionIds: Record<string, string>
  ) => {
    if (isFeedbackInProgressRef) {
      isFeedbackInProgressRef.current = true;
    }

    let newIsLiked = false;
    let newIsDisliked = false;

    if (feedbackType === 'like') {
      newIsLiked = true;
      newIsDisliked = false;
    } else if (feedbackType === 'dislike') {
      newIsLiked = false;
      newIsDisliked = true;
    } else if (feedbackType === 'cancel_like') {
      newIsLiked = false;
      newIsDisliked = false;
    } else if (feedbackType === 'cancel_dislike') {
      newIsLiked = false;
      newIsDisliked = false;
    }

    setMessages(prev => prev.map(msg => {
      if (msg.backendId === messageId) {
        return { ...msg, isLiked: newIsLiked, isDisliked: newIsDisliked };
      }
      return msg;
    }));

    // 使用内部 messageVersions 状态
    setMessageVersions(prev => {
      const updated = { ...prev };

      if (currentVersionIds && currentVersionIds[messageId] && updated[currentVersionIds[messageId]]) {
        updated[currentVersionIds[messageId]] = {
          ...updated[currentVersionIds[messageId]],
          isLiked: newIsLiked,
          isDisliked: newIsDisliked,
        };

        const versionInfo = updated[currentVersionIds[messageId]];
        if (versionInfo.allVersions && versionInfo.currentVersion) {
          const currentVersionIndex = versionInfo.currentVersion - 1;
          if (versionInfo.allVersions[currentVersionIndex]) {
            const updatedVersions = [...versionInfo.allVersions];
            updatedVersions[currentVersionIndex] = {
              ...updatedVersions[currentVersionIndex],
              is_liked: newIsLiked,
              is_disliked: newIsDisliked,
            };

            if (versionInfo.rootMessageId && updated[versionInfo.rootMessageId]) {
              updated[versionInfo.rootMessageId] = {
                ...updated[versionInfo.rootMessageId],
                allVersions: updatedVersions,
              };
            }
          }
        }
      }

      return updated;
    });

    setTimeout(() => {
      if (isFeedbackInProgressRef) {
        isFeedbackInProgressRef.current = false;
      }
    }, 500);
  };

  return {
    messageVersions,
    currentVersionMessageIds,
    setMessageVersions,
    setCurrentVersionMessageIds,
    loadBatchMessageVersions,
    loadMessageVersions,
    handlePreviousVersion,
    handleNextVersion,
    switchToVersion,
    handleFeedbackSuccess,
  };
}
