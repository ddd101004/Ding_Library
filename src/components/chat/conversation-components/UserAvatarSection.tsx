/**
 * 用户头像区域 — 右上角用户头像悬浮菜单的容器组件
 *
 * 【前端】对话模块布局组件
 *
 * 职责：
 * - 简单包装AvatarHoverMenu组件，作为对话页面右上角头像区域的入口
 * - 固定定位(z-50)在页面右上角
 *
 * 引用的子组件：
 * - common/AvatarHoverMenu — 用户头像+下拉菜单（个人中心/退出登录）
 *
 * 引用方：
 * - chat/ChatConversation — 对话详情页右上角头像区域
 */
"use client";
import React from "react";
import AvatarHoverMenu from "../common/AvatarHoverMenu";

export default function UserAvatarSection() {
  return <AvatarHoverMenu />;
}
