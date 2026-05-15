"use client";

import React, { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { ADMIN_ROLE } from "@/constants";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("请输入手机号和密码");
      return;
    }

    setLoading(true);
    try {
      const result = await login({ phone_number: phone, password });
      if (result?.role !== ADMIN_ROLE) {
        toast.error("该账号不是管理员");
        return;
      }
      // login内部已根据role跳转，管理员会跳到/admin
    } catch (error: any) {
      toast.error(error?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Head>
        <title>管理员登录 - AI智慧学术系统</title>
      </Head>

      <div className="w-full max-w-md">
        {/* 返回按钮 */}
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-1.5 text-gray-400 hover:text-[#0D9488] transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          返回用户登录
        </button>

        {/* 登录卡片 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {/* 标题 */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-[#0D9488]" />
            </div>
            <h1 className="text-xl font-semibold text-gray-800">管理员登录</h1>
            <p className="text-sm text-gray-400 mt-1">仅限系统管理员使用</p>
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">手机号</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入管理员手机号"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#0D9488] transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">密码</label>
              <PasswordInput
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="请输入密码"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#0D9488] text-white rounded-xl text-sm font-medium hover:bg-[#0D9488]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "登录中..." : "登录"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
