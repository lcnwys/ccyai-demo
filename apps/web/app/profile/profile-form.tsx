"use client";

import { useState, useTransition } from "react";
import { CurrentUserProfile, updateMyChcyCredentials } from "../lib/api";

export function ProfileForm({ initialProfile }: { initialProfile: CurrentUserProfile | null }) {
  const [form, setForm] = useState({
    name: initialProfile?.name ?? "",
    email: initialProfile?.email ?? "",
    chcyAccessKey: initialProfile?.chcyAccessKey ?? "",
    chcySecretKey: initialProfile?.chcySecretKey ?? ""
  });
  const [message, setMessage] = useState(
    initialProfile?.hasChcyCredentials
      ? "已经检测到你的创次元密钥。修改时直接覆盖即可。"
      : "还没有配置创次元密钥。配置后才能提交和查询你自己的任务。"
  );
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <section className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">账号信息</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[#ecdca2]">姓名</span>
            <input value={form.name} disabled className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc]/70 outline-none" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[#ecdca2]">邮箱</span>
            <input value={form.email} disabled className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc]/70 outline-none" />
          </label>
        </div>
      </section>
      <section className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">创次元密钥</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[#ecdca2]">AccessKey</span>
            <input value={form.chcyAccessKey} onChange={(event) => setForm((current) => ({ ...current, chcyAccessKey: event.target.value }))} className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]" />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm text-[#ecdca2]">SecretKey</span>
            <input type="password" value={form.chcySecretKey} onChange={(event) => setForm((current) => ({ ...current, chcySecretKey: event.target.value }))} className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]" />
          </label>
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              try {
                const result = await updateMyChcyCredentials({
                  chcyAccessKey: form.chcyAccessKey,
                  chcySecretKey: form.chcySecretKey
                });
                setForm((current) => ({
                  ...current,
                  chcyAccessKey: result.data.chcyAccessKey,
                  chcySecretKey: result.data.chcySecretKey
                }));
                setMessage("你的创次元密钥已保存。之后所有任务都会走你自己的账号。 ");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "保存失败。");
              }
            })
          }
          disabled={isPending}
          className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {isPending ? "保存中..." : "保存我的创次元密钥"}
        </button>
        <p className="text-sm text-white/55">{message}</p>
      </div>
    </div>
  );
}
