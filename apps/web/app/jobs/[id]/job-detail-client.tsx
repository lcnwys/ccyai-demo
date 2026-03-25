"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { buildApiUrl, exportBatchJob, retryBatchJob } from "../../lib/api";

type Props = {
  batchJobId: string;
  status: string;
};

export function JobDetailClient({ batchJobId, status }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [exportMessage, setExportMessage] = useState("");

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/callback-audits"
          className="inline-flex rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/64 transition hover:bg-white/[0.06]"
        >
          Callback 审计
        </Link>
        <span className="rounded-full border border-white/8 bg-black/18 px-3 py-2 text-[11px] text-white/38">
          自动刷新已关闭
        </span>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-3">
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-champagne transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            await retryBatchJob(batchJobId);
            router.refresh();
          })
        }
        disabled={isPending}
      >
        {isPending ? "重试中..." : "重试失败项"}
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
        onClick={() => router.refresh()}
      >
        刷新状态
      </button>
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-4 py-2.5 text-sm font-medium text-black transition hover:brightness-105"
        onClick={() =>
          startTransition(async () => {
            const result = await exportBatchJob(batchJobId);
            setExportMessage(result.data.message);
            if (result.data.exportUrl) {
              window.open(buildApiUrl(result.data.exportUrl), "_blank", "noopener,noreferrer");
            }
          })
        }
      >
        导出结果
      </button>
      </div>
      {exportMessage ? (
        <p className="text-xs leading-6 text-white/52">{exportMessage}</p>
      ) : null}
    </div>
  );
}
