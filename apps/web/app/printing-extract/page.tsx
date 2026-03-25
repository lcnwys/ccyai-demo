import { NewJobClient } from "../jobs/new/new-job-client";

export default function PrintingExtractPage() {
  return (
    <section className="mx-auto max-w-[1440px]">
      <header className="mb-8 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
          Capability
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne md:text-5xl">
          印花提取
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-white/45">
          用于单图或批量提取印花主体，适合电商花型整理、图案清理和前处理。
        </p>
      </header>
      <NewJobClient selectedTool="printing-extract" />
    </section>
  );
}
