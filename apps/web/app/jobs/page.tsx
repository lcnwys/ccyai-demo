import { cookies } from "next/headers";
import { getBatchJob, listBatchJobs } from "../lib/api";
import { JobsWorkbenchClient } from "./jobs-workbench-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    selected?: string;
  }>;
};

export default async function JobsPage({ searchParams }: PageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("chcy_session")?.value;
  const { selected } = await searchParams;
  const result = await listBatchJobs(token);
  const jobs = result.data;
  const selectedId = selected ?? jobs[0]?.id ?? null;
  const detailResult = selectedId ? await getBatchJob(selectedId, token) : { data: null, error: null };

  const totalJobs = jobs.length;
  const runningJobs = jobs.filter((job) => ["RUNNING", "CREATED"].includes(job.status)).length;
  const failedJobs = jobs.filter((job) => ["FAILED", "PARTIAL_SUCCESS"].includes(job.status)).length;
  const exportReadyJobs = jobs.filter((job) => job.successCount > 0).length;

  return (
    <section className="mx-auto max-w-[1800px]">
      <div className="mb-6 flex flex-col gap-4 border-b border-white/8 pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-white/42">内部生产工作台</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">任务中心</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/45">左侧看自己的批次，右侧看当前批次和单项结果。任务会默认使用你自己的创次元账号。</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-white/58">批次 {totalJobs}</span>
          <span className="rounded-full border border-sky-400/16 bg-sky-500/10 px-3 py-2 text-sky-300">处理中 {runningJobs}</span>
          <span className="rounded-full border border-red-400/16 bg-red-500/10 px-3 py-2 text-red-300">风险 {failedJobs}</span>
          <span className="rounded-full border border-[#d6b25e]/16 bg-[#d6b25e]/10 px-3 py-2 text-champagne">导出就绪 {exportReadyJobs}</span>
        </div>
      </div>

      {result.error ? (
        <div className="mb-6 rounded-[1.5rem] border border-amber-500/20 bg-amber-500/8 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">接口不可用</p>
          <p className="mt-3 text-sm leading-7 text-amber-100/80">当前无法连接到任务 API。通常是 `http://localhost:3001` 没启动，或者登录态失效。</p>
          <p className="mt-2 break-all text-xs text-amber-200/70">错误信息：{result.error}</p>
        </div>
      ) : null}

      {detailResult.error ? (
        <div className="mb-6 rounded-[1.5rem] border border-amber-500/20 bg-amber-500/8 p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-amber-300/80">详情读取失败</p>
          <p className="mt-3 text-sm leading-7 text-amber-100/80">左侧批次列表已经拿到，但右侧当前批次详情读取失败。你仍然可以切换批次继续排查。</p>
          <p className="mt-2 break-all text-xs text-amber-200/70">错误信息：{detailResult.error}</p>
        </div>
      ) : null}

      <JobsWorkbenchClient jobs={jobs} selectedJobId={selectedId} selectedJob={detailResult.data} />
    </section>
  );
}
