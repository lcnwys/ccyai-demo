import type { Metadata } from "next";
import React from "react";
import { WorkbenchShell } from "./components/workbench-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "创次元批量生产平台",
  description: "批量印花提取与生图工作台"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <WorkbenchShell>{children}</WorkbenchShell>
      </body>
    </html>
  );
}
