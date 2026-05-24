/**
 * 管理员后台页 /admin — 用户管理
 *
 * 【前端】路由：/admin
 *
 * 职责：
 * - 管理员权限校验
 * - 用户列表管理（启用/禁用/重置密码）
 */
"use client";

import { AdminPage } from "@/components/admin/AdminPage";

export default function Admin() {
  return <AdminPage />;
}