"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { register } from "../lib/api";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("注册后会自动登录，再去个人设置里填写你的创次元密钥。");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="w-full rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(22,20,17,0.98),rgba(12,11,9,1))] p-8 shadow-luxe backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">账号注册</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne">
        创建销售账号
      </h1>
      <div className="mt-8 grid gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[#ecdca2]">姓名</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[#ecdca2]">邮箱</span>
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]" />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[#ecdca2]">密码</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]" />
        </label>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await register({ name, email, password });
                document.cookie = `chcy_session=${result.data.token}; path=/; max-age=${60 * 60 * 12}; SameSite=Lax`;
                router.replace("/profile");
                router.refresh();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "注册失败。");
              }
            })
          }
          className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-6 py-3.5 text-sm font-medium text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {isPending ? "注册中..." : "创建账号"}
        </button>
        <Link href="/login" className="rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-center text-sm font-medium text-white/75 transition hover:bg-white/[0.06]">
          返回登录
        </Link>
        <p className="text-sm leading-7 text-[#dccb92]">{message}</p>
      </div>
    </div>
  );
}
