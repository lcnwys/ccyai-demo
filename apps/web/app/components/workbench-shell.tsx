import Link from "next/link";
import type { ReactNode } from "react";
import { LogoutButton } from "./logout-button";

const navGroups = [
  {
    title: "任务管理",
    items: [
      { href: "/jobs", label: "任务中心" },
      { href: "/jobs/new", label: "新建任务" },
      { href: "/callback-audits", label: "回调审计" },
      { href: "/settings", label: "系统设置" }
    ]
  },
  {
    title: "能力中心",
    items: [
      { href: "/printing-extract", label: "印花提取" },
      { href: "/image-generate", label: "AI 生图" },
      { href: "/fission", label: "图裂变" },
      { href: "/printing-export", label: "印刷图导出" }
    ]
  }
];

export function WorkbenchShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-luxe-noise text-zinc-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-[272px] shrink-0 border-r border-white/6 bg-black/30 backdrop-blur-xl xl:block">
          <div className="border-b border-white/6 px-6 py-6">
            <p className="text-xs uppercase tracking-[0.22em] text-white/38">
              CHCY Workbench
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-champagne">
              创次元生产台
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/42">
              内部与小范围客户体验环境
            </p>
          </div>
          <div className="px-4 py-5">
            {navGroups.map((group) => (
              <section key={group.title} className="mb-7">
                <p className="px-3 text-[11px] uppercase tracking-[0.18em] text-[#b89b54]">
                  {group.title}
                </p>
                <div className="mt-3 grid gap-1.5">
                  {group.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="rounded-[1.1rem] border border-transparent px-3 py-3 text-sm text-white/70 transition hover:border-[#d6b25e]/12 hover:bg-white/[0.045] hover:text-champagne"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/6 bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6 xl:px-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#b89b54]">
                  生产控制台
                </p>
                <p className="mt-1 text-sm text-white/64">
                  单图处理、批量任务、结果导出
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="rounded-full border border-[#d6b25e]/12 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-champagne transition hover:bg-white/[0.08]"
                >
                  返回首页
                </Link>
                <LogoutButton />
                <Link
                  href="/jobs/new"
                  className="rounded-full border border-[#f1d28a]/15 bg-[linear-gradient(180deg,#e9bc63,#b77c32)] px-4 py-2.5 text-sm font-medium text-black shadow-[0_8px_24px_rgba(215,170,84,0.28)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  新建任务
                </Link>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 py-5 sm:px-6 xl:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
