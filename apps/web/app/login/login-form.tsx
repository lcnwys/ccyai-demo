"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { login } from "../lib/api";

export function LoginForm({
  defaultEmail,
  passwordHint
}: {
  defaultEmail: string;
  passwordHint: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState(passwordHint);
  const [message, setMessage] = useState("请输入内部测试账号登录。");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(22,20,17,0.98),rgba(12,11,9,1))] p-8 shadow-luxe backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
        内部访问
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne">
        销售测试登录
      </h1>
      <p className="mt-4 text-sm leading-7 text-white/52">
        这套平台当前只面向内部销售和小范围客户测试，不做复杂权限模型。
      </p>

      <div className="mt-8 grid gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[#ecdca2]">邮箱</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm text-[#ecdca2]">密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]"
          />
        </label>
      </div>

      <div className="mt-6 rounded-[1.25rem] border border-[#d6b25e]/10 bg-black/18 p-4 text-sm leading-7 text-white/55">
        默认测试账号：{defaultEmail}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await login({ email, password });
                document.cookie = `chcy_session=${result.data.token}; path=/; max-age=${60 * 60 * 12}; SameSite=Lax`;
                router.replace("/jobs");
                router.refresh();
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "登录失败。");
              }
            })
          }
          className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-6 py-3.5 text-sm font-medium text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {isPending ? "登录中..." : "进入工作台"}
        </button>
        <p className="text-sm leading-7 text-[#dccb92]">{message}</p>
      </div>
    </div>
  );
}
