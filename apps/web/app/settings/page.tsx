import { getSystemSettings } from "../lib/api";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const result = await getSystemSettings();

  return (
    <section className="mx-auto max-w-[1280px]">
      <div className="mb-6 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-white/42">运行时配置</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">系统设置</h1>
        <p className="mt-3 text-sm leading-7 text-white/48">
          这里保存的是业务侧配置。数据库、Redis、端口等基础设施变量仍建议走服务器环境变量。
        </p>
      </div>

      <SettingsForm initialSettings={result.data} />
    </section>
  );
}
