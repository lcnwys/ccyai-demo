"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { retryBatchJobItem } from "../../lib/api";

type Props = {
  itemId: string;
};

export function ItemRetryButton({ itemId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await retryBatchJobItem(itemId);
            setMessage(result.data.message);
            router.refresh();
          })
        }
      >
        {isPending ? "重试中..." : "仅重试此项"}
      </button>
      <p className="text-[11px] leading-5 text-white/35">
        会重新向创次元提交一次新任务，不是查询旧任务结果。
      </p>
      {message ? <p className="text-[11px] text-white/45">{message}</p> : null}
    </div>
  );
}
