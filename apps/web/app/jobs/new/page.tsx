import { NewJobClient } from "./new-job-client";

type PageProps = {
  searchParams?: Promise<{
    tool?: string;
  }>;
};

const capabilityCards = [
  {
    key: "printing-extract",
    href: "/printing-extract",
    title: "印花提取",
    text: "单图或批量提取印花主体，适合花型清理、提取、二次设计前处理。"
  },
  {
    key: "image-generate",
    href: "/image-generate",
    title: "AI 生图",
    text: "根据参考图或提示词进行生成，适合新花型创作、延展与风格探索。"
  },
  {
    key: "fission",
    href: "/fission",
    title: "图裂变",
    text: "围绕单个主题快速扩展多版本，适合做多款式候选图。"
  },
  {
    key: "printing-export",
    href: "/printing-export",
    title: "印刷图导出",
    text: "将已完成结果按 72/300/600/1200 DPI 等规格导出生产文件。"
  }
];

export default async function NewJobPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  const selectedTool = params?.tool ?? "printing-extract";

  return (
    <section className="mx-auto max-w-[1440px]">
      <header className="mb-8 border-b border-white/8 pb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-[#b89b54]">
          新建任务
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-champagne md:text-5xl">
          能力中心
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-white/45">
          每个能力板块独立使用，任务中心统一汇总进度、下载和导出。
        </p>
      </header>

      <section className="mb-6 grid gap-4 lg:grid-cols-4">
        {capabilityCards.map((card) => {
          const active = selectedTool === card.key;

          return (
            <a
              key={card.key}
              href={card.href}
              className={`rounded-[1.5rem] border p-5 transition ${
                active
                  ? "border-[#d6b25e]/26 bg-[#d6b25e]/10"
                  : "border-white/8 bg-white/[0.035] hover:bg-white/[0.05]"
              }`}
            >
              <p className="text-xs uppercase tracking-[0.18em] text-[#b89b54]">
                Capability
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {card.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/52">{card.text}</p>
            </a>
          );
        })}
      </section>

      <NewJobClient selectedTool={selectedTool} />
    </section>
  );
}
