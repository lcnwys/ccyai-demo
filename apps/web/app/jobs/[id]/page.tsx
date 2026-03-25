import Link from "next/link";
import { buildApiUrl, getBatchJob } from "../../lib/api";
import { JobDetailClient } from "./job-detail-client";
import { ManualSyncButton } from "./manual-sync-button";
import { ItemRetryButton } from "./item-retry-button";
import { PrintExportButton } from "./print-export-button";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getBatchJob(id);
  const job = result.data;

  if (result.error) {
    return (
      <section className="mx-auto max-w-[1000px]">
        <div className="rounded-[1.75rem] border border-amber-500/20 bg-amber-500/8 p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-300/80">
            接口不可用
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            当前无法读取任务详情
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            大概率是 `http://localhost:3001` 的 API 服务未启动，或者启动异常。
          </p>
          <p className="mt-2 break-all text-xs text-amber-200/70">
            错误信息：{result.error}
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            返回任务中心
          </Link>
        </div>
      </section>
    );
  }

  if (!job) {
    return (
      <section className="mx-auto max-w-[1000px]">
        <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-8 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
            任务详情
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            未找到这个批次任务
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/65">
            这个任务可能已被删除，或者当前 ID 不存在。
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            返回任务列表
          </Link>
        </div>
      </section>
    );
  }

  const pendingCount =
    job.totalCount - job.successCount - job.failedCount;
  const capabilityLabel =
    job.capability === "fission"
      ? "图裂变"
      : job.type === "PRINTING_EXTRACT"
        ? "印花提取"
        : job.type === "IMAGE_GENERATE"
          ? "AI 生图"
          : "提取后生图";

  const statusTone: Record<string, string> = {
    SUCCESS: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/16",
    FAILED: "bg-red-500/12 text-red-300 ring-1 ring-red-400/16",
    PARTIAL_SUCCESS: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-400/16",
    RUNNING: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-400/16",
    CREATED: "bg-zinc-500/12 text-zinc-300 ring-1 ring-zinc-400/16"
  };

  function getResultInfo(
    providerTasks: Array<{
      status: string;
      taskType: string;
      callbackPayload: unknown;
      providerTaskId: string;
      createdAt?: string;
      retryCount?: number;
    }>
  ) {
    for (const task of providerTasks) {
      const payload = task.callbackPayload as
        | {
            data?: { generateImageId?: string; deductibleAmount?: string };
            requestId?: string;
            status?: string;
          }
        | null;
      const generateImageId = payload?.data?.generateImageId;
      if (generateImageId) {
        const syncSource =
          task.status === "CALLBACK_SUCCESS"
            ? "callback"
            : task.status === "MANUAL_SYNC_SUCCESS"
              ? "manual"
              : task.status === "POLLED_SUCCESS"
                ? "polling"
                : "unknown";
        return {
          providerStatus: task.status,
          taskType: task.taskType,
          generateImageId,
          deductibleAmount: payload?.data?.deductibleAmount ?? null,
          requestId: payload?.requestId ?? null,
          callbackStatus: payload?.status ?? null,
          createdAt: task.createdAt ?? null,
          retryCount: task.retryCount ?? 0,
          syncSource
        };
      }
    }

    return null;
  }

  function formatDateTime(value?: string | null) {
    if (!value) return "未知";
    return new Date(value).toLocaleString("zh-CN", {
      hour12: false
    });
  }

  return (
    <section className="mx-auto max-w-[1440px]">
      <div className="mb-6 grid items-start gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.035] p-6 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
              任务详情
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-champagne sm:text-4xl md:text-5xl">
              {job.name}
            </h1>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-white/52 md:text-base">
              状态 {job.status} · 能力 {capabilityLabel} · 总数 {job.totalCount} · 成功{" "}
              {job.successCount} · 失败 {job.failedCount}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs font-semibold">
              <span
                className={`rounded-full px-3 py-1 ${
                  statusTone[job.status] ?? "bg-zinc-500/12 text-zinc-300"
                }`}
              >
                {job.status}
              </span>
              <span className="rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-3 py-1 text-champagne">
                {capabilityLabel}
              </span>
              <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-white/55">
                {job.id}
              </span>
            </div>
          </div>
          <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.035] p-6 backdrop-blur-xl">
            <JobDetailClient batchJobId={job.id} status={job.status} />
          </div>
      </div>

      <section className="mb-6 rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-3 border-b border-white/8 pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
              批次任务预览
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
              当前批次下全部任务项
            </h2>
            <p className="mt-2 text-sm leading-7 text-white/48">
            先看这一批里有多少张图、哪些已成功、哪些还在处理中，再往下看单项详情。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-emerald-400/16 bg-emerald-500/10 px-3 py-1 text-emerald-300">
              成功 {job.successCount}
            </span>
            <span className="rounded-full border border-sky-400/16 bg-sky-500/10 px-3 py-1 text-sky-300">
              待完成 {pendingCount}
            </span>
            <span className="rounded-full border border-red-400/16 bg-red-500/10 px-3 py-1 text-red-300">
              失败 {job.failedCount}
            </span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {job.items.map((item) => {
            const previewPath = item.resultDownloadPath ?? (item.sourceFileId ? `/api/files/${item.sourceFileId}/download` : null);
            const previewLabel = item.resultDownloadPath ? "结果图" : item.sourceFileId ? "原图" : "文生图";

            return (
              <a
                key={`summary-${item.id}`}
                href={`#item-${item.id}`}
                className="group rounded-[1.35rem] border border-[#d6b25e]/10 bg-black/18 p-4 transition hover:border-[#d6b25e]/20 hover:bg-white/[0.04]"
              >
                <div className="grid grid-cols-[104px_1fr] gap-4">
                  <div className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                    {previewPath ? (
                      <img
                        src={buildApiUrl(previewPath)}
                        alt={item.id}
                        className="h-[104px] w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-[104px] items-center justify-center text-xs text-white/28">
                        文生图
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-[11px] text-white/52">
                        {previewLabel}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                          statusTone[item.status] ?? "bg-zinc-500/12 text-zinc-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <strong className="mt-3 block truncate text-sm text-white">
                      {item.id}
                    </strong>
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/42">
                      {item.prompt ?? "未填写描述"}
                    </p>
                    <p className="mt-2 text-xs text-white/32">
                      步骤：{item.step}
                    </p>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4" id="exports">
          {job.items.map((item) => (
            (() => {
              const resultInfo = getResultInfo(item.providerTasks);
              const sourcePreviewPath = item.sourceFileId ? `/api/files/${item.sourceFileId}/download` : null;
              const resultPreviewPath = item.resultDownloadPath;

              return (
            <article
              key={item.id}
              id={`item-${item.id}`}
              className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-6"
            >
              <div className="mb-5 grid gap-4 border-b border-white/8 pb-5 lg:grid-cols-[180px_1fr_auto] lg:items-center">
                <div className="overflow-hidden rounded-[1.2rem] border border-[#d6b25e]/10 bg-black/30">
                  {resultPreviewPath || sourcePreviewPath ? (
                    <img
                      src={buildApiUrl(resultPreviewPath ?? sourcePreviewPath!)}
                      alt={item.id}
                      className="h-40 w-full object-contain"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center text-sm text-white/28">
                      文生图
                    </div>
                  )}
                </div>
                <div>
                  <strong className="break-all text-base text-white sm:text-lg">{item.id}</strong>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/28">
                    {item.step} · {item.prompt ?? "未填写描述"}
                  </p>
                </div>
                <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                  {item.status === "FAILED" ? (
                    <ItemRetryButton itemId={item.id} />
                  ) : null}
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      statusTone[item.status] ?? "bg-zinc-500/12 text-zinc-300"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                  <div className="rounded-[1.4rem] border border-[#d6b25e]/10 bg-black/18 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b89b54]">
                      原图
                    </p>
                    <div className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                      {sourcePreviewPath ? (
                        <img
                          src={buildApiUrl(sourcePreviewPath)}
                          alt={item.sourceFileId ?? item.id}
                          className="h-[280px] w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-[280px] items-center justify-center text-sm text-white/35">
                          文生图，无参考图
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="hidden justify-center lg:flex">
                    <span className="text-4xl text-white/20">→</span>
                  </div>
                  <div className="rounded-[1.4rem] border border-[#d6b25e]/10 bg-black/18 p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#b89b54]">
                      {item.resultDownloadPath ? "提取图" : "结果区"}
                    </p>
                    <div className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                      {resultPreviewPath ? (
                        <img
                          src={buildApiUrl(resultPreviewPath)}
                          alt={item.resultFile?.fileName ?? item.id}
                          className="h-[280px] w-full object-contain"
                        />
                      ) : (
                        <div className="flex h-[280px] items-center justify-center text-sm text-white/35">
                          暂无结果
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.resultDownloadPath ? (
                    <a
                      href={buildApiUrl(item.resultDownloadPath)}
                      target="_blank"
                      rel="noreferrer"
                      className="whitespace-nowrap rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-champagne"
                    >
                      下载结果
                    </a>
                  ) : null}
                  <PrintExportButton
                    itemId={item.id}
                    downloadPath={item.resultDownloadPath}
                    fileName={item.resultFile?.fileName ?? null}
                  />
                  {item.providerTasks.length ? <ManualSyncButton itemId={item.id} compact /> : null}
                </div>

                <details className="rounded-[1.2rem] border border-white/8 bg-black/18 p-4">
                  <summary className="cursor-pointer list-none text-sm font-medium text-white/72">
                    查看详情
                  </summary>
                  <div className="mt-4 grid gap-4 text-sm leading-7 text-white/58 lg:grid-cols-2">
                    <div className="space-y-2">
                      <p className="break-all">源文件：{item.sourceFileId ?? "未上传，当前为文生图"}</p>
                      <p>结果文件：{item.resultFile?.fileName ?? "待归档"}</p>
                      <p className={item.errorMessage ? "text-red-300" : "text-white/42"}>
                        错误信息：{item.errorMessage ?? "无"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p>状态：{item.status}</p>
                      <p>步骤：{item.step}</p>
                      {resultInfo ? (
                        <>
                          <p>Provider 状态：{resultInfo.providerStatus}</p>
                          <p className="break-all">结果图 ID：{resultInfo.generateImageId}</p>
                          <p className="break-all">requestId：{resultInfo.requestId ?? "未返回"}</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {item.providerTasks.length ? (
                    <div className="mt-4 border-t border-white/8 pt-4">
                      <div className="grid gap-3">
                        {item.providerTasks.map((task) => (
                          <div
                            key={task.id}
                            className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm text-white/65"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <strong className="text-white">{task.taskType}</strong>
                              <span className="rounded-full border border-[#d6b25e]/10 bg-black/20 px-3 py-1 text-[11px] font-semibold text-champagne">
                                {task.status}
                              </span>
                            </div>
                            <p className="mt-2 break-all">任务ID：{task.providerTaskId}</p>
                            <p className="mt-1">重试次数：{task.retryCount}</p>
                            <p className="mt-1 text-xs text-white/38">
                              创建时间：
                              {new Date(task.createdAt).toLocaleString("zh-CN", {
                                hour12: false
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </details>
              </div>
            </article>
              );
            })()
          ))}
      </div>
    </section>
  );
}


