const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api";

async function resolveApiBaseUrl() {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return API_BASE_URL;
  }

  if (typeof window !== "undefined") {
    return API_BASE_URL;
  }

  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "127.0.0.1:3001";
  const proto =
    headerStore.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  const path = API_BASE_URL.startsWith("/") ? API_BASE_URL : `/${API_BASE_URL}`;

  return `${proto}://${host}${path}`;
}

async function resolveApiUrl(path: string) {
  const baseUrl = await resolveApiBaseUrl();
  return `${baseUrl}${path}`;
}

export function buildApiUrl(path: string) {
  return `${API_BASE_URL.replace(/\/api$/, "")}${path}`;
}

function readClientSessionToken() {
  if (typeof document === "undefined") {
    return undefined;
  }

  const value = document.cookie
    .split("; ")
    .find((item) => item.startsWith("chcy_session="));

  return value ? decodeURIComponent(value.split("=")[1] ?? "") : undefined;
}

function buildAuthHeaders(token?: string, headers?: HeadersInit) {
  const resolvedToken = token ?? readClientSessionToken();
  const nextHeaders = new Headers(headers);

  if (resolvedToken) {
    nextHeaders.set("Authorization", `Bearer ${resolvedToken}`);
  }

  return nextHeaders;
}

async function safeFetchJson<T>(
  input: string,
  init?: RequestInit,
  token?: string
): Promise<{ data: T; error: string | null }> {
  try {
    const response = await fetch(input, {
      ...init,
      headers: buildAuthHeaders(token, init?.headers)
    });

    if (!response.ok) {
      return {
        data: null as T,
        error: await response.text()
      };
    }

    return {
      data: (await response.json()) as T,
      error: null
    };
  } catch (error) {
    return {
      data: null as T,
      error: error instanceof Error ? error.message : "fetch failed"
    };
  }
}

export type UploadedFileResult = {
  fileId: string;
  ossKey: string;
  url?: string;
};

export type BatchJobSummary = {
  id: string;
  name: string;
  type: string;
  capability?: string | null;
  status: string;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
};

export type BatchJobDetail = {
  id: string;
  name: string;
  status: string;
  type: string;
  capability?: string | null;
  totalCount: number;
  successCount: number;
  failedCount: number;
  createdAt: string;
  items: Array<{
    id: string;
    status: string;
    step: string;
    prompt: string | null;
    resolutionId: number | null;
    aspectRatioId: number | null;
    options: null | {
      similarity?: number;
    };
    errorMessage: string | null;
    sourceFileId: string | null;
    resultFileId: string | null;
    resultDownloadPath: string | null;
    resultFile: null | {
      id: string;
      fileName: string;
      mimeType: string;
    };
    providerTasks: Array<{
      id: string;
      taskType: string;
      providerTaskId: string;
      status: string;
      retryCount: number;
      createdAt: string;
      callbackPayload: unknown;
    }>;
  }>;
};

export type RegenerateBatchJobItemInput = {
  prompt?: string | null;
  resolutionId?: number | null;
  aspectRatioId?: number | null;
  similarity?: number | null;
  useSourceFile?: boolean;
};

export type CreateBatchJobInput = {
  name: string;
  type: "PRINTING_EXTRACT" | "IMAGE_GENERATE";
  config?: Record<string, unknown>;
  items: Array<{
    sourceFileId?: string | null;
    prompt?: string;
    aspectRatioId?: number;
    resolutionId?: number;
  }>;
};

export type SystemSettings = {
  app: {
    loginEmail: string;
    loginPassword: string;
    sessionSecret: string;
  };
  chcy: {
    apiBaseUrl: string;
    accessKey: string;
    secretKey: string;
    callbackBaseUrl: string;
  };
  oss: {
    region: string;
    bucket: string;
    accessKeyId: string;
    accessKeySecret: string;
  };
};


export type CurrentUserProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  chcyAccessKey: string;
  chcySecretKey: string;
  hasChcyCredentials: boolean;
};

export async function uploadFile(file: File, token?: string) {
  const form = new FormData();
  form.append("file", file);

  const response = await fetch(await resolveApiUrl("/files"), {
    method: "POST",
    body: form,
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<UploadedFileResult>;
}

export async function createBatchJob(payload: CreateBatchJobInput, token?: string) {
  const response = await fetch(await resolveApiUrl("/batch-jobs"), {
    method: "POST",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ data: { batchJobId: string } }>;
}

export async function listBatchJobs(token?: string) {
  const result = await safeFetchJson<{
    data: BatchJobSummary[];
  }>(await resolveApiUrl("/batch-jobs"), { cache: "no-store" }, token);

  return {
    data: result.data?.data ?? [],
    error: result.error
  };
}

export async function getBatchJob(id: string, token?: string) {
  const result = await safeFetchJson<{
    data: BatchJobDetail | null;
  }>(await resolveApiUrl(`/batch-jobs/${id}`), { cache: "no-store" }, token);

  return {
    data: result.data?.data ?? null,
    error: result.error
  };
}

export async function retryBatchJob(id: string, token?: string) {
  const response = await fetch(await resolveApiUrl(`/batch-jobs/${id}/retry`), {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      batchJobId: string;
      retriedCount: number;
    };
  }>;
}

export async function exportBatchJob(id: string, token?: string) {
  const response = await fetch(await resolveApiUrl(`/batch-jobs/${id}/export`), {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      batchJobId: string;
      status: string;
      exportUrl: string | null;
      message: string;
    };
  }>;
}

export async function retryBatchJobItem(id: string, token?: string) {
  const response = await fetch(await resolveApiUrl(`/batch-jobs/items/${id}/retry`), {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      itemId: string;
      retried: boolean;
      message: string;
    };
  }>;
}

export async function regenerateBatchJobItem(
  id: string,
  payload: RegenerateBatchJobItemInput,
  token?: string
) {
  const response = await fetch(await resolveApiUrl(`/batch-jobs/items/${id}/regenerate`), {
    method: "POST",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      itemId: string;
      newItemId: string;
      created: boolean;
      message: string;
    };
  }>;
}

export async function exportPrintAsset(
  itemId: string,
  dpi: number,
  token?: string
) {
  const response = await fetch(await resolveApiUrl(`/batch-jobs/items/${itemId}/print-export`), {
    method: "POST",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify({ dpi })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      itemId: string;
      exportUrl: string | null;
      message: string;
    };
  }>;
}

export async function syncBatchJobItemResult(id: string, token?: string) {
  console.info("[CHCY WEB] 手动查询结果 -> 请求开始", {
    itemId: id,
    url: await resolveApiUrl(`/batch-jobs/items/${id}/sync-result`)
  });
  const response = await fetch(await resolveApiUrl(`/batch-jobs/items/${id}/sync-result`), {
    method: "POST",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[CHCY WEB] 手动查询结果 -> 请求失败", {
      itemId: id,
      status: response.status,
      body: text
    });
    throw new Error(text);
  }

  const payload = (await response.json()) as {
    data: {
      itemId: string;
      synced: boolean;
      generateImageId?: string | null;
      message: string;
    };
  };
  console.info("[CHCY WEB] 手动查询结果 -> 请求成功", {
    itemId: id,
    payload
  });
  return payload;
}

export async function listCallbackAudits(limit = 50, token?: string) {
  const result = await safeFetchJson<
    Array<{
      id: string;
      createdAt: string;
      outcome: "accepted" | "rejected" | "ignored";
      reason: string;
      providerTaskId: string | null;
      requestId: string | null;
      body: Record<string, unknown>;
    }>
  >(await resolveApiUrl(`/callback-audits?limit=${limit}`), { cache: "no-store" }, token);

  return {
    data: result.data ?? [],
    error: result.error
  };
}

export async function login(input: { email: string; password: string }) {
  const response = await fetch(await resolveApiUrl("/auth/login"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      token: string;
      user: {
        id: string;
        email: string;
        name: string;
        role: string;
            };
    };
  }>;
}

export async function getBootstrapUser() {
  const result = await safeFetchJson<{
    data: {
      email: string;
      passwordHint: string;
    };
  }>(await resolveApiUrl("/auth/bootstrap-user"), {
    cache: "no-store"
  });

  return {
    data: result.data?.data ?? null,
    error: result.error
  };
}

export async function getSystemSettings(token?: string) {
  const response = await fetch(await resolveApiUrl("/system-settings"), {
    cache: "no-store",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ data: SystemSettings }>;
}

export async function updateSystemSettings(payload: SystemSettings, token?: string) {
  const response = await fetch(await resolveApiUrl("/system-settings"), {
    method: "PUT",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ data: SystemSettings }>;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}) {
  const response = await fetch(await resolveApiUrl("/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{
    data: {
      token: string;
      user: CurrentUserProfile;
    };
  }>;
}

export async function getCurrentUser(token?: string) {
  const response = await fetch(await resolveApiUrl("/auth/me"), {
    cache: "no-store",
    headers: buildAuthHeaders(token)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ data: CurrentUserProfile }>;
}

export async function updateMyChcyCredentials(
  input: { chcyAccessKey: string; chcySecretKey: string },
  token?: string
) {
  const response = await fetch(await resolveApiUrl("/auth/me/chcy-credentials"), {
    method: "PUT",
    headers: buildAuthHeaders(token, {
      "Content-Type": "application/json"
    }),
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<{ data: CurrentUserProfile }>;
}

