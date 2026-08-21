const API_BASE = "/api";

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.details = details;
  }
}

/**
 * The backend's Zod validation-error responses shape `details` as
 * `{ error: "Validation failed", details: { fieldName: ["reason", ...] } }`
 * (see errorHandler.ts) — the top-level `error` string alone is just the
 * generic "Validation failed", which isn't useful to show a customer.
 * Pull the actual field-level reason(s) out when present.
 */
function extractValidationMessage(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const messages = Object.values(details as Record<string, unknown>)
    .flat()
    .filter((v): v is string => typeof v === "string" && v.length > 0);
  return messages.length > 0 ? messages.join(" ") : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // A FormData body (file uploads) must NOT get an explicit Content-Type —
  // the browser sets its own `multipart/form-data; boundary=...` from the
  // FormData instance, and overriding it here would break the boundary and
  // the server's multer parser wouldn't be able to read the file at all.
  const isFormData = options.body instanceof FormData;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include", // send the admin httpOnly cookie when present
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = extractValidationMessage(body?.details) ?? body?.error ?? res.statusText;
    throw new ApiRequestError(res.status, message, body?.details);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  /** For multipart file uploads — pass a FormData instance, not a plain object. */
  upload: <T>(path: string, formData: FormData) => request<T>(path, { method: "POST", body: formData }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
