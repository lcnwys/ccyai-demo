import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type CallbackAuditRecord = {
  id: string;
  createdAt: string;
  outcome: "accepted" | "rejected" | "ignored";
  reason: string;
  providerTaskId: string | null;
  requestId: string | null;
  headers: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
};

@Injectable()
export class CallbackAuditService {
  private readonly root = path.resolve(process.cwd(), "storage", "callback-audits");

  private getFilePath(date = new Date()) {
    const day = date.toISOString().slice(0, 10).replace(/-/g, "");
    return path.join(this.root, `${day}.log`);
  }

  async record(record: CallbackAuditRecord) {
    await mkdir(this.root, { recursive: true });
    const filePath = this.getFilePath();
    let current = "";

    try {
      current = await readFile(filePath, "utf8");
    } catch {
      current = "";
    }

    const line = `${JSON.stringify(record)}\n`;
    await writeFile(filePath, `${current}${line}`, "utf8");
  }

  async list(limit = 50) {
    const filePath = this.getFilePath();

    try {
      const content = await readFile(filePath, "utf8");
      return content
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as CallbackAuditRecord)
        .slice(-limit)
        .reverse();
    } catch {
      return [];
    }
  }
}
