"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useAvatar } from "@/contexts/AvatarContext";
import { useUser } from "@/components/contexts/UserContext";
import { apiGet } from "@/api/request";
import { toast } from "sonner";

interface AvatarHoverMenuProps {
  onAnyModalOpen?: (isOpen: boolean) => void;
}

interface UserInfoData {
  user_id: string;
  phone_number: string;
  nickname: string;
  avatar: string | null;
}

export default function AvatarHoverMenu({
  onAnyModalOpen,
}: AvatarHoverMenuProps) {
  const { avatarUrl } = useAvatar();
  const { userInfo } = useUser();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showPersonalDialog, setShowPersonalDialog] = useState(false);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [userInfoData, setUserInfoData] = useState<UserInfoData | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  const handlePersonalCenter = async () => {
    setIsHovered(false);
    try {
      setLoadingUserInfo(true);
      const response = await apiGet<UserInfoData>("/api/auth/info");

      if (response.code === 200 && response.data) {
        setUserInfoData(response.data);
        setShowPersonalDialog(true);
      } else {
        toast.error("获取用户信息失败");
      }
    } catch (error) {
      console.error("获取用户信息失败:", error);
      toast.error("获取用户信息失败，请稍后再试");
    } finally {
      setLoadingUserInfo(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setShowLogoutDialog(false);
    setShowPersonalDialog(false);
    setIsHovered(false);
    router.push("/login");
  };

  const handleLogoutClick = () => {
    setShowLogoutDialog(true);
  };

  const handleClosePersonalDialog = () => {
    setShowPersonalDialog(false);
  };

  useEffect(() => {
    if (onAnyModalOpen) {
      onAnyModalOpen(isHovered || showLogoutDialog || showPersonalDialog);
    }
  }, [isHovered, showLogoutDialog, showPersonalDialog, onAnyModalOpen]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      <div className="fixed z-50 top-5 right-5">
        <div
          className="relative"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={avatarUrl}
            alt="用户头像"
            className="rounded-full border-2 border-white shadow-md w-12 h-12 object-cover cursor-pointer"
          />

          {isHovered && (
            <div
              className="absolute top-full right-0 mt-2 w-[160px] bg-[#f8fcf9] rounded-[12px] border border-[#d4ede4] shadow-lg overflow-hidden"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={handlePersonalCenter}
                className="w-full px-4 py-3 text-left text-[#2d3748] text-[16px] hover:bg-[#e8f8f0] transition-colors flex items-center gap-2"
              >
                <img
                  src="/settings/settings-person.png"
                  alt="个人中心"
                  className="w-5 h-5"
                />
                个人中心
              </button>
              <button
                onClick={handleLogoutClick}
                className="w-full px-3 py-3 text-left text-[#e53e3e] text-[16px] hover:bg-[#fee2e2] transition-colors flex items-center gap-2"
              >
                <img
                  src="/settings/exit1.png"
                  alt="退出登录"
                  className="w-8 h-8"
                />
                退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 个人中心弹窗 */}
      {showPersonalDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleClosePersonalDialog}
          />
          <div
            className="relative bg-[#f8fcf9] rounded-[20px] border border-[#d4ede4] shadow-[0px_10px_29px_1px_rgba(198,242,224,0.15)] overflow-hidden"
            style={{
              width: "450px",
              height: "320px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-[#d4ede4]">
              <h2 className="text-[22px] font-medium text-[#2d3748]">
                个人中心
              </h2>
              <button
                onClick={handleClosePersonalDialog}
                className="w-8 h-8 flex items-center justify-center text-[#718096] hover:text-[#e53e3e] transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.293 4.293a1 1 0 011.414 0 0 11.414 10.586 1.414 1.414 0-1.414-1.414H5.414m0-6.672V3.672h3.022v8.914l-5.586-5.586a1 1 0 01.414 1.414 0 011.414 1.414 11.414 10.586 1.414-1.414 1.414 1.414H10a1 1 0 01.414 0 011.414 0 011.414 1.414V8.586a1 1 0 00-1.414 1.414 1.414 0 011.414 1.414 10.586 1.414 0 011.414 1.414z" />
                </svg>
              </button>
            </div>

            {/* 内容 */}
            {loadingUserInfo ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#679CFF]"></div>
              </div>
            ) : userInfoData ? (
              <div className="px-8 py-6">
                {/* 头像 */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#d4ede4]">
                    <img
                      src={userInfoData.avatar || avatarUrl}
                      alt="用户头像"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* 用户信息 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <span className="text-[#718096] w-14">昵称:</span>
                    <span className="text-[#2d3748] font-medium">{userInfoData.nickname || "-"}</span>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-[#718096] w-14">手机:</span>
                    <span className="text-[#2d3748] font-medium">{userInfoData.phone_number || "-"}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 退出登录确认弹窗 */}
      {showLogoutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowLogoutDialog(false)}
          />
          <div
            className="relative bg-[#f8fcf9] rounded-[20px] border border-[#d4ede4] shadow-[0px_10px_29px_1px_rgba(198,242,224,0.15)]"
            style={{
              width: "500px",
              height: "220px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mt-[64px]">
              <div
                className="font-medium text-[#2d3748]"
                style={{
                  fontWeight: 500,
                  fontSize: "24px",
                }}
              >
                是否退出登录？
              </div>
            </div>

            <div className="absolute bottom-[49px] left-0 right-0 flex justify-center">
              <button
                className="w-[128px] h-[40px] bg-[#f0faf6] border border-[#d4ede4] rounded-[20px] text-[16px] text-[#2d3748] hover:bg-[#e8f8f0] transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutDialog(false);
                }}
              >
                取消
              </button>

              <button
                className="w-[128px] h-[40px] bg-[#0D9488] text-white rounded-[20px] border-0 text-[16px] hover:scale-[1.01] transition-transform ml-[20px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
