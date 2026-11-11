export function preferredTimeZone() {
  try {
    const stored = localStorage.getItem("PREFERRED_TIMEZONE");
    if (stored) {
      const value = JSON.parse(stored) as { value?: string };
      if (value.value) return value.value;
    }
  } catch {
    /* use the browser zone */
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatLedgerTime(value: unknown, shiftIst: boolean) {
  if (!value) return "";
  const raw = String(value);
  const date = new Date(raw.endsWith("Z") ? raw : `${raw}Z`);
  if (Number.isNaN(date.getTime())) return raw;
  const instant = shiftIst ? date.getTime() + (5 * 60 + 30) * 60 * 1000 : date.getTime();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: preferredTimeZone(),
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(instant));
}

export function formatUtcStamp(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${pick("day")}-${pick("month")}-${pick("year")} ${pick("hour")}:${pick("minute")}:${pick("second")}`;
}
