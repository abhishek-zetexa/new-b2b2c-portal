export type SmtpInput = {
  reseller_name: string;
  email_host: string;
  email_port: string;
  email_host_user: string;
  email_host_password: string;
  default_from_email: string;
};

export function markupPayload(input: string): { ok: true; markup: number } | { ok: false } {
  const raw = input.trim();
  if (raw === "") return { ok: true, markup: 0 };
  if (!/^\d{1,3}$/.test(raw)) return { ok: false };
  const markup = Number(raw);
  if (!Number.isInteger(markup) || markup < 0 || markup > 999) return { ok: false };
  return { ok: true, markup };
}

export function addonMarkupError(input: string) {
  const raw = input.trim();
  if (!raw || !/^-?\d+(\.\d+)?$/.test(raw)) return "Reseller markup is required";
  const amount = Number(raw);
  if (amount < 0) return "Markup must be at least 0%";
  if (amount > 100) return "Markup cannot exceed 100%";
  return "";
}

export function smtpFieldErrors(input: SmtpInput) {
  const email = input.default_from_email.trim();
  const port = input.email_port.trim();
  return {
    reseller_name: input.reseller_name.trim() ? "" : "Sender name is required.",
    email_host: input.email_host.trim() ? "" : "Email host is required.",
    email_port: !port ? "Email port is required." : /^\d{1,5}$/.test(port) ? "" : "Port must be a number (max 5 digits).",
    email_host_user: input.email_host_user.trim() ? "" : "SMTP username is required.",
    email_host_password: input.email_host_password.trim() ? "" : "SMTP password is required.",
    default_from_email: !email
      ? "From email is required."
      : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? ""
        : "Enter a valid email address.",
  };
}

export type DestinationIdentity = {
  id?: unknown;
  country_id?: unknown;
};

export function identityKeys(item: DestinationIdentity) {
  return [item.id, item.country_id]
    .filter((value) => value !== undefined && value !== null && String(value) !== "")
    .map((value) => String(value));
}

export function isDuplicateDestination(existing: DestinationIdentity[], next: DestinationIdentity) {
  const incoming = identityKeys(next);
  if (incoming.length === 0) return false;
  return existing.some((item) => identityKeys(item).some((key) => incoming.includes(key)));
}

export function sameSelection(current: string[], baseline: string[]) {
  return current.length === baseline.length && current.every((value, index) => value === baseline[index]);
}
