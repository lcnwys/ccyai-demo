"use client";

import { useState, useTransition } from "react";
import { buildApiUrl, exportPrintAsset } from "../../lib/api";

type Props = {
  itemId: string;
  downloadPath: string | null;
  fileName: string | null;
};

const dpiOptions = [
  { value: "72", label: "72 DPI", note: "屏幕显示、网页/移动端" },
  { value: "300", label: "300 DPI", note: "常规打印、照片/简易插画" },
  { value: "600", label: "600 DPI", note: "精心打印、专业摄影/工程图纸" },
  { value: "1200", label: "1200 DPI", note: "超高清打印、货币/护照" }
];

export function PrintExportButton({ itemId, downloadPath, fileName }: Props) {
  const [open, setOpen] = useState(false);
  const [dpi, setDpi] = useState("72");
  const [preset, setPreset] = useState<"screen" | "standard" | "pro" | "ultra">("standard");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const presetMap = {
    screen: { dpi: "72", label: "屏幕预设", note: "网页、移动端、快速确认" },
    standard: { dpi: "300", label: "标准打印", note: "常规印刷、日常交付" },
    pro: { dpi: "600", label: "专业打印", note: "更高精度输出" },
    ultra: { dpi: "1200", label: "超清输出", note: "极高分辨率场景" }
  };

  function applyPreset(nextPreset: "screen" | "standard" | "pro" | "ultra") {
    setPreset(nextPreset);
    setDpi(presetMap[nextPreset].dpi);
  }

  function handleConfirm() {
    if (dpi === "72" && downloadPath) {
      window.open(buildApiUrl(downloadPath), "_blank", "noopener,noreferrer");
      setMessage("72 DPI 已直接使用当前结果文件下载。");
      return;
    }

    startTransition(async () => {
      try {
        setMessage(`${dpi} DPI 打印图生成中，请等待接口完成...`);
        const result = await exportPrintAsset(itemId, Number(dpi));
        setMessage(result.data.message);

        if (result.data.exportUrl) {
          window.open(buildApiUrl(result.data.exportUrl), "_blank", "noopener,noreferrer");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "打印图导出失败。");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-champagne transition hover:bg-white/[0.08]"
      >
        印刷图导出
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[1.6rem] border border-[#d6b25e]/12 bg-[linear-gradient(180deg,rgba(29,27,23,0.98),rgba(15,14,12,1))] p-6 shadow-luxe">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
                  下载选项
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-champagne">印刷图导出</h3>
                <p className="mt-3 text-sm leading-7 text-white/50">
                  当前文件：{fileName ?? "结果图已归档"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#d6b25e]/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/5"
              >
                关闭
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {Object.entries(presetMap).map(([key, option]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key as "screen" | "standard" | "pro" | "ultra")}
                    className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                      preset === key
                        ? "border-[#d6b25e]/30 bg-[#d6b25e]/10"
                        : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                    }`}
                  >
                    <strong className="text-sm text-white">{option.label}</strong>
                    <p className="mt-2 text-xs leading-6 text-white/45">{option.note}</p>
                  </button>
                ))}
              </div>
              {dpiOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDpi(option.value)}
                  className={`rounded-[1.2rem] border px-4 py-4 text-left transition ${
                    dpi === option.value
                      ? "border-[#d6b25e]/30 bg-[#d6b25e]/10"
                      : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-sm text-white">{option.label}</strong>
                    <span className="text-xs text-white/42">{option.note}</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 rounded-[1.2rem] border border-[#d6b25e]/10 bg-black/20 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                当前策略
              </p>
              <p className="mt-2 text-sm leading-7 text-white/55">
                72 DPI 直接下载当前结果文件；300 DPI 以上会调用创次元打印图接口重新生成生产图。
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isPending}
                className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-5 py-2.5 text-sm font-medium text-black transition hover:brightness-105"
              >
                {isPending ? "导出中..." : "开始导出"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-5 py-2.5 text-sm text-white/70 transition hover:bg-white/[0.08]"
              >
                取消
              </button>
            </div>

            {message ? (
              <p className="mt-4 text-sm leading-7 text-white/55">{message}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
