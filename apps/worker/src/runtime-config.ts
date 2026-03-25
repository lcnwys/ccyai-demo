import { readFile } from "node:fs/promises";
import path from "node:path";

type RuntimeSettings = {
  chcy?: {
    apiBaseUrl?: string;
    accessKey?: string;
    secretKey?: string;
    callbackBaseUrl?: string;
  };
  oss?: {
    region?: string;
    bucket?: string;
    accessKeyId?: string;
    accessKeySecret?: string;
  };
};

const candidatePaths = [
  path.resolve(process.cwd(), "storage", "runtime-settings.json"),
  path.resolve(process.cwd(), "..", "..", "storage", "runtime-settings.json")
];

export async function loadRuntimeSettings() {
  for (const filePath of candidatePaths) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as RuntimeSettings;
      return parsed;
    } catch {
      continue;
    }
  }

  return {};
}
