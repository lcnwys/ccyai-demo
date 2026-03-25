import Link from "next/link";
import { cookies } from "next/headers";
import { listCallbackAudits } from "../lib/api";

export const dynamic = "force-dynamic";

const tone: Record<string, string> = {
  accepted: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/16",
  rejected: "bg-red-500/12 text-red-300 ring-1 ring-red-400/16",
  ignored: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-400/16"
};

export default async function CallbackAuditsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("chcy_session")?.value;
  const audits = await listCallbackAudits(80, token);

  return (
    <section className="mx-auto max-w-[1400px]">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">回调审计</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-champagne sm:text-4xl">回调验签与接收记录</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">这里只看最近的回调结果：验签失败、任务未命中、成功写入。</p>
        </div>
        <Link href="/jobs" className="inline-flex w-full items-center justify-center rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-champagne transition hover:bg-white/[0.08] sm:w-auto">
          返回任务中心
        </Link>
      </div>

      {audits.error ? (
        <div className="mb-6 rounded-[1.5rem] border border-amber-500/18 bg-amber-500/8 p-5 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">接口不可用</p>
          <p className="mt-3 text-sm leading-7 text-amber-100/80">当前无法读取回调审计。通常是 API 服务未启动，或登录态失效。</p>
          <p className="mt-2 break-all text-xs text-amber-200/70">错误信息：{audits.error}</p>
        </div>
      ) : null}

      <div className="grid gap-4">
        {audits.data.length ? (
          audits.data.map((audit) => (
            <article key={audit.id} className="rounded-[1.5rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${tone[audit.outcome] ?? "bg-zinc-100 text-zinc-700"}`}>
                      {audit.outcome}
                    </span>
                    <strong className="text-base text-champagne">{audit.reason}</strong>
                  </div>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/35">
                    {new Date(audit.createdAt).toLocaleString("zh-CN", { hour12: false })}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-white/65 md:grid-cols-2">
                <p className="break-all">providerTaskId：{audit.providerTaskId ?? "未命中"}</p>
                <p className="break-all">requestId：{audit.requestId ?? "未返回"}</p>
              </div>
              <details className="mt-4 rounded-[1rem] border border-[#d6b25e]/10 bg-black/18 p-4">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-[#b89b54]">查看原始载荷</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all text-xs leading-6 text-white/55">
                  {JSON.stringify(audit.body, null, 2)}
                </pre>
              </details>
            </article>
          ))
        ) : (
          <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-6 backdrop-blur-xl">当前还没有回调审计记录。</div>
        )}
      </div>
    </section>
  );
}
