"use client";
import React from "react";
import AvatarHoverMenu from "../common/AvatarHoverMenu";

interface UserAvatarSectionProps {
  showUploadModal?: boolean;
  isUploading?: boolean;
}

export default function UserAvatarSection({
  showUploadModal = false,
  isUploading = false,
}: UserAvatarSectionProps) {
  return <AvatarHoverMenu />;
}
