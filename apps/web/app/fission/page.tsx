import { NewJobClient } from "../jobs/new/new-job-client";

export default function FissionPage() {
  return (
    <section className="mx-auto max-w-[1440px]">
      <header className="mb-8 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
          Capability
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne md:text-5xl">
          图裂变
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-white/45">
          用于围绕单个主题快速生成多版本图案，适合做多方案比选和批量款式延伸。
        </p>
      </header>
      <NewJobClient selectedTool="fission" />
    </section>
  );
}
