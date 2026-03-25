"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { syncBatchJobItemResult } from "../../lib/api";

export function ManualSyncButton({
  itemId,
  compact = false
}: {
  itemId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`flex ${compact ? "w-auto" : "flex-col gap-2"}`}>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            try {
              console.info("[CHCY WEB] 点击手动查询结果", { itemId });
              const result = await syncBatchJobItemResult(itemId);
              setMessage(result.data.message);
              console.info("[CHCY WEB] 手动查询结果返回", {
                itemId,
                result: result.data
              });
              window.setTimeout(() => {
                router.refresh();
              }, 1200);
            } catch (error) {
              const message = error instanceof Error ? error.message : "手动查询失败。";
              console.error("[CHCY WEB] 手动查询结果异常", { itemId, message });
              setMessage(message);
            }
          })
        }
        className="whitespace-nowrap rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-white/[0.08] disabled:opacity-60"
      >
        {isPending ? "查询中..." : "手动查询结果"}
      </button>
      {!compact ? (
        <>
          <p className="text-[11px] leading-5 text-white/35">
            查询当前这次 provider 任务是否已返回结果，不会重新发起新任务。
          </p>
          {!message ? (
            <p className="text-[11px] leading-5 text-white/30">
              如果 provider 已经返回结果，页面会在约 1 秒后自动刷新当前项。
            </p>
          ) : null}
          {message ? <p className="text-xs leading-6 text-white/45">{message}</p> : null}
        </>
      ) : null}
    </div>
  );
}
