"use client";
import React, { useRef, useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDel, apiPatch } from "@/api/request";
import { useRouter } from "next/router";
import { toast } from "sonner";
import { useAvatar } from "@/contexts/AvatarContext";
import { useAvatarPopup } from "@/contexts/AvatarPopupContext";
import { useUser } from "@/components/contexts/UserContext";

interface UserInfo {
  user_id: string;
  phone_number: string;
  nickname: string;
  company_name: string | null;
  email?: string | null;
  avatar?: string | null;
}

interface Author {
  name: string;
  name_zh?: string;
}


interface DocDeliveryItem {
  id: string;
  task_id: string;
  paper_id: string;
  title: string;
  authors: (string | Author)[];
  publication_name: string;
  publication_year: number;
  abstract: string;
  doi: string;
  tags: string[] | null;
  subject_category: string;
  article_type: string;
  status: number;
  status_text: string;
  fulltext_url: string;
  create_time: string;
  completed_time: string;
}

interface DocDeliveryResponse {
  items: DocDeliveryItem[];
  total: number;
  page: number;
  limit: number;
}

interface AvatarUploadSignature {
  cos_key: string;
  signed_url: string;
  expires_at: string;
  method: string;
  headers: {
    "Content-Type": string;
  };
}

interface AvatarPopupProps {
  show: boolean;
  onClose: () => void;
  onAnyModalOpen?: (isOpen: boolean) => void;
}

export default function AvatarPopup({ show, onClose, onAnyModalOpen }: AvatarPopupProps) {
  const { avatarUrl, setAvatarUrl, refreshAvatar } = useAvatar();
  const { updateUserInfo } = useUser();
  const { isOpen, activePage: contextActivePage, closeAvatarPopup } = useAvatarPopup();
  const [settingsPopupShow, setSettingsPopupShow] = React.useState(false);
  const [activePage, setActivePage] = React.useState("personal");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "completed">("all");
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 全文传递相关状态
  const [deliveryItems, setDeliveryItems] = useState<DocDeliveryItem[]>([]);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const deliveryContainerRef = useRef<HTMLDivElement>(null);

  // 个人信息编辑相关状态
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [saving, setSaving] = useState(false);

  // 通知设置相关状态
  const [docDelivery, setDocDelivery] = useState(true);

  // 获取通知设置
  const fetchNotificationSettings = async () => {
    try {
      const response = await apiGet<{ doc_delivery: boolean }>("/api/user/settings/notifications");

      if (response.code === 200 && response.data) {
        setDocDelivery(response.data.doc_delivery);
      }
    } catch (error) {
      console.error("获取通知设置失败:", error);
    }
  };

  // 更新通知设置
  const handleToggleDocDelivery = async (checked: boolean) => {
    try {
      const response = await apiPatch("/api/user/settings/notifications", {
        doc_delivery: checked,
      });

      if (response.code === 200) {
        setDocDelivery(checked);
        toast.success(checked ? "已开启全文传递通知" : "已关闭全文传递通知");
      } else {
        throw new Error(response.message || "设置失败");
      }
    } catch (error: any) {
      console.error("更新通知设置失败:", error);
      toast.error(error.message || "设置失败，请稍后再试");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await apiDel("/api/user/account", {
        data: {
          confirmation: "DELETE",
        },
      });

      if (response.code === 200) {
        toast.success("账户已删除");
        // 清除本地存储的token
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
        }
        setShowDeleteDialog(false);
        onClose(); // 关闭头像弹窗
        router.push("/"); // 跳转到首页
      } else {
        toast.error(response.message || "删除失败，请稍后再试");
        setShowDeleteDialog(false);
      }
    } catch (error: any) {
      toast.error(error.message || "删除失败，请稍后再试");
      setShowDeleteDialog(false);
    }
  };

  const handleLogout = () => {
    // 清除本地存储的token
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setShowLogoutDialog(false);
    onClose(); // 关闭头像弹窗
    router.push("/"); // 跳转到首页
  };

  const openSettingsPopup = (page: string) => {
    setActivePage(page);
    setSettingsPopupShow(true);
    // 打开设置弹窗时关闭头像弹窗
    onClose();
  };

  const closeSettingsPopup = () => {
    setSettingsPopupShow(false);
  };

  const avatarPopupRef = useRef<HTMLDivElement>(null);
  const settingsPopupRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 移除点击外部关闭的effect，改为在弹窗上添加onMouseLeave事件

  // 通知外部组件是否有任何弹窗打开
  useEffect(() => {
    if (onAnyModalOpen) {
      onAnyModalOpen(show || settingsPopupShow || showDeleteDialog || showLogoutDialog);
    }
  }, [show, settingsPopupShow, showDeleteDialog, showLogoutDialog, onAnyModalOpen]);

  // 监听 AvatarPopupContext 的状态变化
  useEffect(() => {
    if (isOpen && contextActivePage) {
      setActivePage(contextActivePage);
      setSettingsPopupShow(true);
      closeAvatarPopup();
    }
  }, [isOpen, contextActivePage, closeAvatarPopup]);

  useEffect(() => {
    if (activePage === "personal" && settingsPopupShow) {
      fetchUserInfo();
    }
  }, [activePage, settingsPopupShow]);

  useEffect(() => {
    if (activePage === "notification" && settingsPopupShow) {
      fetchNotificationSettings();
    }
  }, [activePage, settingsPopupShow]);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const response = await apiGet<UserInfo>("/api/auth/info");

      if (response.code === 200 && response.data) {
        setUserInfo(response.data);
        // 初始化昵称和邮箱
        setNickname(response.data.nickname || "");
        setEmail(response.data.email || "");
      } else {
        throw new Error(response.message || "获取用户信息失败");
      }
    } catch (error) {
      toast.error("获取用户信息失败，请稍后重试");
      console.error("Failed to fetch user info:", error);
    } finally {
      setLoading(false);
    }
  };

  // 验证邮箱格式
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // 验证昵称
  const validateNickname = (value: string): boolean => {
    if (value.length < 2) {
      setNicknameError("昵称至少需要2个字符");
      return false;
    }
    if (value.length > 50) {
      setNicknameError("昵称不能超过50个字符");
      return false;
    }
    setNicknameError("");
    return true;
  };

  // 验证邮箱
  const validateEmail = (value: string): boolean => {
    if (value && !isValidEmail(value)) {
      setEmailError("请输入有效的邮箱地址");
      return false;
    }
    setEmailError("");
    return true;
  };

  // 保存个人信息
  const handleSaveProfile = async () => {
    // 验证昵称
    if (!validateNickname(nickname)) {
      return;
    }

    // 验证邮箱
    if (email && !validateEmail(email)) {
      return;
    }

    try {
      setSaving(true);
      toast.loading("正在保存...", { id: "save-profile" });

      const response = await apiPatch("/api/auth/info", {
        nickname,
        email,
      });

      if (response.code === 200) {
        // 更新本地用户信息
        setUserInfo((prev) => ({
          ...prev,
          nickname: nickname,
          email,
        } as UserInfo));

        // 同步更新 UserContext 和 localStorage 中的用户信息
        updateUserInfo({ username: nickname });

        toast.success("保存成功", { id: "save-profile" });
      } else {
        throw new Error(response.message || "保存失败");
      }
    } catch (error: any) {
      console.error("保存个人信息失败:", error);
      toast.error(error.message || "保存失败，请稍后再试", {
        id: "save-profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("仅支持 JPG、JPEG 或 PNG 格式的图片");
      return;
    }

    // 验证文件大小（1MB）
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("图片大小不能超过 1MB");
      return;
    }

    try {
      setUploading(true);
      toast.loading("正在上传头像...", { id: "avatar-upload" });

      // 步骤 1: 获取上传签名
      const signatureResponse = await apiPost<AvatarUploadSignature>(
        "/api/user/avatar",
        {
          file_name: file.name,
          file_size: file.size,
        }
      );

      if (signatureResponse.code !== 200 || !signatureResponse.data) {
        throw new Error(signatureResponse.message || "获取上传签名失败");
      }

      const { cos_key, signed_url, method, headers } = signatureResponse.data;

      // 步骤 2: 上传文件到 COS
      await fetch(signed_url, {
        method: method,
        headers: headers,
        body: file,
      });

      // 步骤 3: 调用 PUT /api/user/avatar 确认上传
      const confirmResponse = await apiPut<{ avatar: string; avatar_key: string }>(
        "/api/user/avatar",
        { cos_key }
      );

      if (confirmResponse.code !== 200 || !confirmResponse.data) {
        throw new Error(confirmResponse.message || "头像更新失败");
      }

      // 刷新全局头像状态
      await refreshAvatar();

      toast.success("头像上传成功", { id: "avatar-upload" });
    } catch (error: any) {
      console.error("头像上传失败:", error);
      toast.error(error.message || "头像上传失败，请稍后再试", {
        id: "avatar-upload",
      });
    } finally {
      setUploading(false);
      // 清空 input 允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeleteAvatar = async () => {
    try {
      setUploading(true);
      toast.loading("正在删除头像...", { id: "avatar-delete" });

      const response = await apiDel("/api/user/avatar");

      if (response.code === 200) {
        // 刷新全局头像状态
        await refreshAvatar();
        toast.success("头像已删除", { id: "avatar-delete" });
      } else {
        throw new Error(response.message || "删除失败");
      }
    } catch (error: any) {
      console.error("删除头像失败:", error);
      toast.error(error.message || "删除头像失败，请稍后再试", {
        id: "avatar-delete",
      });
    } finally {
      setUploading(false);
    }
  };

  // 获取全文传递列表
  const fetchDeliveryList = async (page: number = 1, append: boolean = false) => {
    try {
      setDeliveryLoading(true);
      const status = activeTab === "all" ? "all" : activeTab;

      const params = new URLSearchParams({
        status,
        page: page.toString(),
        limit: "20",
      });

      const response = await apiGet<DocDeliveryResponse>(`/api/doc-delivery/list?${params.toString()}`);

      if (response.code === 200 && response.data) {
        const { items, total, limit } = response.data;

        if (append) {
          setDeliveryItems((prev) => [...prev, ...items]);
        } else {
          setDeliveryItems(items);
        }

        setDeliveryPage(page);
        setDeliveryTotal(total);
        setHasMore(items.length === limit && page * limit < total);
      } else {
        throw new Error(response.message || "获取全文传递列表失败");
      }
    } catch (error: any) {
      console.error("获取全文传递列表失败:", error);
      toast.error(error.message || "获取全文传递列表失败，请稍后再试");
    } finally {
      setDeliveryLoading(false);
    }
  };

  // 监听 activeTab 变化，重新加载数据
  useEffect(() => {
    if (activePage === "delivery" && settingsPopupShow) {
      setDeliveryPage(1);
      setDeliveryItems([]);
      fetchDeliveryList(1, false);
    }
  }, [activeTab, activePage, settingsPopupShow]);

  // 监听滚动事件，实现无限滚动
  useEffect(() => {
    const container = deliveryContainerRef.current;
    if (!container || activePage !== "delivery" || deliveryLoading || !hasMore) {
      return;
    }

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !deliveryLoading) {
        fetchDeliveryList(deliveryPage + 1, true);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [activePage, deliveryLoading, hasMore, deliveryPage]);

  // 防止弹窗内容滚动
  useEffect(() => {
    if (settingsPopupShow || showDeleteDialog || showLogoutDialog) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [settingsPopupShow, showDeleteDialog, showLogoutDialog]);

  if (!show && !settingsPopupShow && !showDeleteDialog && !showLogoutDialog) return null;

  return (
    <>
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* 头像弹窗 */}
      {show && (
        <div
          ref={avatarPopupRef}
          className="absolute z-40 top-[calc(100%+20px)] right-0"
          onClick={(e) => e.stopPropagation()}
          onMouseLeave={onClose} // 添加这行：鼠标移出时关闭弹窗
        >
          <div className="w-[360px] h-[535px] rounded-[30px] overflow-hidden relative">
            <div
              className="absolute inset-0 bg-[length:100%_108%] bg-center bg-no-repeat"
              style={{
                backgroundImage: "url('/background/settings-bg@2x.png')",
              }}
            />

            <div className="relative w-full h-full flex flex-col items-center pt-[36px]">
              {/* 头像 */}
              <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-4 border-white mb-[20px]">
                <img
                  src={avatarUrl}
                  alt="用户头像"
                  width={90}
                  height={90}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 用户信息 */}
              <div className="w-full mb-[40px]">
                {/* 第一行 */}
                <div className="flex items-center mb-[20px] ml-[63px]">
                  <img
                    src="/settings/settings-personcard@2x.png"
                    alt="职位"
                    width={20}
                    height={16}
                    className="w-[20px] h-[16px] mr-[17px] self-end"
                  />
                  <span
                    className="text-[#333333] font-normal"
                    style={{
                      width: "98px",
                      height: "16px",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "16px",
                    }}
                  >
                    研究员（VIP）
                  </span>
                </div>
                {/* 第二行 */}
                <div className="flex items-center ml-[63px]">
                  <img
                    src="/settings/settings-position@2x.png"
                    alt="位置"
                    width={17}
                    height={20}
                    className="w-[17px] h-[20px] mr-[17px] self-end"
                  />
                  <span
                    className="text-[#333333] font-normal"
                    style={{
                      width: "98px",
                      height: "16px",
                      fontWeight: 400,
                      fontSize: "16px",
                      lineHeight: "16px",
                    }}
                  >
                    上海市临港
                  </span>
                </div>
              </div>

              {/* 功能菜单白色背景框 */}
              <div className="w-[260px] h-[200px] bg-white rounded-[20px] opacity-80 mb-4">
                <div className="w-full h-full flex flex-col justify-center px-7">
                  {/* 第一行 */}
                  <div className="flex justify-between mb-6 mt-4">
                    <div
                      className="flex flex-col items-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettingsPopup("personal");
                      }}
                    >
                      <img
                        src="/settings/settings-person.png"
                        alt="个人中心"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px] mb-[6px]"
                      />
                      <span className="text-[16px] text-[#666666] font-normal leading-[40px]">
                        个人中心
                      </span>
                    </div>
                    <div
                      className="flex flex-col items-center cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettingsPopup("delivery");
                      }}
                    >
                      <img
                        src="/settings/settings-pullpaper@2x.png"
                        alt="全文传递"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px] mb-[6px]"
                      />
                      <span className="text-[16px] text-[#666666] font-normal leading-[40px]">
                        全文传递
                      </span>
                    </div>
                  </div>

                  {/* 第二行 */}
                  <div className="flex justify-between">
                    <div
                      className="flex flex-col items-center ml-[20px] cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettingsPopup("notification");
                      }}
                    >
                      <img
                        src="/settings/settings-inform@2x.png"
                        alt="通知"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px] mb-[6px]"
                      />
                      <span className="text-[16px] text-[#666666] font-normal leading-[40px]">
                        通知
                      </span>
                    </div>
                    <div
                      className="flex flex-col items-center cursor-pointer pr-[14px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        openSettingsPopup("system");
                      }}
                    >
                      <img
                        src="/settings/settings-setting@2x.png"
                        alt="系统设置"
                        width={30}
                        height={30}
                        className="w-[30px] h-[30px] mb-[6px]"
                      />
                      <span className="text-[16px] text-[#666666] font-normal leading-[40px]">
                        系统
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 退出登录按钮 */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutDialog(true);
                }}
                className="w-[260px] h-[40px] bg-blue-500 rounded-[20px] opacity-80 flex items-center justify-center gap-3 hover:bg-blue-600 transition-colors border border-gray-200"
              >
                <img
                  src="/settings/settings-exit.svg"
                  alt="退出登录"
                  width={19}
                  height={20}
                  className="w-[19px] h-[20px]"
                />
                <span className="text-[16px] text-white font-normal leading-[40px]">
                  退出登录
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置弹窗 - 保持点击外部关闭 */}
      {settingsPopupShow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeSettingsPopup}
          />
          {/* 弹窗容器 */}
          <div
            ref={settingsPopupRef}
            className="relative bg-white rounded-[20px] border border-[#E9ECF2] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)] overflow-hidden"
            style={{
              width: "864px",
              height: "673px",
            }}
            onClick={(e) => e.stopPropagation()} // 阻止设置弹窗内部点击事件冒泡
          >
            {/* 标题区域 */}
            <div className="absolute left-[31px] top-[26px]">
              <h2
                className="text-[#333333] font-medium"
                style={{
                  width: "78px",
                  height: "28px",
                  fontWeight: 500,
                  fontSize: "30px",
                  lineHeight: "40px",
                }}
              >
                设置
              </h2>
            </div>

            {/* 应用习惯文字 */}
            <div className="absolute left-[109px] top-[30px]">
              <span
                className="text-[#333333] font-normal"
                style={{
                  fontSize: "16px",
                  fontWeight: 400,
                  lineHeight: "40px",
                }}
              >
                设置您的大模型应用习惯
              </span>
            </div>

            {/* 上分割线 */}
            <div
              className="absolute left-0 top-[calc(26px+40px+27px)]"
              style={{
                width: "803px",
                height: "1px",
                background: "#E0E1E5",
                borderRadius: "1px",
                left: "50%",
                transform: "translateX(-50%)",
              }}
            />

            {/* 内容区域 */}
            <div className="absolute inset-0 pt-[calc(26px+40px+27px+1px)]">
              <div className="flex h-full">
                <div className="w-[220px] p-4 relative">
                  <div
                    className="absolute right-0 top-0 bottom-0"
                    style={{
                      width: "1px",
                      height: "622px",
                      background: "#E0E1E5",
                      borderRadius: "1px",
                    }}
                  />
                  <nav className="flex-1">
                    <ul>
                      <li className="mb-2">
                        <button
                          className={`flex items-center w-full px-4 py-3 rounded-lg text-[16px] ${
                            activePage === "personal"
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => setActivePage("personal")}
                        >
                          <img
                            src={
                              activePage === "personal"
                                ? "/settings/settings-shinyperson@2x.png"
                                : "/settings/settings-person.png"
                            }
                            alt="个人中心"
                            className="w-5 h-5 ml-6"
                          />
                          <span style={{ marginLeft: "20px" }}>个人中心</span>
                        </button>
                      </li>
                      <li className="mb-2">
                        <button
                          className={`flex items-center w-full px-4 py-3 rounded-lg text-[16px] ${
                            activePage === "delivery"
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => setActivePage("delivery")}
                        >
                          <img
                            src={
                              activePage === "delivery"
                                ? "/settings/settings-shinypullpaper@2x.png"
                                : "/settings/settings-pullpaper@2x.png"
                            }
                            alt="全文传递"
                            className="w-5 h-5 ml-6"
                          />
                          <span style={{ marginLeft: "20px" }}>全文传递</span>
                        </button>
                      </li>
                      <li className="mb-2">
                        <button
                          className={`flex items-center w-full px-4 py-3 rounded-lg text-[16px] ${
                            activePage === "notification"
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => setActivePage("notification")}
                        >
                          <img
                            src={
                              activePage === "notification"
                                ? "/settings/settings-shinyinform@2x.png"
                                : "/settings/settings-inform@2x.png"
                            }
                            alt="通知"
                            className="w-5 h-5 ml-6"
                          />
                          <span style={{ marginLeft: "20px" }}>通知</span>
                        </button>
                      </li>
                      <li className="mb-2">
                        <button
                          className={`flex items-center w-full px-4 py-3 rounded-lg text-[16px] ${
                            activePage === "system"
                              ? "bg-blue-50 text-blue-600"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                          onClick={() => setActivePage("system")}
                        >
                          <img
                            src={
                              activePage === "system"
                                ? "/settings/settings-shinysetting@2x.png"
                                : "/settings/settings-setting@2x.png"
                            }
                            alt="系统设置"
                            className="w-5 h-5 ml-6"
                          />
                          <span style={{ marginLeft: "20px" }}>系统</span>
                        </button>
                      </li>
                    </ul>
                  </nav>
                </div>

                {/* 右侧内容区域 */}
                <div className="flex-1 bg-white">
                  {/* 个人中心 */}
                  {activePage === "personal" && (
                    <div className="h-full pl-[30px] pt-[30px]">
                      <h2 className="text-[20px] font-bold text-[#333333] mb-6 ">
                        个人中心
                      </h2>
                      <div>
                        <div className="flex items-center mb-4">
                          <h2 className="font-medium text-gray-900 mr-[9px]">
                            头像
                          </h2>
                          <span className="text-[14px] text-[#999999]">
                            更新头像
                          </span>
                        </div>
                        <div className="flex items-center space-x-6">
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden">
                              <img
                                src={avatarUrl}
                                alt="用户头像"
                                className="w-full h-full object-cover"
                                width={80}
                                height={80}
                              />
                            </div>
                          </div>

                          {/* 上传图片按钮 */}
                          <div
                            className="w-[128px] h-[40px] bg-white rounded-[20px] border border-[#C8C9CC] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ marginLeft: "23px" }}
                            onClick={handleFileSelect}
                          >
                            <img
                              src="/paper/paper-save@2x.png"
                              alt="上传"
                              className="w-4 h-4 mr-2"
                            />
                            <span className="text-sm">{uploading ? "上传中..." : "上传图片"}</span>
                          </div>

                          {/* 删除按钮 */}
                          <div
                            className="w-[40px] h-[40px] bg-white rounded-[20px] border border-[#C8C9CC] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                            style={{ marginLeft: "20px" }}
                            onClick={handleDeleteAvatar}
                          >
                            <img
                              src="/settings/settings-delete@2x.png"
                              alt="删除"
                              width={15}
                              height={15}
                              className="w-[15px] h-[15px]"
                            />
                          </div>
                        </div>

                        <p className="text-[14px] text-[#999999] mt-[5px]">
                          我们仅支持2MB以内的JPG，JPEG或PNG文件
                        </p>
                      </div>
                      <div>
                        <div className="flex items-center mb-[20px] mt-6">
                          <h2 className="text-[16px] font-medium text-gray-900 mr-[10px]">
                            个人信息
                          </h2>
                          <span className="text-[14px] text-[#999999]">
                            编辑您的个人信息
                          </span>
                        </div>

                        <div className="space-y-4">
                          {/* 昵称输入框 */}
                          <div>
                            <div className="w-[582px] h-[36px] bg-white rounded-[4px] border border-[#E1E2E6] flex items-center">
                              <div className="flex items-center ml-[21px] relative">
                                <div className="w-[6px] h-[6px] bg-red-500 rounded-full absolute left-[-8px] top-1/2 transform -translate-y-1/2"></div>
                                <span className="text-[16px] text-[#999999] mr-[20px]">
                                  昵称
                                </span>
                              </div>
                              <div className="w-[1px] h-[16px] bg-[#E2E3E7]"></div>
                              <input
                                type="text"
                                value={loading ? "加载中..." : nickname}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setNickname(value);
                                  validateNickname(value);
                                }}
                                className="flex-1 px-[15px] border-0 focus:outline-none text-[16px] bg-white"
                                style={{ marginLeft: "15px" }}
                                placeholder="请输入昵称"
                              />
                            </div>
                            {nicknameError && (
                              <p className="text-red-500 text-xs mt-1 ml-[100px]">{nicknameError}</p>
                            )}
                          </div>

                          {/* 邮箱输入框 */}
                          <div>
                            <div className="w-[582px] h-[36px] bg-white rounded-[4px] border border-[#E1E2E6] flex items-center">
                              <div className="flex items-center ml-[21px] relative">
                                <div className="w-[6px] h-[6px] bg-red-500 rounded-full absolute left-[-8px] top-1/2 transform -translate-y-1/2"></div>
                                <span className="text-[16px] text-[#999999] mr-[20px]">
                                  邮件
                                </span>
                              </div>
                              <div className="w-[1px] h-[16px] bg-[#E2E3E7]"></div>
                              <input
                                type="email"
                                value={loading ? "加载中..." : email}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setEmail(value);
                                  validateEmail(value);
                                }}
                                className="flex-1 px-[15px] border-0 focus:outline-none text-[16px] bg-white"
                                style={{ marginLeft: "15px" }}
                                placeholder="请输入邮箱"
                              />
                            </div>
                            {emailError && (
                              <p className="text-red-500 text-xs mt-1 ml-[100px]">{emailError}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* 电话号码部分 */}
                      <div>
                        <div className="flex items-center mb-[20px] mt-6">
                          <h2 className="text-[16px] font-medium text-gray-900 mr-[10px]">
                            电话号码
                          </h2>
                          <span className="text-[14px] text-[#999999]">
                            更新您的电话号码
                          </span>
                        </div>

                        <div>
                          {/* 电话输入框 */}
                          <div className="w-[582px] h-[36px] bg-white rounded-[4px] border border-[#E1E2E6] flex items-center">
                            <div className="flex items-center ml-[21px] relative">
                              <div className="w-[6px] h-[6px] bg-red-500 rounded-full absolute left-[-8px] top-1/2 transform -translate-y-1/2"></div>
                              <span className="text-[16px] text-[#999999] mr-[20px]">
                                电话
                              </span>
                            </div>
                            <div className="w-[1px] h-[16px] bg-[#E2E3E7]"></div>
                            <input
                              type="tel"
                              value={
                                loading
                                  ? "加载中..."
                                  : userInfo?.phone_number
                                  ? `${userInfo.phone_number}`
                                  : ""
                              }
                              readOnly
                              className="flex-1 px-[15px] border-0 focus:outline-none text-[16px] bg-transparent"
                              style={{ marginLeft: "15px" }}
                            />
                          </div>
                        </div>
                      </div>
                      {/* 保存更改按钮 */}
                      <div
                        className="flex justify-end gap-3"
                        style={{ marginTop: "28px", marginRight: "36px" }}
                      >
                        {/* 保存按钮 */}
                        <button
                          className="w-[128px] h-[40px] bg-[#3B80FF] text-white rounded-[20px] border-0 text-[16px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleSaveProfile}
                          disabled={saving || !!nicknameError || !!emailError}
                        >
                          {saving ? "保存中..." : "保存更改"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 全文传递 */}
                  {activePage === "delivery" && (
                    <div className="h-full pl-[30px] pt-[30px]">
                      {/* 标题和筛选区域在同一行 */}
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[20px] font-bold text-[#333333]">
                          全文传递
                        </h2>
                        {/* 状态筛选框 */}
                        <div className="w-[240px] h-[40px] bg-[#F7F8FA] rounded-[20px] border border-[#C8C9CC] flex mr-[30px]">
                          <button
                            className={`flex-1 rounded-[20px] text-[16px] font-medium ${
                              activeTab === "all"
                                ? "bg-white shadow-[0px_0px_10px_0px_rgba(89,106,178,0.1)] text-[#333333]"
                                : "text-[#999999]"
                            }`}
                            onClick={() => setActiveTab("all")}
                            style={{ fontWeight: 500 }}
                          >
                            全部
                          </button>
                          <button
                            className={`flex-1 rounded-[20px] text-[16px] font-medium ${
                              activeTab === "pending"
                                ? "bg-white shadow-[0px_0px_10px_0px_rgba(89,106,178,0.1)] text-[#333333]"
                                : "text-[#999999]"
                            }`}
                            onClick={() => setActiveTab("pending")}
                            style={{ fontWeight: 500 }}
                          >
                            传递中
                          </button>
                          <button
                            className={`flex-1 rounded-[20px] text-[16px] font-medium ${
                              activeTab === "completed"
                                ? "bg-white shadow-[0px_0px_10px_0px_rgba(89,106,178,0.1)] text-[#333333]"
                                : "text-[#999999]"
                            }`}
                            onClick={() => setActiveTab("completed")}
                            style={{ fontWeight: 500 }}
                          >
                            已完成
                          </button>
                        </div>
                      </div>

                      {/* 内容区域 */}
                      <div
                        ref={deliveryContainerRef}
                        className="space-y-5 overflow-y-auto pr-2 scrollbar-thin"
                        style={{
                          marginBottom: "34px",
                          maxHeight: "500px",
                        }}
                      >
                        {deliveryLoading && deliveryItems.length === 0 ? (
                          <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          </div>
                        ) : deliveryItems.length === 0 ? (
                          <div className="flex justify-center items-center py-10 text-gray-500">
                            暂无数据
                          </div>
                        ) : (
                          deliveryItems.map((item, index) => (
                            <div
                              key={item.id}
                              className="paper-card paper-card-bg mb-2.5"
                            >
                              {/* 完成状态标识 */}
                              {item.status === 8 && (
                                <div className="absolute right-5 top-5 z-2">
                                  <img
                                    src="/chat-page/chat-page-success@2x.png"
                                    alt="已完成"
                                    width={30}
                                    height={30}
                                  />
                                </div>
                              )}

                              {/* 论文内容 */}
                              <div className="px-6" style={{ paddingTop: '40px' }}>
                                <div className="flex items-start">
                                  {/* 蓝色圆点 */}
                                  <div className="blue-dot mt-2 ml-2.5 mr-2.5" />

                                  {/* 引用标记 */}
                                  <span className="reference-tag mt-0.5 mr-2.5">
                                    [{index + 1}]
                                  </span>

                                  <div className="flex-1 min-w-0">
                                    <h4 className="paper-title mb-4 max-w-[calc(100%-110px)]">
                                      {item.title}
                                    </h4>

                                    {/* 作者和发表时间在同一行 */}
                                    {item.authors && item.authors.length > 0 && (
                                      <div className="authors-container -ml-10">
                                        {/* 作者列表 */}
                                        <div className="flex items-center">
                                          {item.authors.slice(0, 2).map((author, authorIndex) => (
                                            <React.Fragment key={authorIndex}>
                                              <span className="truncate">{typeof author === 'string' ? author : author.name}</span>
                                              {authorIndex === 0 && item.authors.length > 1 && (
                                                <div className="author-divider" />
                                              )}
                                            </React.Fragment>
                                          ))}
                                          {item.authors.length > 2 && (
                                            <span className="ml-0.5 flex-shrink-0">...</span>
                                          )}
                                        </div>

                                        {/* 发表时间 */}
                                        {item.publication_year && (
                                          <span className="ml-1.5 flex-shrink-0">
                                            ({item.publication_year})
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* 分隔线 */}
                                <div className="absolute bottom-[120px] left-0 right-0">
                                  <div className="divider-horizontal ml-10" style={{ width: '465px' }} />
                                </div>

                                {/* 摘要区域 */}
                                <div className="absolute bottom-[132px] left-10 abstract-container abstract-container-lg">
                                  <span className="abstract-text">
                                    {item.abstract || '暂无摘要'}
                                  </span>
                                </div>

                                {/* 按钮组 - 只在已完成(status=8)时显示 */}
                                {item.status === 8 && (
                                  <div className="absolute bottom-[62px] left-10 flex items-center gap-2.5">
                                    {/* PDF 按钮 */}
                                    <div className="action-button">
                                      <img
                                        src="/paper/paper-shinydownload.png"
                                        alt="pdf"
                                        className="icon-sm"
                                      />
                                      <span className="ml-2.5 text-base text-gray-500">
                                        PDF
                                      </span>
                                    </div>

                                    {/* AI伴读按钮 */}
                                    <div className="action-button">
                                      <img
                                        src="/paper/paper-ai-read@2x.png"
                                        alt="AI伴读"
                                        className="icon-sm"
                                      />
                                      <span className="ml-2.5 text-base text-gray-500">
                                        AI伴读
                                      </span>
                                    </div>

                                    {/* 已加入按钮 */}
                                    <div className="action-button">
                                      <img
                                        src="/paper/paper-star.png"
                                        alt="已加入"
                                        className="icon-sm"
                                      />
                                      <span className="ml-2.5 text-base text-gray-500">
                                        已加入
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {deliveryLoading && deliveryItems.length > 0 && (
                          <div className="flex justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                          </div>
                        )}
                        {!hasMore && deliveryItems.length > 0 && (
                          <div className="text-center text-gray-500 text-sm pb-4" style={{ marginBottom: '12px',marginTop:"0" }}>
                            没有更多数据了
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 通知 */}
                  {activePage === "notification" && (
                    <div className="h-full pl-[30px] pt-[30px]">
                      <h2 className="text-[20px] font-bold text-[#333333] mb-2">
                        通知
                      </h2>
                      <div>
                        <div className="flex items-center justify-between py-4 w-[582px]">
                          <span className="text-gray-700 text-m">全文传递</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={docDelivery}
                              onChange={(e) => handleToggleDocDelivery(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 系统 */}
                  {activePage === "system" && (
                    <div className="h-full pl-[30px] pt-[30px]">
                      <h2 className="text-[20px] font-bold text-[#333333] mb-4">
                        系统
                      </h2>
                      <div>
                        <div className="mb-8">
                          <div className="flex items-center justify-between w-[582px]">
                            <span className="text-m text-gray-700">
                              删除账户
                            </span>
                            <button
                              className="w-[83px] h-[36px] bg-[#FF4B4B] text-white rounded-[18px] border-0 hover:shadow-lg transition-shadow"
                              onClick={(e) => {
                                e.stopPropagation(); // 阻止事件冒泡
                                setShowDeleteDialog(true);
                              }}
                            >
                              删除
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeSettingsPopup();
              }}
              className="absolute top-8 right-4 w-8 h-8 flex items-center justify-center z-10"
            >
              <img
                src="/settings/settings-cancel.svg"
                alt="关闭"
                width={25}
                height={25}
              />
            </button>
          </div>
        </div>
      )}

      {/* 删除账户确认弹窗 */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowDeleteDialog(false)}
          />
          <div
            className="relative bg-white rounded-[20px] border border-[#E9ECF2] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)]"
            style={{
              width: "500px",
              height: "220px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-delete-dialog="true"
          >
            {/* 删除账户确认文字 */}
            <div className="flex justify-center mt-[64px]">
              <div
                className="font-medium text-[#333333]"
                style={{
                  fontWeight: 500,
                  fontSize: "24px",
                }}
              >
                是否删除账户？
              </div>
            </div>

            {/* 按钮区域 */}
            <div
              className="absolute bottom-[49px] left-0 right-0 flex justify-center"
            >
              {/* 取消按钮 */}
              <button
                className="w-[128px] h-[40px] bg-white border border-[#C8C9CC] rounded-[20px] text-[16px] text-[#666666] hover:shadow-lg transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(false);
                }}
              >
                取消
              </button>

              {/* 确认按钮 */}
              <button
                className="w-[128px] h-[40px] bg-[#FF4B4B] text-white rounded-[20px] border-0 text-[16px] hover:bg-red-600 transition-colors ml-[20px]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteAccount();
                }}
              >
                确认
              </button>
            </div>
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
            className="relative bg-white rounded-[20px] border border-[#E9ECF2] shadow-[0px_10px_29px_1px_rgba(89,106,178,0.1)]"
            style={{
              width: "500px",
              height: "220px",
            }}
            onClick={(e) => e.stopPropagation()}
            data-logout-dialog="true"
          >
            {/* 退出登录确认文字 */}
            <div className="flex justify-center mt-[64px]">
              <div
                className="font-medium text-[#333333]"
                style={{
                  fontWeight: 500,
                  fontSize: "24px",
                }}
              >
                是否退出登录？
              </div>
            </div>

            {/* 按钮区域 */}
            <div
              className="absolute bottom-[49px] left-0 right-0 flex justify-center"
            >
              {/* 取消按钮 */}
              <button
                className="w-[128px] h-[40px] bg-white border border-[#C8C9CC] rounded-[20px] text-[16px] text-[#666666] hover:shadow-lg transition-shadow"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLogoutDialog(false);
                }}
              >
                取消
              </button>

              {/* 确认按钮 */}
              <button
                className="w-[128px] h-[40px] bg-[#3B80FF] text-white rounded-[20px] border-0 text-[16px] hover:bg-blue-700 transition-colors ml-[20px]"
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