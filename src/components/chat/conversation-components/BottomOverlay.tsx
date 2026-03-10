"use client";
import React from "react";

interface BottomOverlayProps {
  isSidebarOpen: boolean;
  showRelatedPapers?: boolean; // 添加相关论文面板状态
}

export default function BottomOverlay({ isSidebarOpen, showRelatedPapers = false }: BottomOverlayProps) {
  // 白色背景层比输入框左右各缩短30px
  // 在相关论文模式下，与AI伴读页面的白色背景层位置保持一致
  const overlayStyle = {
    left: showRelatedPapers
      ? (isSidebarOpen ? "271px" : "117px") // 相关论文模式：与AI伴读页面一致
      : (isSidebarOpen ? "254px" : "100px"), // 正常模式：输入框位置 + 30px 左缩进
    right: showRelatedPapers
      ? "63px" // 相关论文模式：与AI伴读页面一致
      : "63px", // 正常模式：输入框位置 + 30px 右缩进
    width: showRelatedPapers
      ? "min(calc(100vw - 180px), 1540px)" // 相关论文模式：与AI伴读页面一致
      : (isSidebarOpen
          ? "min(calc(100% - 284px), calc(100vw - 314px))" // 侧边栏打开模式：输入框宽度 - 60px
          : "min(calc(100% - 130px), calc(100vw - 160px))" // 侧边栏关闭模式：输入框宽度 - 60px
        ),
    marginLeft: showRelatedPapers
      ? "0px" // 相关论文模式：不需要额外的左边距
      : "0px", // 正常模式：不需要额外的左边距
  };

  return (
    <div
      className="fixed -bottom-2 bg-white h-[28px] transform -translate-y-[13px]"
      style={overlayStyle}
    />
  );
}