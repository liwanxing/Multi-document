"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  Button,
  Message,
  Alert,
  Typography,
} from "@arco-design/web-react";
import {
  IconUser,
  IconLock,
  IconRight,
  IconCheckCircle,
} from "@arco-design/web-react/icon";
import Link from "next/link";
import { BookOpen, ArrowLeft } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/admin";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg("请输入用户名和密码");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.code !== 0) {
        throw new Error(data.message || "登录失败，请检查账号密码");
      }

      Message.success(`欢迎回来，${data.data?.name || data.data?.username || "管理员"}！`);
      
      // Delay slightly for smooth UX before redirect
      setTimeout(() => {
        router.push(redirectUrl);
        router.refresh();
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || "登录请求异常，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-60 pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-indigo-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Top Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/25 mb-4">
            <BookOpen size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight m-0">
            文档管理控制台
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            统一维护产品文档与多项目发布，请登录账号以继续
          </p>
        </div>

        {/* Login Card */}
        <Card
          bordered={false}
          className="shadow-xl rounded-2xl border border-slate-200/80 bg-white/90 backdrop-blur-md overflow-hidden"
          bodyStyle={{ padding: "32px" }}
        >
          {errorMsg && (
            <Alert
              type="error"
              content={errorMsg}
              className="mb-5 rounded-lg"
              closable
              onClose={() => setErrorMsg("")}
            />
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                账号用户名
              </label>
              <Input
                size="large"
                prefix={<IconUser className="text-slate-400" />}
                placeholder="请输入用户名（如 admin 或 operator）"
                value={username}
                onChange={(val) => {
                  setUsername(val);
                  if (errorMsg) setErrorMsg("");
                }}
                disabled={loading}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                登录密码
              </label>
              <Input.Password
                size="large"
                prefix={<IconLock className="text-slate-400" />}
                placeholder="请输入密码"
                value={password}
                onChange={(val) => {
                  setPassword(val);
                  if (errorMsg) setErrorMsg("");
                }}
                disabled={loading}
              />
            </div>

            <div className="pt-2">
              <Button
                type="primary"
                size="large"
                long
                htmlType="submit"
                loading={loading}
                className="rounded-lg font-medium shadow-sm hover:shadow"
              >
                立即登录
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer Back Link */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors no-underline"
          >
            <ArrowLeft size={14} />
            返回文档门户首页
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center">正在加载登录页面…</div>}>
      <LoginForm />
    </Suspense>
  );
}
