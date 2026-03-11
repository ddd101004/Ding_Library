"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { useAvatar } from "@/contexts/AvatarContext";
import { useUser } from "@/components/contexts/UserContext";
import { apiGet, apiPost } from "@/api/request";

interface AvatarHoverMenuProps {
  onAnyModalOpen?: (isOpen: boolean) => void;
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
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editingPhone, setEditingPhone] = useState("");
  const [showEditPhoneDialog, setShowEditPhoneDialog] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  interface UserInfoData {
    user_id: string;
    phone_number: string;
    nickname: string;
    email: string | null;
    company_name: string | null;
    avatar: string | null;
  }

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
        alert("获取用户信息失败");
      }
    } catch (error) {
      console.error("获取用户信息失败:", error);
      alert("获取用户信息失败，请稍后再试");
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

  const handleEditPhoneClick = () => {
    if (userInfoData?.phone_number) {
      setEditingPhone(userInfoData.phone_number);
    }
    setShowEditPhoneDialog(true);
  };

  const handleSavePhone = async () => {
    if (!editingPhone || editingPhone.length !== 11) {
      alert("请输入有效的手机号（11位数字）");
      return;
    }

    if (!/^\d{11}$/.test(editingPhone)) {
      alert("手机号必须是11位数字");
      return;
    }

    try {
      const response = await apiPost<{ available: boolean }>("/api/auth/check-phone", { phone_number: editingPhone });

      if (response.code === 200) {
        if (response.data && response.data.available) {
          alert("手机号可用");
        } else if (response.data && !response.data.available) {
          alert("手机号已存在，请使用其他手机号");
        }
        return;
      }

      alert("手机号检查成功");
      handleCloseEditPhoneDialog();
    } catch (error) {
      console.error("检查手机号失败:", error);
      alert("检查手机号失败，请稍后再试");
    }
  };

  const handleCloseEditPhoneDialog = () => {
    setShowEditPhoneDialog(false);
    setEditingPhone("");
    setIsEditingPhone(false);
  };

  useEffect(() => {
    if (onAnyModalOpen) {
      onAnyModalOpen(isHovered || showLogoutDialog || showPersonalDialog || showEditPhoneDialog);
    }
  }, [isHovered, showLogoutDialog, showPersonalDialog, showEditPhoneDialog, onAnyModalOpen]);

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
                className="w-full px-4 py-3 text-left text-[#e53e3e] text-[16px] hover:bg-[#fee2e2] transition-colors flex items-center gap-2"
              >
                <img
                  src="/settings/settings-exit.svg"
                  alt="退出登录"
                  className="w-5 h-5"
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
              width: "500px",
              height: "450px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex justify-between items-center px-8 pt-6 pb-4 border-b border-[#d4ede4]">
              <h2 className="text-[24px] font-medium text-[#2d3748]">
                个人中心
              </h2>
              <button
                onClick={handleClosePersonalDialog}
                className="text-[#718096] hover:text-[#e53e3e] transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.293 4.293a1 1 0 011.414 0 0 11.414 10.586 1.414-1.414-0-1.414-1.414H5.414m0-6.672V3.672h3.022v8.914l-5.586-5.586a1 1 0 01.414 1.414 0 011.414 1.414 11.414 10.586 1.414-1.414 1.414-1.414H10a1 1 0 01.414-0 011.414 0 011.414-1.414V8.586a1 1 0 00-1.414 1.414 1.414 0 011.414 1.414 10.586 0 011.414 1.414z" />
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
                  <div className="flex items-center">
                    <span className="text-[#718096] w-20">昵称:</span>
                    <span className="text-[#2d3748] font-medium">{userInfoData.nickname || "-"}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[#718096] w-20">手机:</span>
                    <div className="flex items-center flex-1">
                      <span className="text-[#2d3748] font-medium">{userInfoData.phone_number || "-"}</span>
                      <button
                        onClick={handleEditPhoneClick}
                        className="px-2 py-1 bg-[#679CFF] hover:bg-[#5588ee] text-white rounded transition-colors text-sm"
                      >
                        编辑
                      </button>
                    </div>
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
                className="w-[128px] h-[40px] bg-[#679CFF] text-white rounded-[20px] border-0 text-[16px] hover:bg-[#5588ee] transition-colors ml-[20px]"
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

      {/* 编辑手机号弹窗 */}
      {showEditPhoneDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCloseEditPhoneDialog}
          />
          <div
            className="relative bg-[#f8fcf9] rounded-[20px] border border-[#d4ede4] shadow-[0px_10px_29px_1px_rgba(198,242,224,0.15)]"
            style={{
              width: "400px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 标题 */}
            <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-[#d4ede4]">
              <h3 className="text-[20px] font-medium text-[#2d3748]">
                修改手机号
              </h3>
              <button
                onClick={handleCloseEditPhoneDialog}
                className="text-[#718096] hover:text-[#e53e3e] transition-colors"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4.293 4.293a1 1 0 011.414 0 0 11.414 10.586 1.414 1.414 0-1.414-1.414H5.414m0-6.672V3.672h3.022v8.914l-5.586-5.586a1 1 0 01.414 1.414 0 011.414 1.414 11.414 10.586 1.414-1.414 1.414H10a1 1 0 01.414 0 011.414 0 011.414 1.414V8.586a1 1 0 00-1.414 1.414 1.414 0 011.414 1.414 10.586 1.414 0 011.414 1.414z" />
                </svg>
              </button>
            </div>

            {/* 内容 */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-[#718096] text-[14px] mb-2">
                  新手机号
                </label>
                <input
                  type="text"
                  value={editingPhone}
                  onChange={(e) => setEditingPhone(e.target.value.replace(/\D/g, ""))}
                  maxLength={11}
                  placeholder="请输入11位手机号"
                  className="w-full px-4 py-3 border border-[#d4ede4] rounded-lg text-[16px] focus:outline-none focus:ring-2 focus:ring-[#679CFF]"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseEditPhoneDialog}
                  className="px-6 py-2 bg-[#f0faf6] border border-[#d4ede4] rounded-lg text-[16px] text-[#2d3748] hover:bg-[#e8f8f0] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSavePhone}
                  className="px-6 py-2 bg-[#679CFF] text-white rounded-lg text-[16px] hover:bg-[#5588ee] transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
