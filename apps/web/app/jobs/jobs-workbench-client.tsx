"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BatchJobDetail, BatchJobSummary, buildApiUrl } from "../lib/api";
import { JobDetailClient } from "./[id]/job-detail-client";
import { ItemRetryButton } from "./[id]/item-retry-button";
import { ManualSyncButton } from "./[id]/manual-sync-button";
import { PrintExportButton } from "./[id]/print-export-button";

type Props = {
  jobs: BatchJobSummary[];
  selectedJobId: string | null;
  selectedJob: BatchJobDetail | null;
};

const statusLabel: Record<string, string> = {
  SUCCESS: "已完成",
  FAILED: "失败",
  PARTIAL_SUCCESS: "部分成功",
  RUNNING: "处理中",
  CREATED: "已创建",
  PROCESSING: "处理中",
  SUBMITTED: "已提交",
  RETRYING: "重试中"
};

const statusTone: Record<string, string> = {
  SUCCESS: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/16",
  FAILED: "bg-red-500/12 text-red-300 ring-1 ring-red-400/16",
  PARTIAL_SUCCESS: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-400/16",
  RUNNING: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-400/16",
  CREATED: "bg-zinc-500/12 text-zinc-300 ring-1 ring-zinc-400/16",
  PROCESSING: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-400/16",
  SUBMITTED: "bg-[#d6b25e]/10 text-champagne ring-1 ring-[#d6b25e]/16",
  RETRYING: "bg-violet-500/12 text-violet-300 ring-1 ring-violet-400/16"
};

function getCapabilityLabel(job: Pick<BatchJobSummary, "type" | "capability">) {
  if (job.capability === "fission") return "图裂变";
  if (job.type === "PRINTING_EXTRACT") return "印花提取";
  if (job.type === "IMAGE_GENERATE") return "AI 生图";
  return "提取后生图";
}

function getResultInfo(
  providerTasks: BatchJobDetail["items"][number]["providerTasks"]
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
      return {
        generateImageId,
        deductibleAmount: payload?.data?.deductibleAmount ?? null,
        requestId: payload?.requestId ?? null,
        providerStatus: task.status
      };
    }
  }

  return null;
}

export function JobsWorkbenchClient({
  jobs,
  selectedJobId,
  selectedJob
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [activeItemId, setActiveItemId] = useState<string | null>(
    selectedJob?.items[0]?.id ?? null
  );

  useEffect(() => {
    setActiveItemId(selectedJob?.items[0]?.id ?? null);
  }, [selectedJob?.id, selectedJob?.items]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchStatus = status === "ALL" ? true : job.status === status;
      const matchType =
        type === "ALL"
          ? true
          : type === "FISSION"
            ? job.capability === "fission"
            : job.type === type;
      const keyword = search.trim().toLowerCase();
      const matchSearch = keyword
        ? job.name.toLowerCase().includes(keyword) || job.id.toLowerCase().includes(keyword)
        : true;

      return matchStatus && matchType && matchSearch;
    });
  }, [jobs, search, status, type]);

  const selectedSummary = filteredJobs.find((job) => job.id === selectedJobId) ?? jobs[0] ?? null;
  const currentItem =
    selectedJob?.items.find((item) => item.id === activeItemId) ?? selectedJob?.items[0] ?? null;
  const pendingCount = selectedJob
    ? selectedJob.totalCount - selectedJob.successCount - selectedJob.failedCount
    : 0;

  function selectJob(jobId: string) {
    router.replace(`/jobs?selected=${jobId}`, { scroll: false });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[480px_minmax(0,1fr)]">
      <section className="space-y-4">
        <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
                批次工作台
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                批次列表
              </h2>
            </div>
            <Link
              href="/printing-extract"
              className="inline-flex rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-4 py-2 text-sm font-medium text-black transition hover:brightness-105"
            >
              新建任务
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="按批次名或 ID 搜索"
              className="rounded-2xl border border-[#d6b25e]/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#d6b25e]/35"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-2xl border border-[#d6b25e]/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-[#d6b25e]/35"
              >
                <option value="ALL">全部状态</option>
                <option value="RUNNING">处理中</option>
                <option value="PARTIAL_SUCCESS">部分成功</option>
                <option value="SUCCESS">已完成</option>
                <option value="FAILED">失败</option>
                <option value="CREATED">已创建</option>
              </select>
              <select
                value={type}
                onChange={(event) => setType(event.target.value)}
                className="rounded-2xl border border-[#d6b25e]/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-[#d6b25e]/35"
              >
                <option value="ALL">全部能力</option>
                <option value="PRINTING_EXTRACT">印花提取</option>
                <option value="IMAGE_GENERATE">AI 生图</option>
                <option value="FISSION">图裂变</option>
                <option value="EXTRACT_THEN_GENERATE">提取后生图</option>
              </select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-white/8 bg-black/18 px-3 py-2 text-white/55">
              当前 {filteredJobs.length} 个批次
            </span>
            <span className="rounded-full border border-[#d6b25e]/16 bg-[#d6b25e]/10 px-3 py-2 text-champagne">
              就绪 {filteredJobs.filter((job) => job.successCount > 0).length}
            </span>
            <span className="rounded-full border border-sky-400/16 bg-sky-500/10 px-3 py-2 text-sky-300">
              处理中 {filteredJobs.filter((job) => ["RUNNING", "CREATED"].includes(job.status)).length}
            </span>
            <span className="rounded-full border border-red-400/16 bg-red-500/10 px-3 py-2 text-red-300">
              风险 {filteredJobs.filter((job) => ["FAILED", "PARTIAL_SUCCESS"].includes(job.status)).length}
            </span>
          </div>
        </div>

        <div className="rounded-[1.6rem] border border-white/8 bg-white/[0.035] backdrop-blur-xl">
          <div className="grid grid-cols-[88px_1fr_110px] border-b border-white/8 px-5 py-4 text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
            <div>预览</div>
            <div>批次</div>
            <div>状态</div>
          </div>

          <div className="max-h-[980px] overflow-y-auto">
            {filteredJobs.length ? (
              filteredJobs.map((job) => {
                const isActive = job.id === (selectedJob?.id ?? selectedSummary?.id);
                const previewId = job.id === selectedJob?.id ? selectedJob.items[0]?.sourceFileId ?? null : null;

                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => selectJob(job.id)}
                    className={`grid w-full grid-cols-[88px_1fr_110px] items-center gap-4 border-b border-white/6 px-5 py-4 text-left transition ${
                      isActive
                        ? "bg-[#d6b25e]/10"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                      {previewId ? (
                        <img
                          src={buildApiUrl(`/api/files/${previewId}/download`)}
                          alt={job.name}
                          className="h-16 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-16 items-center justify-center text-[10px] text-white/24">
                          暂无预览
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm text-white">{job.name}</strong>
                      <p className="mt-1 truncate text-xs text-white/34">{job.id}</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/44">
                        <span>{getCapabilityLabel(job)}</span>
                        <span>总数 {job.totalCount}</span>
                        <span>成功 {job.successCount}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${
                          statusTone[job.status] ?? "bg-zinc-500/12 text-zinc-300"
                        }`}
                      >
                        {statusLabel[job.status] ?? job.status}
                      </span>
                      <p className="text-[11px] text-white/34">
                        {new Date(job.createdAt).toLocaleString("zh-CN", {
                          hour12: false
                        })}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="px-5 py-8 text-sm text-white/45">当前筛选条件下没有批次。</div>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {selectedJob ? (
          <>
            <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
              <div className="flex flex-col gap-4 border-b border-white/8 pb-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">当前批次</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-champagne">
                    {selectedJob.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-3 py-1 text-champagne">
                      {getCapabilityLabel(selectedJob)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        statusTone[selectedJob.status] ?? "bg-zinc-500/12 text-zinc-300"
                      }`}
                    >
                      {statusLabel[selectedJob.status] ?? selectedJob.status}
                    </span>
                    <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-white/48">
                      {selectedJob.id}
                    </span>
                    <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-white/48">
                      {selectedJob.totalCount} 项
                    </span>
                    {selectedJob.successCount ? (
                      <span className="rounded-full border border-emerald-400/16 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                        成功 {selectedJob.successCount}
                      </span>
                    ) : null}
                    {selectedJob.failedCount ? (
                      <span className="rounded-full border border-red-400/16 bg-red-500/10 px-3 py-1 text-red-300">
                        失败 {selectedJob.failedCount}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="xl:w-[340px]">
                  <JobDetailClient batchJobId={selectedJob.id} status={selectedJob.status} />
                </div>
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
              <div className="flex flex-col gap-3 border-b border-white/8 pb-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">批次任务预览</p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    当前批次的全部任务项
                  </h3>
                </div>
                <Link
                  href={`/jobs/${selectedJob.id}`}
                  className="inline-flex rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/64 transition hover:bg-white/[0.06]"
                >
                  打开完整详情页
                </Link>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {selectedJob.items.map((item) => {
                  const previewPath = item.resultDownloadPath ?? (item.sourceFileId ? `/api/files/${item.sourceFileId}/download` : null);
                  const isActive = currentItem?.id === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveItemId(item.id)}
                      className={`grid grid-cols-[96px_1fr] gap-4 rounded-[1.3rem] border p-4 text-left transition ${
                        isActive
                          ? "border-[#d6b25e]/25 bg-[#d6b25e]/10"
                          : "border-[#d6b25e]/10 bg-black/18 hover:border-[#d6b25e]/20 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                        {previewPath ? (
                          <img
                            src={buildApiUrl(previewPath)}
                            alt={item.id}
                            className="h-24 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-24 items-center justify-center text-[10px] text-white/24">
                            文生图
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full border border-white/8 bg-black/18 px-3 py-1 text-[11px] text-white/52">
                            {item.resultDownloadPath ? "结果图" : "原图"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              statusTone[item.status] ?? "bg-zinc-500/12 text-zinc-300"
                            }`}
                          >
                            {statusLabel[item.status] ?? item.status}
                          </span>
                        </div>
                        <strong className="mt-3 block truncate text-sm text-white">{item.id}</strong>
                        <p className="mt-2 line-clamp-2 text-xs leading-6 text-white/42">
                          {item.prompt ?? "未填写描述"}
                        </p>
                        <p className="mt-2 text-xs text-white/32">步骤：{item.step}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {currentItem ? (
              <div className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
                <article className="rounded-[1.7rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">当前任务项</p>
                      <h3 className="mt-2 break-all text-xl font-semibold tracking-[-0.03em] text-white">
                        {currentItem.id}
                      </h3>
                      <p className="mt-2 text-sm text-white/45">{currentItem.step} · {currentItem.prompt ?? "未填写描述"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {currentItem.status === "FAILED" ? <ItemRetryButton itemId={currentItem.id} /> : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          statusTone[currentItem.status] ?? "bg-zinc-500/12 text-zinc-300"
                        }`}
                      >
                        {statusLabel[currentItem.status] ?? currentItem.status}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-[#d6b25e]/10 bg-black/18 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">原图</p>
                      <div className="mt-3 overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                        {currentItem.sourceFileId ? (
                          <img
                            src={buildApiUrl(`/api/files/${currentItem.sourceFileId}/download`)}
                            alt={currentItem.sourceFileId ?? currentItem.id}
                            className="h-[320px] w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-[320px] items-center justify-center text-sm text-white/35">
                            文生图，无参考图
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-[1.2rem] border border-[#d6b25e]/10 bg-black/18 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">结果区</p>
                      {currentItem.resultDownloadPath ? (
                        <>
                          <div className="mt-3 overflow-hidden rounded-[1rem] border border-white/8 bg-black/30">
                            <img
                              src={buildApiUrl(currentItem.resultDownloadPath)}
                              alt={currentItem.resultFile?.fileName ?? currentItem.id}
                              className="h-[320px] w-full object-contain"
                            />
                          </div>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <a
                              href={buildApiUrl(currentItem.resultDownloadPath)}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-champagne"
                            >
                              下载结果
                            </a>
                            <PrintExportButton
                              itemId={currentItem.id}
                              downloadPath={currentItem.resultDownloadPath}
                              fileName={currentItem.resultFile?.fileName ?? null}
                            />
                            {currentItem.providerTasks.length ? <ManualSyncButton itemId={currentItem.id} compact /> : null}
                          </div>
                        </>
                      ) : (
                        <div className="mt-3 space-y-3 rounded-[1rem] border border-dashed border-[#d6b25e]/15 bg-black/18 p-4 text-sm leading-7 text-white/48">
                          <p>{currentItem.providerTasks.length ? "当前还没有结果文件，可直接手动查询一次结果。" : "当前还没有 provider 任务，先重试此项再查询。"}</p>
                          {currentItem.providerTasks.length ? <ManualSyncButton itemId={currentItem.id} compact /> : null}
                        </div>
                      )}
                    </div>
                  </div>
                </article>

                <article className="space-y-4">
                  <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">任务信息</p>
                    <div className="mt-4 space-y-3 text-sm leading-7 text-white/58">
                      <p className="break-all">源文件：{currentItem.sourceFileId ?? "未上传，当前为文生图"}</p>
                      <p>结果文件：{currentItem.resultFile?.fileName ?? "待归档"}</p>
                      <p className={currentItem.errorMessage ? "text-red-300" : "text-white/42"}>
                        错误信息：{currentItem.errorMessage ?? "无"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">Provider 控制台</p>
                    <div className="mt-4 space-y-3">
                      {currentItem.providerTasks.length ? (
                        currentItem.providerTasks.map((task) => {
                          const resultInfo = getResultInfo([task]);

                          return (
                            <div
                              key={task.id}
                              className="rounded-[1.2rem] border border-[#d6b25e]/10 bg-black/18 p-4 text-sm text-white/62"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <strong className="text-white">{task.taskType}</strong>
                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                    statusTone[task.status] ?? "bg-zinc-500/12 text-zinc-300"
                                  }`}
                                >
                                  {statusLabel[task.status] ?? task.status}
                                </span>
                              </div>
                              <p className="mt-3 break-all">任务ID：{task.providerTaskId}</p>
                              <p className="mt-1">重试次数：{task.retryCount}</p>
                              <p className="mt-1 text-xs text-white/38">
                                创建时间：
                                {new Date(task.createdAt).toLocaleString("zh-CN", {
                                  hour12: false
                                })}
                              </p>
                              {resultInfo ? (
                                <div className="mt-3 rounded-[1rem] border border-white/8 bg-white/[0.03] p-3 text-xs leading-6 text-white/48">
                                  <p className="break-all">结果图 ID：{resultInfo.generateImageId}</p>
                                  <p>requestId：{resultInfo.requestId ?? "未返回"}</p>
                                  <p>扣费金额：{resultInfo.deductibleAmount ?? "未返回"}</p>
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-white/45">当前没有 provider 任务记录。</p>
                      )}
                    </div>
                  </div>
                </article>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.035] p-8 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">任务中心</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">当前还没有可查看的批次</h2>
            <p className="mt-4 text-sm leading-7 text-white/52">
              先从左侧点击一个批次，或者新建一个印花提取、AI 生图、图裂变任务。
            </p>
          </div>
        )}
      </section>
    </div>
  );
}


