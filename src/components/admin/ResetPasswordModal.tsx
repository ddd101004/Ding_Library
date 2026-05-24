"use client";

/**
 * ResetPasswordModal — 重置用户密码弹窗
 *
 * 【前端】管理员模块组件
 *
 * 职责：
 * - 输入新密码（必填，≥6位）
 * - 确认重置操作
 * - 调用管理员API重置指定用户密码
 *
 * 引用的子组件/hooks/API：
 * - apiPost("/api/admin/users/:id/reset-password") — 重置密码
 * - toast (sonner) — 操作结果提示
 *
 * 引用方：
 * - admin/AdminPage.tsx — 用户管理页重置密码操作
 */
import React from "react";
import { X, KeyRound, AlertTriangle } from "lucide-react";
import { DEFAULT_RESET_PASSWORD } from "@/constants";

interface UserItem {
  user_id: string;
  username: string;
  phone_number: string | null;
  nickname: string | null;
  role: string;
  file_count: number;
}

interface ResetPasswordModalProps {
  open: boolean;
  user: UserItem | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetPasswordModal({ open, user, onConfirm, onCancel }: ResetPasswordModalProps) {
  if (!open || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#0D9488]/10 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-[#0D9488]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">重置密码</h3>
        </div>

        {/* 提示信息 */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-700">
              确定要重置用户 <strong>{user.username}</strong> 的密码吗？重置后密码将变为默认密码，请通知用户及时修改。
            </div>
          </div>
        </div>

        {/* 用户信息 */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">用户名</span>
            <span className="text-gray-800">{user.username}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">手机号</span>
            <span className="text-gray-800">{user.phone_number || "-"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">默认密码</span>
            <span className="text-[#0D9488] font-medium">{DEFAULT_RESET_PASSWORD}</span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm text-white bg-[#0D9488] rounded-lg hover:bg-[#0D9488]/90 transition-colors"
          >
            确认重置
          </button>
        </div>
      </div>
    </div>
  );
}
