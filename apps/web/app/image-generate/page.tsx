import { NewJobClient } from "../jobs/new/new-job-client";

export default function ImageGeneratePage() {
  return (
    <section className="mx-auto max-w-[1440px]">
      <header className="mb-8 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
          Capability
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne md:text-5xl">
          AI 生图
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-white/45">
          用于根据参考图或提示词进行创作，适合新品花型设计、视觉延展和款式探索。
        </p>
      </header>
      <NewJobClient selectedTool="image-generate" />
    </section>
  );
}
