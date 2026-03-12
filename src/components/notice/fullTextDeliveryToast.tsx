import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { apiGetAuth, apiPatch } from '@/api/request';
import { toast } from 'sonner';

interface UnreadCountResponse {
  unread_count: number;
  by_type: {
    doc_delivery: number;
    system: number;
    account: number;
  };
}

interface NotificationSettingsResponse {
  doc_delivery: boolean;
}

const FullTextDeliveryToast: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const hasFetched = useRef(false);
  const router = useRouter();

  useEffect(() => {
    // 防止 React Strict Mode 导致的重复请求
    if (hasFetched.current) {
      return;
    }
    hasFetched.current = true;

    // 获取通知设置和未读数量
    const fetchNotificationData = async () => {
      try {
        // 并行调用两个接口以提高性能
        const [settingsResponse, countResponse] = await Promise.all([
          apiGetAuth<NotificationSettingsResponse>(
            '/api/user/settings/notifications'
          ),
          apiGetAuth<UnreadCountResponse>(
            '/api/user/notifications/unread-count'
          ),
        ]);

        // 判断是否显示通知：
        //1. 用户开启了文档传递通知 (doc_delivery === true)
        //2. 有未读通知 (unread_count >= 1)
        const isNotificationEnabled = settingsResponse.data.doc_delivery;
        const hasUnreadNotifications = countResponse.data.unread_count >= 1;

        if (isNotificationEnabled && hasUnreadNotifications) {
          setIsVisible(true);
        }
      } catch (error) {
        console.error('获取通知数据失败:', error);
      }
    };

    fetchNotificationData();
  }, []);

  // 处理前往查看按钮点击
  const handleViewClick = async () => {
    try {
      // 标记所有通知为已读
      await apiPatch('/api/user/notifications/read-all', {
        type: 'doc_delivery'
      });

      // 隐藏通知
      setIsVisible(false);

      // 跳转到首页（个人中心）
      router.push('/');
    } catch (error) {
      console.error('标记通知已读失败:', error);
      toast.error('操作失败，请稍后再试');
    }
  };

  // 如果不可见，不渲染任何内容
  if (!isVisible) {
    return null;
  }

  return (
    // 外层容器：固定定位在右下角，设置 z-index 确保在最上层
    <div className="fixed bottom-8 right-8 z-50">
      <div className="
        flex items-center justify-between
        min-w-[450px] px-8 py-5
        bg-[#0D9488]
        border border-[#c6d7ff]
        rounded-[24px]
        shadow-sm
      ">
        {/* 左侧文字区域 */}
        <div className="flex flex-col gap-1">
          <h3 className="text-[#1a1a1a] text-[19px] font-semibold tracking-wide">
            全文传递已完成
          </h3>
          <p className="text-[#5f6368] text-[14px]">
            前往设置-全文传递查看
          </p>
        </div>

        {/* 右侧按钮区域 */}
        <button
          className="
            ml-12 px-7 py-2.5
            bg-[#0D9488] hover:bg-[#0F766E]
            text-white text-[16px] font-medium
            rounded-full
            transition-colors duration-200
          "
          onClick={handleViewClick}
        >
          前往查看
        </button>
      </div>
    </div>
  );
};

export default FullTextDeliveryToast;
