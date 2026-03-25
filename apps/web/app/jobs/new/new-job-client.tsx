"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createBatchJob, uploadFile } from "../../lib/api";

type UploadedRow = {
  fileId: string;
  fileName: string;
  prompt: string;
  previewUrl: string;
};

const capabilityMeta = {
  "printing-extract": {
    eyebrow: "印花提取",
    title: "印花提取任务",
    description: "适合单图或批量提取花型主体，保留有效区域，为后续生产或设计做前处理。",
    defaultName: "春季家纺花型提取任务",
    defaultType: "PRINTING_EXTRACT" as const,
    showPrompt: false,
    showAspectRatio: false,
    submitLabel: "提交提取任务"
  },
  "image-generate": {
    eyebrow: "AI 生图",
    title: "AI 生图任务",
    description: "适合基于参考图或提示词进行创作，输出新花型、新图案或电商场景图。",
    defaultName: "新品花型 AI 生图任务",
    defaultType: "IMAGE_GENERATE" as const,
    showPrompt: true,
    showAspectRatio: true,
    submitLabel: "提交生图任务"
  },
  fission: {
    eyebrow: "图裂变",
    title: "图裂变任务",
    description: "适合同主题多版本扩展，围绕一张图快速裂变出多个可选风格与款式。",
    defaultName: "主题图裂变任务",
    defaultType: "IMAGE_GENERATE" as const,
    showPrompt: true,
    showAspectRatio: true,
    submitLabel: "提交裂变任务"
  },
  "printing-export": {
    eyebrow: "印刷图导出",
    title: "印刷图导出任务",
    description: "适合将已有结果图整理为生产文件，后续将接入多 DPI、多规格导出链路。",
    defaultName: "印刷图导出任务",
    defaultType: "PRINTING_EXTRACT" as const,
    showPrompt: false,
    showAspectRatio: false,
    submitLabel: "创建导出任务"
  }
} as const;

export function NewJobClient({
  selectedTool
}: {
  selectedTool?: string;
}) {
  const router = useRouter();
  const capability =
    capabilityMeta[
      (selectedTool as keyof typeof capabilityMeta) ?? "printing-extract"
    ] ?? capabilityMeta["printing-extract"];
  const [jobName, setJobName] = useState<string>(capability.defaultName);
  const [jobType] = useState<"PRINTING_EXTRACT" | "IMAGE_GENERATE">(capability.defaultType);
  const [resolutionId, setResolutionId] = useState(1);
  const [aspectRatioId, setAspectRatioId] = useState<number | "auto">("auto");
  const [prompt, setPrompt] = useState("");
  const [similarity, setSimilarity] = useState(0.72);
  const [rows, setRows] = useState<UploadedRow[]>([]);
  const [message, setMessage] = useState("先上传文件，再创建批次任务。");
  const [createdJobId, setCreatedJobId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPrintingExport = selectedTool === "printing-export";
  const isImageCapability =
    selectedTool === "image-generate" || selectedTool === "fission";
  const imageSupportsTextOnly = selectedTool === "image-generate";

  async function handleFileChange(files: FileList | null) {
    if (!files?.length) return;

    setMessage(`正在上传 ${files.length} 个文件...`);

    const uploaded: UploadedRow[] = [];
    try {
      for (const file of Array.from(files)) {
        const result = await uploadFile(file);
        uploaded.push({
          fileId: result.fileId,
          fileName: file.name,
          prompt,
          previewUrl: URL.createObjectURL(file)
        });
      }

      setRows((current) => [...current, ...uploaded]);
      setMessage(`上传完成，已登记 ${uploaded.length} 个文件。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件上传失败。");
    }
  }

  function updatePrompt(fileId: string, nextPrompt: string) {
    setRows((current) =>
      current.map((row) =>
        row.fileId === fileId ? { ...row, prompt: nextPrompt } : row
      )
    );
  }

  function removeRow(fileId: string) {
    setRows((current) => {
      const target = current.find((row) => row.fileId === fileId);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((row) => row.fileId !== fileId);
    });
  }

  function handleCreateJob() {
    startTransition(async () => {
      try {
        if (isPrintingExport) {
          setMessage("印刷图导出走历史任务结果，不需要在这里创建新批次。");
          return;
        }

        if (!rows.length) {
          if (selectedTool === "printing-extract" || selectedTool === "fission") {
            setMessage("请先上传至少一个文件。");
            return;
          }

          if (selectedTool === "image-generate" && !prompt.trim()) {
            setMessage("文生图至少需要填写提示词，或上传一张参考图。");
            return;
          }
        }

        setMessage("正在创建批次任务...");
        const items =
          rows.length > 0
            ? rows.map((row) => ({
                sourceFileId: row.fileId,
                prompt: row.prompt.trim() || undefined,
                aspectRatioId: aspectRatioId === "auto" ? undefined : aspectRatioId,
                resolutionId
              }))
            : [
                {
                  sourceFileId: null,
                  prompt: prompt.trim(),
                  aspectRatioId: aspectRatioId === "auto" ? undefined : aspectRatioId,
                  resolutionId
                }
              ];
        const result = await createBatchJob({
          tenantId: "demo-tenant",
          createdBy: "demo-user",
          name: jobName,
          type: jobType,
          config:
            selectedTool === "fission"
              ? {
                  capability: "fission",
                  similarity
                }
              : selectedTool === "image-generate"
                ? {
                    capability: "image-generate"
                  }
                : undefined,
          items
        });

        setCreatedJobId(result.data.batchJobId);
        setMessage(`批次已创建：${result.data.batchJobId}`);
        router.push(`/jobs/${result.data.batchJobId}`);
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "创建批次失败，请检查 API 服务。"
        );
      }
    });
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-[1.6rem] border border-[#c79b2c]/20 bg-[linear-gradient(180deg,rgba(32,27,18,0.96),rgba(17,16,13,0.98))] p-5 sm:rounded-[2rem] sm:p-7">
        <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
          {capability.eyebrow}
        </p>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#f4e7b2] sm:text-2xl">
          {capability.title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/52">
          {capability.description}
        </p>
        <div className="mt-5 grid gap-4 sm:mt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-[#c79b2c]/15 bg-black/20 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                文件数
              </p>
              <strong className="mt-2 block text-2xl text-[#fff4cf]">
                {rows.length}
              </strong>
            </div>
            <div className="rounded-[1.2rem] border border-[#c79b2c]/15 bg-black/20 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                能力
              </p>
              <strong className="mt-2 block text-sm text-[#fff4cf]">
                {isPrintingExport
                  ? "历史结果导出"
                  : jobType === "IMAGE_GENERATE"
                    ? "AI 生图"
                    : "仅提取"}
              </strong>
            </div>
            <div className="rounded-[1.2rem] border border-[#c79b2c]/15 bg-black/20 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                分辨率
              </p>
              <strong className="mt-2 block text-sm text-[#fff4cf]">
                {resolutionId === 0 ? "1K" : resolutionId === 1 ? "2K" : "4K"}
              </strong>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#ecdca2]">任务名称</label>
            <input
              value={jobName}
              onChange={(event) => setJobName(event.target.value)}
              className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition placeholder:text-[#7f7453] focus:border-[#d4af37]"
            />
          </div>
          <div className="rounded-[1.2rem] border border-[#c79b2c]/15 bg-black/20 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
              当前模式
            </p>
            <strong className="mt-2 block text-sm text-[#fff4cf]">
              {isPrintingExport
                ? "从历史结果导出印刷图"
                : isImageCapability
                  ? selectedTool === "fission"
                    ? "图裂变"
                    : "AI 生图"
                  : "印花提取"}
            </strong>
          </div>
          <div className={`grid gap-4 ${capability.showAspectRatio ? "md:grid-cols-2" : ""}`}>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ecdca2]">
                {isPrintingExport ? "默认导出基准" : "分辨率"}
              </label>
              <select
                className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]"
                value={resolutionId}
                onChange={(event) => setResolutionId(Number(event.target.value))}
              >
                <option value={0}>1K</option>
                <option value={1}>2K</option>
                <option value={2}>4K</option>
              </select>
            </div>
            {capability.showAspectRatio ? (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#ecdca2]">生图比例</label>
                <select
                  className="rounded-2xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]"
                  value={aspectRatioId}
                  onChange={(event) =>
                    setAspectRatioId(
                      event.target.value === "auto"
                        ? "auto"
                        : Number(event.target.value)
                    )
                  }
                >
                  <option value="auto">自动</option>
                  <option value={0}>1:1</option>
                  <option value={1}>4:3</option>
                  <option value={2}>3:4</option>
                  <option value={3}>4:5</option>
                  <option value={4}>5:4</option>
                  <option value={5}>9:16</option>
                  <option value={6}>16:9</option>
                  <option value={7}>21:9</option>
                </select>
              </div>
            ) : null}
          </div>
          {capability.showPrompt ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ecdca2]">
                {selectedTool === "fission" ? "裂变描述" : "提示词"}
              </label>
              <textarea
                className="min-h-32 rounded-3xl border border-[#c79b2c]/18 bg-[#15130f] px-4 py-3 text-sm text-[#fff7dc] outline-none transition placeholder:text-[#7f7453] focus:border-[#d4af37]"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={
                  selectedTool === "image-generate"
                    ? "留空可配合参考图生成；没有参考图时请填写文生图提示词"
                    : selectedTool === "fission"
                      ? "可选，补充裂变方向"
                      : "按需填写"
                }
              />
            </div>
          ) : null}
          {selectedTool === "fission" ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ecdca2]">
                相似度
              </label>
              <input
                type="range"
                min="0.01"
                max="1"
                step="0.01"
                value={similarity}
                onChange={(event) => setSimilarity(Number(event.target.value))}
                className="accent-[#d4af37]"
              />
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>更自由</span>
                <strong className="text-[#f4d47b]">{similarity.toFixed(2)}</strong>
                <span>更接近原图</span>
              </div>
            </div>
          ) : null}
          {selectedTool === "printing-export" ? (
            <div className="rounded-[1.25rem] border border-[#d6b25e]/12 bg-black/18 p-4 text-sm leading-7 text-white/55">
              当前导出入口在任务详情页结果区。这里先作为能力说明区，下一步会把历史任务结果检索、DPI、包含废弃边、包含原图等参数单独接成导出工作台。
            </div>
          ) : null}
          {!isPrintingExport ? (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#ecdca2]">
                {imageSupportsTextOnly ? "上传参考图（可选）" : "上传文件"}
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => {
                  handleFileChange(event.target.files).catch((error) =>
                    setMessage(
                      error instanceof Error ? error.message : "文件上传失败。"
                    )
                  );
                }}
                className="rounded-2xl border border-dashed border-[#c79b2c]/30 bg-[#15130f] px-4 py-4 text-sm text-[#f0df9d] file:mr-4 file:rounded-full file:border-0 file:bg-[#d88a3d] file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              />
            </div>
          ) : null}
          <button
            className="rounded-full bg-[#d88a3d] px-6 py-3.5 text-sm font-medium text-white transition hover:bg-[#e79949] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleCreateJob}
            disabled={
              isPending ||
              (!isPrintingExport &&
                selectedTool !== "image-generate" &&
                rows.length === 0) ||
              (selectedTool === "image-generate" &&
                rows.length === 0 &&
                !prompt.trim())
            }
          >
            {isPending
              ? "处理中..."
              : isPrintingExport
                ? "前往任务中心选择结果导出"
                : capability.submitLabel}
          </button>
          {isPrintingExport ? (
            <Link
              href="/jobs"
              className="inline-flex items-center justify-center rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-champagne transition hover:bg-white/[0.08]"
            >
              打开任务中心
            </Link>
          ) : null}
          <p className="text-sm leading-7 text-[#dccb92]">{message}</p>
          {createdJobId ? (
            <Link
              href={`/jobs/${createdJobId}`}
              className="inline-block text-sm font-semibold text-[#f3c661] underline underline-offset-4"
            >
              查看任务详情
            </Link>
          ) : null}
        </div>
      </div>

      <div className="rounded-[1.6rem] border border-[#c79b2c]/20 bg-[linear-gradient(180deg,rgba(19,18,14,0.98),rgba(11,10,8,1))] p-5 text-white sm:rounded-[2rem] sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#f4e7b2] sm:text-2xl">
            {selectedTool === "printing-export" ? "待导出文件" : "待处理文件"}
          </h2>
          <span className="rounded-full border border-[#c79b2c]/15 bg-[#d88a3d]/12 px-3 py-1 text-xs font-medium text-[#f0d58a]">
            {rows.length} 个文件
          </span>
        </div>
        <div className="mt-6 grid gap-4">
          {isPrintingExport ? (
            <div className="rounded-[1.5rem] border border-[#c79b2c]/12 bg-[#171510] p-5 text-sm leading-7 text-white/58">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#b89b54]">
                导出流程
              </p>
              <ol className="mt-3 space-y-3">
                <li>1. 在任务中心进入任意成功批次。</li>
                <li>2. 在结果区点击“印刷图导出”。</li>
                <li>3. 选择 72 / 300 / 600 / 1200 DPI。</li>
                <li>4. 后续会增加包含废弃边、原图、批量 ZIP 导出。</li>
              </ol>
            </div>
          ) : rows.length ? (
            rows.map((row) => (
              <div
                key={row.fileId}
                className="rounded-[1.5rem] border border-[#c79b2c]/12 bg-[#171510] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex flex-1 gap-4">
                    <div className="h-32 w-32 shrink-0 overflow-hidden rounded-[1rem] border border-[#c79b2c]/15 bg-black/20">
                      <img
                        src={row.previewUrl}
                        alt={row.fileName}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                    <strong className="break-all text-sm text-[#fff4cf] sm:text-base">{row.fileName}</strong>
                    {capability.showPrompt ? (
                      <textarea
                        value={row.prompt}
                        onChange={(event) =>
                          updatePrompt(row.fileId, event.target.value)
                        }
                        placeholder="可选，单独覆盖这一张图的提示词"
                        className="mt-3 min-h-28 w-full rounded-2xl border border-[#c79b2c]/15 bg-black/20 px-3 py-3 text-sm text-[#fff7dc] outline-none transition focus:border-[#d4af37]"
                      />
                    ) : (
                      <p className="mt-3 text-sm text-white/45">当前能力不需要提示词。</p>
                    )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="self-start rounded-full border border-[#c79b2c]/20 px-3 py-2 text-xs font-medium text-[#f4d47b] transition hover:bg-[#d88a3d]/10"
                    onClick={() => removeRow(row.fileId)}
                  >
                    移除
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-[#c6b37b]">还没有上传文件。</p>
          )}
        </div>
      </div>
    </section>
  );
}

