export class PortalRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function portalRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const data = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      window.location.assign("/login");
    }
    throw new PortalRequestError(data.message || "Request failed.", response.status);
  }
  return data as T;
}

export function errorText(payload: unknown) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  if (!record) return "";
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.message === "string" && nested.message.trim()) return nested.message.trim();
    if (typeof nested.error === "string" && nested.error.trim()) return nested.error.trim();
  }
  if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
  return "";
}

export function requestErrorMessage(err: unknown, fallback: string) {
  if (err instanceof PortalRequestError && err.status === 401) return "";
  const message = err instanceof Error ? err.message.trim() : "";
  if (
    !message ||
    message === "Request failed." ||
    message === "The service request failed." ||
    message === "Sign in required."
  ) {
    return fallback;
  }
  return message;
}

export function money(amount: number, currency: string) {
  const code = currency.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(code)) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${code}`;
    }
  }
  return `${amount.toFixed(2)} ${currency}`.trim();
}

export type JsonRecord = Record<string, unknown>;

export function asRecord(value: unknown): JsonRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : null;
}

export function asList(value: unknown): JsonRecord[] {
  if (Array.isArray(value)) return value.filter((item) => item && typeof item === "object") as JsonRecord[];
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ["data", "promo_codes", "history", "coupons", "programs"]) {
    if (Array.isArray(record[key])) return asList(record[key]);
  }
  return [];
}

export function text(value: unknown) {
  return value == null ? "" : String(value);
}

export function num(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatWhen(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
