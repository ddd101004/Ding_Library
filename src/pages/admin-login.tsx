"use client";

import React, { useState, useEffect } from "react";
import Head from "next/head";
import { Shield } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { toast } from "sonner";
import { apiPost, saveToken } from "@/api/request";
import { ADMIN_ROLE } from "@/constants";

export default function AdminLoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // 读取记住的账号密码
  useEffect(() => {
    const saved = localStorage.getItem("admin_remember");
    if (saved) {
      try {
        const { phone: savedPhone, password: savedPwd } = JSON.parse(saved);
        setPhone(savedPhone || "");
        setPassword(savedPwd ? atob(savedPwd) : "");
        setRemember(true);
      } catch {
        localStorage.removeItem("admin_remember");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("请输入手机号和密码");
      return;
    }

    setLoading(true);
    try {
      const response = await apiPost("/api/admin/login", {
        phone_number: phone,
        password: btoa(password),
      });

      if (response.data?.token) {
        // 记住密码逻辑
        if (remember) {
          localStorage.setItem("admin_remember", JSON.stringify({
            phone,
            password: btoa(password),
          }));
        } else {
          localStorage.removeItem("admin_remember");
        }

        saveToken(response.data.token);
        localStorage.setItem("id", response.data.user_id);
        localStorage.setItem("username", response.data.username);
        localStorage.setItem("phone", response.data.phone_number);
        localStorage.setItem("role", response.data.role);
        window.location.href = "/admin";
      }
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
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full bg-[#0D9488]/10 flex items-center justify-center mb-4">
              <Shield className="w-7 h-7 text-[#0D9488]" />
            </div>
            <h1 className="text-xl font-semibold text-gray-800">管理员登录</h1>
            <p className="text-sm text-gray-400 mt-1">仅限系统管理员使用</p>
          </div>

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

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0D9488] focus:ring-[#0D9488]"
              />
              <span className="text-sm text-gray-500">记住密码</span>
            </label>

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
