"use client";
import React from "react";
import AvatarPopup from "../common/AvatarPopup";
import { useAvatar } from "@/contexts/AvatarContext";

interface UserAvatarSectionProps {
  onAvatarClick: () => void;
  showAvatarPopup: boolean;
  onAvatarPopupClose: () => void;
  showUploadModal?: boolean;
  isUploading?: boolean;
}

export default function UserAvatarSection({
  onAvatarClick,
  showAvatarPopup,
  onAvatarPopupClose,
  showUploadModal = false,
  isUploading = false,
}: UserAvatarSectionProps) {
  const { avatarUrl } = useAvatar();
  const isDisabled = isUploading || showUploadModal;

  return (
    <div className="fixed z-50 top-5 right-5">
      <img
        src={avatarUrl}
        alt="用户头像"
        className={`rounded-full border-2 border-white shadow-md w-12 h-12 object-cover ${
          isDisabled
            ? 'cursor-not-allowed opacity-60'
            : 'cursor-pointer'
        }`}
        onClick={() => !isDisabled && onAvatarClick()}
      />
      <AvatarPopup
        show={showAvatarPopup}
        onClose={onAvatarPopupClose}
      />
    </div>
  );
}