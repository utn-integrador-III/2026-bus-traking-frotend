type ApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
};

type ApiErrorEnvelope = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ApiErrorBody = {
  message?: string;
  error?: string | ApiErrorEnvelope;
  code?: string;
  details?: unknown;
};

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

function getApiUrl() {
  if (!rawApiUrl) {
    throw new ApiClientError(0, "EXPO_PUBLIC_API_URL no esta configurada.");
  }

  return rawApiUrl.replace(/\/$/, "");
}

function getApiErrorEnvelope(body: ApiErrorBody | null): ApiErrorEnvelope {
  if (!body) {
    return { message: "No se pudo completar la solicitud." };
  }

  if (typeof body.error === "object" && body.error !== null) {
    return {
      code: body.error.code || body.code,
      message: body.error.message || body.message || "No se pudo completar la solicitud.",
      details: body.error.details ?? body.details,
    };
  }

  return {
    code: body.code,
    message: body.message || body.error || "No se pudo completar la solicitud.",
    details: body.details,
  };
}

export class ApiClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return { message: text };
  }
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.token) {
    headers.Authorization = "Bearer " + options.token;
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    const apiError = getApiErrorEnvelope(body);

    throw new ApiClientError(
      response.status,
      apiError.message || "No se pudo completar la solicitud.",
      apiError.code,
      apiError.details,
    );
  }

  return body as T;
}
