"use client";

import { useState, useTransition } from "react";
import { SystemSettings, updateSystemSettings } from "../lib/api";

export function SettingsForm({ initialSettings }: { initialSettings: SystemSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function updateSection<K extends keyof SystemSettings>(
    section: K,
    key: keyof SystemSettings[K],
    value: string
  ) {
    setSettings((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value
      }
    }));
  }

  function save() {
    startTransition(async () => {
      try {
        const result = await updateSystemSettings(settings);
        setSettings(result.data);
        setMessage("系统设置已保存。API 会立即使用新配置；Worker 重启后会读取最新配置。");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "保存失败。");
      }
    });
  }

  const groups: Array<{
    title: string;
    section: keyof SystemSettings;
    fields: Array<{ key: string; label: string; type?: string }>;
  }> = [
    {
      title: "平台会话",
      section: "app",
      fields: [{ key: "sessionSecret", label: "会话密钥", type: "password" }]
    },
    {
      title: "创次元接口全局回退",
      section: "chcy",
      fields: [
        { key: "apiBaseUrl", label: "接口地址" },
        { key: "accessKey", label: "全局 AccessKey", type: "password" },
        { key: "secretKey", label: "全局 SecretKey", type: "password" },
        { key: "callbackBaseUrl", label: "回调基础地址" }
      ]
    },
    {
      title: "阿里云 OSS",
      section: "oss",
      fields: [
        { key: "region", label: "Region" },
        { key: "bucket", label: "Bucket" },
        { key: "accessKeyId", label: "AccessKeyId", type: "password" },
        { key: "accessKeySecret", label: "AccessKeySecret", type: "password" }
      ]
    }
  ];

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.title} className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">{group.title}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {group.fields.map((field) => (
              <label key={field.key} className="flex flex-col gap-2">
                <span className="text-sm text-[#ecdca2]">{field.label}</span>
                <input
                  type={field.type ?? "text"}
                  value={String(settings[group.section][field.key as keyof typeof settings[typeof group.section]] ?? "")}
                  onChange={(event) => updateSection(group.section, field.key as never, event.target.value)}
                  className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]"
                />
              </label>
            ))}
          </div>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending}
          className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {isPending ? "保存中..." : "保存设置"}
        </button>
        {message ? <p className="text-sm text-white/55">{message}</p> : null}
      </div>
    </div>
  );
}
