import Link from "next/link";
import { listBatchJobs } from "../lib/api";

export const dynamic = "force-dynamic";

export default async function PrintingExportPage() {
  const result = await listBatchJobs();
  const exportableJobs = result.data.filter(
    (job) => job.successCount > 0 || job.status === "SUCCESS" || job.status === "PARTIAL_SUCCESS"
  );

  return (
    <section className="mx-auto max-w-[1440px]">
      <header className="mb-8 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
          Capability
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne md:text-5xl">
          印刷图导出
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-white/45">
          从已完成的任务结果直接进入导出。当前支持 72 / 300 / 600 / 1200 DPI，下一步继续补更多印刷规格。
        </p>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
            Exportable Jobs
          </p>
          <strong className="mt-3 block text-3xl font-semibold text-white">
            {exportableJobs.length}
          </strong>
        </article>
        <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
            DPI Options
          </p>
          <strong className="mt-3 block text-3xl font-semibold text-champagne">
            4
          </strong>
        </article>
        <article className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
            Current Flow
          </p>
          <strong className="mt-3 block text-xl font-semibold text-white">
            任务详情内导出
          </strong>
        </article>
      </section>

      {result.error ? (
        <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/8 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">
            API Unavailable
          </p>
          <p className="mt-3 text-sm leading-7 text-amber-100/80">
            当前无法读取可导出任务，请先确认 API 服务正常。
          </p>
          <p className="mt-2 break-all text-xs text-amber-200/70">
            错误信息：{result.error}
          </p>
        </div>
      ) : exportableJobs.length ? (
        <div className="grid gap-4">
          {exportableJobs.map((job) => {
            const capabilityLabel =
              job.capability === "fission"
                ? "图裂变"
                : job.type === "PRINTING_EXTRACT"
                  ? "印花提取"
                  : job.type === "IMAGE_GENERATE"
                    ? "AI 生图"
                    : "提取后生图";

            return (
              <article
                key={job.id}
                className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-6 backdrop-blur-xl"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
                      {capabilityLabel}
                    </p>
                    <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.03em] text-white">
                      {job.name}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-white/50">
                      已成功 {job.successCount} 项，可直接进入结果区进行多 DPI 导出。
                    </p>
                    <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/28">
                      {job.id} · {new Date(job.createdAt).toLocaleString("zh-CN", { hour12: false })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={`/jobs/${job.id}#exports`}
                      className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-105"
                    >
                      打开导出区
                    </Link>
                    <Link
                      href={`/jobs/${job.id}`}
                      className="rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-5 py-2.5 text-sm text-champagne transition hover:bg-white/[0.08]"
                    >
                      查看任务详情
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.03] p-6 text-sm leading-7 text-white/58">
          当前还没有可导出的成功任务。先去印花提取、AI 生图或图裂变完成一批结果，再回到这里统一进入导出。
        </div>
      )}
    </section>
  );
}
