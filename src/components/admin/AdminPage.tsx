"use client";

import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Search, RefreshCw, KeyRound, ArrowLeft, Users, FileText, Shield } from "lucide-react";
import { toast } from "sonner";
import { apiGetAuth, apiPost } from "@/api/request";
import { ADMIN_ROLE } from "@/constants";
import { ResetPasswordModal } from "./ResetPasswordModal";

interface UserItem {
  user_id: string;
  username: string;
  phone_number: string | null;
  nickname: string | null;
  role: string;
  disabled_status: number | null;
  create_time: string | null;
  operate_time: string | null;
  file_count: number;
}

interface PaginationData {
  total: number;
  page: number;
  size: number;
  users: UserItem[];
}

export function AdminPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // 检查管理员权限
  useEffect(() => {
    const role = localStorage.getItem("role") || "user";
    if (role !== ADMIN_ROLE) {
      router.replace("/chat");
    }
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        size: size.toString(),
      });
      if (search) {
        params.set("search", search);
      }
      const response = await apiGetAuth<PaginationData>(`/api/admin/users?${params.toString()}`);
      if (response.data) {
        setUsers(response.data.users);
        setTotal(response.data.total);
      }
    } catch (error: any) {
      if (error.code === 403) {
        toast.error("无管理员权限");
        router.replace("/chat");
      } else {
        toast.error("获取用户列表失败");
      }
    } finally {
      setLoading(false);
    }
  }, [page, size, search, router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearch = () => {
    setPage(1);
    fetchUsers();
  };

  const handleResetPassword = (user: UserItem) => {
    setSelectedUser(user);
    setResetModalOpen(true);
  };

  const handleConfirmReset = async () => {
    if (!selectedUser) return;
    try {
      const response = await apiPost(`/api/admin/users/${selectedUser.user_id}/reset-password`, {});
      toast.success(`已重置 ${selectedUser.username} 的密码，默认密码: ${response.data?.default_password || "Aa123456"}`);
      setResetModalOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast.error("重置密码失败");
    }
  };

  const totalPages = Math.ceil(total / size);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>AI智慧学术系统 - 管理后台</title>
      </Head>

      {/* 顶部导航 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#0D9488]" />
            <h1 className="text-xl font-semibold text-gray-800">管理后台</h1>
          </div>
          <button
            onClick={() => router.push("/chat")}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-[#0D9488] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回用户端
          </button>
        </div>
      </div>

      {/* 统计概览 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">总用户数</span>
            </div>
            <div className="text-2xl font-semibold text-gray-800">{total}</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">总上传文件</span>
            </div>
            <div className="text-2xl font-semibold text-gray-800">
              {users.reduce((sum, u) => sum + u.file_count, 0)}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <KeyRound className="w-4 h-4" />
              <span className="text-sm">管理员</span>
            </div>
            <div className="text-2xl font-semibold text-gray-800">
              {users.filter(u => u.role === "admin").length}
            </div>
          </div>
        </div>

        {/* 搜索栏 */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              placeholder="搜索手机号或用户名..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#0D9488]"
            />
            <button
              onClick={handleSearch}
              className="flex items-center gap-2 px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm hover:bg-[#0D9488]/90 transition-colors"
            >
              <Search className="w-4 h-4" />
              搜索
            </button>
            <button
              onClick={() => { setSearch(""); setPage(1); setTimeout(fetchUsers, 0); }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              重置
            </button>
          </div>
        </div>

        {/* 用户列表表格 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">用户名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">昵称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">手机号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">角色</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">上传文件</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">注册时间</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      加载中...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-800">{user.username}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.nickname || "-"}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.phone_number || "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-[#0D9488]/10 text-[#0D9488]"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {user.role === "admin" ? "管理员" : "用户"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          user.disabled_status
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}>
                          {user.disabled_status ? "已禁用" : "正常"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.file_count}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(user.create_time)}</td>
                      <td className="px-4 py-3">
                        {user.role !== "admin" && (
                          <button
                            onClick={() => handleResetPassword(user)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-[#0D9488]/10 transition-colors"
                          >
                            <KeyRound className="w-3 h-3" />
                            重置密码
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <span className="text-sm text-gray-600">
                共 {total} 条记录，第 {page}/{totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 重置密码确认弹窗 */}
      <ResetPasswordModal
        open={resetModalOpen}
        user={selectedUser}
        onConfirm={handleConfirmReset}
        onCancel={() => { setResetModalOpen(false); setSelectedUser(null); }}
      />
    </div>
  );
}