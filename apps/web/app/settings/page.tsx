import { cookies } from "next/headers";
import Link from "next/link";
import { getCurrentUser, getSystemSettings } from "../lib/api";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chcy_session")?.value;
  const currentUserResult = await getCurrentUser(token);

  if (currentUserResult.data.role !== "ADMIN") {
    return (
      <section className="mx-auto max-w-[960px]">
        <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-6 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">系统设置</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">当前账号没有系统配置权限</h1>
          <p className="mt-3 text-sm leading-7 text-white/52">
            全局创次元回退密钥、OSS、平台会话属于平台级配置，只允许管理员维护。
            你的创次元 AccessKey / SecretKey 请在个人设置里单独填写。
          </p>
          <Link
            href="/profile"
            className="mt-6 inline-flex rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-champagne transition hover:bg-white/[0.08]"
          >
            前往个人设置
          </Link>
        </div>
      </section>
    );
  }

  const result = await getSystemSettings(token);

  return (
    <section className="mx-auto max-w-[1280px]">
      <div className="mb-6 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-white/42">运行时配置</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">系统设置</h1>
        <p className="mt-3 text-sm leading-7 text-white/48">
          这里保存的是平台级配置。创次元密钥请到个人设置里单独维护，每个销售独立使用自己的账号。
        </p>
      </div>

      <SettingsForm initialSettings={result.data} />
    </section>
  );
}
