"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { CheckField, FieldLabel, FieldMessage } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { WaveLoader } from "@/components/ui/wave-loader";
import { smtpFieldErrors } from "@/lib/account-settings";
import {
  asRecord,
  errorText,
  portalRequest,
  requestErrorMessage,
  text,
  type JsonRecord,
} from "@/lib/portal-fetch";

const actionOptions = [
  { value: "otp", label: "OTP" },
  { value: "order", label: "Order Confirmation" },
  { value: "payment_link", label: "Payment Link" },
  { value: "kyc", label: "eKYC Alert" },
];

type SmtpForm = {
  reseller_name: string;
  email_host: string;
  email_port: string;
  email_host_user: string;
  email_host_password: string;
  default_from_email: string;
  email_use_tls: boolean;
  action: string[];
};

function emptySmtp(): SmtpForm {
  return {
    reseller_name: "",
    email_host: "",
    email_port: "",
    email_host_user: "",
    email_host_password: "",
    default_from_email: "",
    email_use_tls: true,
    action: [],
  };
}

function asBool(value: unknown, fallback: boolean) {
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

function asActions(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

function formFrom(data: JsonRecord): SmtpForm {
  return {
    reseller_name: text(data.reseller_name),
    email_host: text(data.email_host),
    email_port: data.email_port == null ? "" : String(data.email_port),
    email_host_user: text(data.email_host_user),
    email_host_password: text(data.email_host_password),
    default_from_email: text(data.default_from_email),
    email_use_tls: data.email_use_tls == null ? true : asBool(data.email_use_tls, true),
    action: asActions(data.action),
  };
}

function smtpPayload(resellerId: string, form: SmtpForm) {
  const known = actionOptions.map((option) => option.value).filter((value) => form.action.includes(value));
  const extra = form.action.filter((value) => !actionOptions.some((option) => option.value === value));
  return {
    reseller_id: resellerId,
    reseller_name: form.reseller_name.trim(),
    email_host: form.email_host.trim(),
    email_port: form.email_port.trim(),
    email_host_user: form.email_host_user.trim(),
    email_host_password: form.email_host_password,
    default_from_email: form.default_from_email.trim(),
    email_use_tls: form.email_use_tls,
    action: [...known, ...extra],
  };
}

function ActionSelect({
  selected,
  onChange,
  disabled,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const extras = selected.filter((value) => !actionOptions.some((option) => option.value === value));
  const options = [...actionOptions, ...extras.map((value) => ({ value, label: value }))];
  const summary = options.filter((option) => selected.includes(option.value)).map((option) => option.label).join(", ");

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative sm:col-span-2">
      <FieldLabel htmlFor="smtp-actions">Use For Actions</FieldLabel>
      <button
        id="smtp-actions"
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        style={{ color: summary ? "var(--ink)" : "color-mix(in srgb, var(--ink) 45%, transparent)" }}
        className={`field mt-2 flex items-center justify-between gap-3 text-left ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        <span className="truncate">{summary}</span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div id={listId} role="listbox" className="absolute z-30 mt-2 w-full space-y-2 rounded-2xl border border-line bg-surface p-3 shadow-[var(--shadow)]">
          {options.map((option) => (
            <CheckField
              key={option.value}
              label={option.label}
              checked={selected.includes(option.value)}
              onChange={(checked) => {
                onChange(checked ? [...selected, option.value] : selected.filter((value) => value !== option.value));
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SmtpSettings({ resellerId }: { resellerId: string }) {
  const [form, setForm] = useState<SmtpForm>(emptySmtp);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const errors = smtpFieldErrors(form);

  useEffect(() => {
    let ignore = false;
    portalRequest<JsonRecord>(`/api/settings?resource=smtp&reseller_id=${encodeURIComponent(resellerId)}`)
      .then((res) => {
        if (ignore) return;
        const data = asRecord(res.data);
        const success = res.success === true || res.success === "true";
        if (success && data) {
          setForm(formFrom(data));
          setExists(true);
          return;
        }
        setForm(emptySmtp());
        setExists(false);
      })
      .catch(() => {
        if (ignore) return;
        setForm(emptySmtp());
        setExists(false);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [resellerId]);

  function update<K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function showError(name: keyof typeof errors) {
    return submitted || touched[name] ? errors[name] : "";
  }

  async function changeTls(next: boolean) {
    const previous = form.email_use_tls;
    update("email_use_tls", next);
    if (!exists) return;
    setSaving(true);
    try {
      const res = await portalRequest<JsonRecord>(
        `/api/settings?resource=smtp&reseller_id=${encodeURIComponent(resellerId)}&notice=tls`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(smtpPayload(resellerId, { ...form, email_use_tls: next })),
        },
      );
      if (res.success === false) throw new Error(errorText(res) || "Failed to update TLS!");
      toast.success("TLS updated successfully!");
    } catch (err) {
      update("email_use_tls", previous);
      const message = requestErrorMessage(err, "Failed to update TLS!");
      if (message) toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(smtpFieldErrors(form)).some(Boolean)) {
      toast.error("Please fill all required SMTP fields correctly!");
      return;
    }
    setSaving(true);
    try {
      const res = await portalRequest<JsonRecord>(
        `/api/settings?resource=smtp&reseller_id=${encodeURIComponent(resellerId)}&notice=save`,
        {
          method: exists ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(smtpPayload(resellerId, form)),
        },
      );
      if (res.success === false) throw new Error(errorText(res) || "Failed to save SMTP configuration!");
      toast.success("SMTP Configuration saved successfully!");
      setExists(true);
    } catch (err) {
      const message = requestErrorMessage(err, "Failed to save SMTP configuration!");
      if (message) toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    setSaving(true);
    try {
      const res = await portalRequest<JsonRecord>(
        `/api/settings?resource=smtp&reseller_id=${encodeURIComponent(resellerId)}&notice=remove`,
        { method: "DELETE" },
      );
      if (res.success === false) throw new Error(errorText(res) || "Failed to remove SMTP configuration!");
      setForm(emptySmtp());
      setExists(false);
      setSubmitted(false);
      setTouched({});
      setShowPassword(false);
      toast.success("SMTP Configuration removed! Default Zetexa sender will be used.");
    } catch (err) {
      const message = requestErrorMessage(err, "Failed to remove SMTP configuration!");
      if (message) toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const passwordError = showError("email_host_password");

  return (
    <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
      <h2 className="text-lg font-semibold text-ink">SMTP Configuration</h2>
      <p className="mt-3 rounded-2xl bg-soft px-4 py-3 text-sm leading-6 text-muted">
        Configure your own SMTP server to send emails from your address/domain. If not configured, the default Zetexa sender will be used.
      </p>
      {loading ? (
        <div className="mt-5 flex items-center gap-3 text-sm text-muted">
          <WaveLoader size="sm" className="text-primary" />
          Loading SMTP configuration...
        </div>
      ) : (
        <form noValidate onSubmit={save} className="mt-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sender-name" required>Sender Name</FieldLabel>
              <input
                id="sender-name"
                value={form.reseller_name}
                maxLength={50}
                placeholder="Enter Sender Name"
                disabled={saving}
                aria-invalid={showError("reseller_name") ? true : undefined}
                onBlur={() => setTouched((current) => ({ ...current, reseller_name: true }))}
                onChange={(event) => update("reseller_name", event.target.value)}
                className="field mt-2"
              />
              <FieldMessage>{showError("reseller_name")}</FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="email-host" required>Email Host</FieldLabel>
              <input
                id="email-host"
                value={form.email_host}
                maxLength={255}
                placeholder="e.g. smtp.gmail.com"
                disabled={saving}
                aria-invalid={showError("email_host") ? true : undefined}
                onBlur={() => setTouched((current) => ({ ...current, email_host: true }))}
                onChange={(event) => update("email_host", event.target.value)}
                className="field mt-2"
              />
              <FieldMessage>{showError("email_host")}</FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="email-port" required>Email Port</FieldLabel>
              <input
                id="email-port"
                value={form.email_port}
                inputMode="numeric"
                placeholder="e.g. 587"
                disabled={saving}
                aria-invalid={showError("email_port") ? true : undefined}
                onBlur={() => setTouched((current) => ({ ...current, email_port: true }))}
                onChange={(event) => update("email_port", event.target.value)}
                className="field mt-2"
              />
              <FieldMessage>{showError("email_port")}</FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="smtp-username" required>SMTP Username</FieldLabel>
              <input
                id="smtp-username"
                value={form.email_host_user}
                maxLength={255}
                placeholder="Enter SMTP username"
                disabled={saving}
                aria-invalid={showError("email_host_user") ? true : undefined}
                onBlur={() => setTouched((current) => ({ ...current, email_host_user: true }))}
                onChange={(event) => update("email_host_user", event.target.value)}
                className="field mt-2"
              />
              <FieldMessage>{showError("email_host_user")}</FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="smtp-password" required>SMTP Password</FieldLabel>
              <div className="relative mt-2">
                <input
                  id="smtp-password"
                  type={showPassword ? "text" : "password"}
                  value={form.email_host_password}
                  maxLength={255}
                  autoComplete="new-password"
                  disabled={saving}
                  aria-invalid={passwordError ? true : undefined}
                  onBlur={() => setTouched((current) => ({ ...current, email_host_password: true }))}
                  onChange={(event) => update("email_host_password", event.target.value)}
                  style={{ paddingRight: "2.75rem" }}
                  className="field"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide SMTP password" : "Show SMTP password"}
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute top-1/2 right-3 inline-flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted hover:text-primary"
                >
                  <Icon name={showPassword ? "eye-off" : "eye"} className="h-4 w-4" />
                </button>
              </div>
              <FieldMessage>{passwordError}</FieldMessage>
            </div>
            <div>
              <FieldLabel htmlFor="from-email" required>From Email Address</FieldLabel>
              <input
                id="from-email"
                value={form.default_from_email}
                inputMode="email"
                autoComplete="email"
                placeholder="e.g. noreply@yourdomain.com"
                disabled={saving}
                aria-invalid={showError("default_from_email") ? true : undefined}
                onBlur={() => setTouched((current) => ({ ...current, default_from_email: true }))}
                onChange={(event) => update("default_from_email", event.target.value)}
                className="field mt-2"
              />
              <FieldMessage>{showError("default_from_email")}</FieldMessage>
            </div>
            <ActionSelect selected={form.action} disabled={saving} onChange={(action) => update("action", action)} />
            <div>
              <p className="text-sm font-medium text-ink">Use TLS</p>
              <div className="mt-3">
                <Switch
                  checked={form.email_use_tls}
                  disabled={saving}
                  onCheckedChange={changeTls}
                  label={form.email_use_tls ? "Enabled" : "Disabled"}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving}
              aria-busy={saving}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50"
            >
              {saving ? "Saving..." : exists ? "Update SMTP Configuration" : "Save SMTP Configuration"}
            </button>
            {exists ? (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:opacity-50"
              >
                Remove & Use Default Sender
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
