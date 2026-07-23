import { env } from "@/lib/env";
import type { ApiErrorBody } from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

export class ApiUnreachableError extends Error {
  constructor(cause: unknown) {
    super("No se pudo conectar con la API");
    this.name = "ApiUnreachableError";
    this.cause = cause;
  }
}

function apiUrl(path: string) {
  const base = env.NEXT_PUBLIC_API_BASE_URL.replace(/\/+$/, "");
  return `${base}/api${path}`;
}

async function readError(res: Response): Promise<ApiError> {
  const body = await res
    .json()
    .then((value) => value as Partial<ApiErrorBody>)
    .catch(() => null);

  return new ApiError(
    res.status,
    body?.error?.code ?? "UNKNOWN",
    body?.error?.message ?? `La API respondió ${res.status}`,
  );
}

export type ApiFetchOptions = {
  token?: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  cache?: RequestCache;
};

export async function apiFetch<T>(
  path: string,
  { token, method = "GET", body, cache = "no-store" }: ApiFetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method,
      headers,
      cache,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    throw new ApiUnreachableError(cause);
  }

  if (!res.ok) throw await readError(res);
  if (res.status === 204) return undefined as T;

  return (await res.json()) as T;
}
