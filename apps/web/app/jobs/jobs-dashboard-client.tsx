"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Job = {
  id: string;
  name: string;
  type: string;
  capability?: string | null;
  status: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
};

type Props = {
  jobs: Job[];
};

export function JobsDashboardClient({ jobs }: Props) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [type, setType] = useState("ALL");

  const typeLabel: Record<string, string> = {
    PRINTING_EXTRACT: "印花提取",
    IMAGE_GENERATE: "AI 生图",
    EXTRACT_THEN_GENERATE: "提取后生图"
  };

  const typeHref: Record<string, string> = {
    PRINTING_EXTRACT: "/printing-extract",
    IMAGE_GENERATE: "/image-generate",
    EXTRACT_THEN_GENERATE: "/printing-extract"
  };

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

  const statusTone: Record<string, string> = {
    SUCCESS: "bg-emerald-500/12 text-emerald-300 ring-1 ring-emerald-400/16",
    FAILED: "bg-red-500/12 text-red-300 ring-1 ring-red-400/16",
    PARTIAL_SUCCESS: "bg-amber-500/12 text-amber-300 ring-1 ring-amber-400/16",
    RUNNING: "bg-sky-500/12 text-sky-300 ring-1 ring-sky-400/16",
    CREATED: "bg-zinc-500/12 text-zinc-300 ring-1 ring-zinc-400/16"
  };

  const quickFilters = [
    {
      key: "EXPORT_READY",
      label: "导出就绪",
      active: status === "SUCCESS" || status === "PARTIAL_SUCCESS",
      onClick: () => {
        setStatus("SUCCESS");
        setType("ALL");
      }
    },
    {
      key: "RISK",
      label: "风险任务",
      active: status === "FAILED" || status === "PARTIAL_SUCCESS",
      onClick: () => {
        setStatus("FAILED");
        setType("ALL");
      }
    },
    {
      key: "RUNNING",
      label: "运行中",
      active: status === "RUNNING" || status === "CREATED",
      onClick: () => {
        setStatus("RUNNING");
        setType("ALL");
      }
    },
    {
      key: "FISSION",
      label: "图裂变",
      active: type === "FISSION",
      onClick: () => {
        setType("FISSION");
        setStatus("ALL");
      }
    }
  ];

  return (
    <>
      <section className="mb-4 flex flex-wrap gap-2">
        {quickFilters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={filter.onClick}
            className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
              filter.active
                ? "border-[#d6b25e]/24 bg-[#d6b25e]/12 text-champagne"
                : "border-white/8 bg-white/[0.03] text-white/58 hover:bg-white/[0.05]"
            }`}
          >
            {filter.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatus("ALL");
            setType("ALL");
          }}
          className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/58 transition hover:bg-white/[0.05]"
        >
          重置筛选
        </button>
      </section>

      <section className="mb-6 grid gap-4 rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl md:grid-cols-[1fr_180px_220px] md:p-5">
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[#b89b54]">
            搜索
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="按任务名或 ID 搜索"
            className="rounded-2xl border border-[#d6b25e]/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 focus:border-[#d6b25e]/35"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[#b89b54]">
            状态
          </span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-[#d6b25e]/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-[#d6b25e]/35"
          >
            <option value="ALL">全部状态</option>
            <option value="RUNNING">RUNNING</option>
            <option value="PARTIAL_SUCCESS">PARTIAL_SUCCESS</option>
            <option value="SUCCESS">SUCCESS</option>
            <option value="FAILED">FAILED</option>
            <option value="CREATED">CREATED</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-[0.16em] text-[#b89b54]">
            类型
          </span>
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
        </label>
      </section>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.35rem] border border-[#d6b25e]/10 bg-black/20 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89b54]">
            印花提取
          </p>
          <p className="mt-2 text-sm leading-6 text-white/56">
            单图或批量提取主体，适合做前处理和生产整理。
          </p>
          <Link
            href="/printing-extract"
            className="mt-4 inline-flex rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-[#d6b25e]/14"
          >
            新建提取任务
          </Link>
        </div>
        <div className="rounded-[1.35rem] border border-[#d6b25e]/10 bg-black/20 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89b54]">
            AI 生图
          </p>
          <p className="mt-2 text-sm leading-6 text-white/56">
            参考图或提示词创作，适合快速做新款、新系列。
          </p>
          <Link
            href="/image-generate"
            className="mt-4 inline-flex rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-[#d6b25e]/14"
          >
            新建生图任务
          </Link>
        </div>
        <div className="rounded-[1.35rem] border border-[#d6b25e]/10 bg-black/20 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89b54]">
            图裂变
          </p>
          <p className="mt-2 text-sm leading-6 text-white/56">
            同主题多版本扩展，适合快速出多套候选图案。
          </p>
          <Link
            href="/fission"
            className="mt-4 inline-flex rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-[#d6b25e]/14"
          >
            新建裂变任务
          </Link>
        </div>
        <div className="rounded-[1.35rem] border border-[#d6b25e]/10 bg-black/20 px-5 py-4 md:col-span-3">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#b89b54]">
                印刷图导出
              </p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                从已成功任务进入结果区，按 72 / 300 / 600 / 1200 DPI 输出生产文件。
              </p>
            </div>
            <Link
              href="/printing-export"
              className="inline-flex rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-[#d6b25e]/14"
            >
              打开导出工作台
            </Link>
          </div>
        </div>
      </section>

      <div className="mb-4 text-sm text-white/48">
        当前显示 {filteredJobs.length} / {jobs.length} 个任务
      </div>

      {filteredJobs.length ? (
        <>
          <div className="hidden overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/[0.035] backdrop-blur-xl xl:block">
            <div className="grid grid-cols-[1.3fr_0.85fr_0.85fr_0.55fr_0.55fr_0.55fr_1.2fr] border-b border-white/8 px-6 py-4 text-[11px] uppercase tracking-[0.18em] text-[#b89b54]">
              <div>任务</div>
              <div>类型</div>
              <div>创建时间</div>
              <div>总数</div>
              <div>成功</div>
              <div>失败</div>
              <div>状态 / 操作台</div>
            </div>
            {filteredJobs.map((job) => (
              <div
                key={job.id}
                className="grid grid-cols-[1.3fr_0.85fr_0.85fr_0.55fr_0.55fr_0.55fr_1.2fr] items-center gap-4 border-b border-white/6 px-6 py-5 transition hover:bg-white/[0.04]"
              >
                <div className="min-w-0">
                  <strong className="block truncate text-base font-semibold text-white">
                    {job.name}
                  </strong>
                  <p className="mt-2 truncate text-xs uppercase tracking-[0.16em] text-white/28">
                    {job.id}
                  </p>
                </div>
                <div className="text-sm text-white/58">
                  {job.capability === "fission"
                    ? "图裂变"
                    : typeLabel[job.type] ?? job.type}
                </div>
                <div className="text-sm text-white/58">
                  {new Date(job.createdAt).toLocaleString("zh-CN", {
                    hour12: false
                  })}
                </div>
                <div className="text-lg font-semibold text-white">{job.totalCount}</div>
                <div className="text-lg font-semibold text-emerald-300">
                  {job.successCount}
                </div>
                <div className="text-lg font-semibold text-red-300">
                  {job.failedCount}
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      statusTone[job.status] ?? "bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    {job.status}
                  </span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-3 py-1.5 text-[11px] font-semibold text-champagne transition hover:bg-[#d6b25e]/14"
                    >
                      详情
                    </Link>
                    <Link
                      href={`/jobs/${job.id}#exports`}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/64 transition hover:bg-white/[0.06]"
                    >
                      导出
                    </Link>
                    <Link
                      href={job.capability === "fission" ? "/fission" : typeHref[job.type] ?? "/jobs/new"}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-white/64 transition hover:bg-white/[0.06]"
                    >
                      新同类任务
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:hidden">
            {filteredJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group flex flex-col gap-4 rounded-[1.6rem] border border-white/8 bg-white/[0.035] p-5 backdrop-blur-xl transition duration-200 hover:-translate-y-0.5 hover:border-[#d6b25e]/18 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-6"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <strong className="truncate text-xl font-semibold tracking-[-0.03em] text-white">
                      {job.name}
                    </strong>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        statusTone[job.status] ?? "bg-zinc-100 text-zinc-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-2 break-all text-xs uppercase tracking-[0.16em] text-white/28">
                    {job.id}
                  </p>
                  <p className="mt-2 text-xs text-[#b89b54]">
                    {job.capability === "fission"
                      ? "图裂变"
                      : typeLabel[job.type] ?? job.type}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/28">
                    {new Date(job.createdAt).toLocaleString("zh-CN", {
                      hour12: false
                    })}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-white/72 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#d6b25e]/10 bg-black/18 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                        总数
                      </p>
                      <strong className="mt-2 block text-lg text-white">
                        {job.totalCount}
                      </strong>
                    </div>
                    <div className="rounded-2xl border border-[#d6b25e]/10 bg-black/18 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                        成功
                      </p>
                      <strong className="mt-2 block text-lg text-emerald-300">
                        {job.successCount}
                      </strong>
                    </div>
                    <div className="rounded-2xl border border-[#d6b25e]/10 bg-black/18 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                        失败
                      </p>
                      <strong className="mt-2 block text-lg text-red-300">
                        {job.failedCount}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <span className="rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/8 px-4 py-2 text-xs font-semibold text-champagne transition group-hover:bg-[#d6b25e]/14">
                    查看详情
                  </span>
                  <span className="text-xs text-white/36">详情 / 导出 / 新建同类任务</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-[1.75rem] border border-white/8 bg-white/[0.035] p-6 backdrop-blur-xl">
          当前筛选条件下没有任务。
        </div>
      )}
    </>
  );
}
