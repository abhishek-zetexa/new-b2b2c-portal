"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FiAlertTriangle, FiCopy, FiEye, FiEyeOff, FiInfo, FiKey } from "react-icons/fi";
import { usePartner } from "@/components/shell/partner-context";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-toastify";
import { PageLoader } from "@/components/ui/wave-loader";
import { asRecord, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

type EnvName = "production" | "staging";

export function DeveloperApiView() {
  const partner = usePartner();
  const status = partner.resellerStatus.toUpperCase();
  if (!partner.ready) return <PageLoader />;
  if (status === "APPROVED") return null;
  if (status === "PENDING") {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Verification In Progress</h1>
        <p className="mt-2 text-sm text-muted">Your eKYC verification is currently under review. You will be notified once your identity has been verified. API credentials will become available after successful verification.</p>
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-danger/10 px-2.5 py-1 text-xs font-semibold text-danger"><span className="h-1.5 w-1.5 rounded-full bg-danger" />Pending Review</span>
      </section>
    );
  }
  if (status !== "VERIFIED") {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Identity Verification Required</h1>
        <p className="mt-2 text-sm text-muted">Your account needs to be verified before you can access Developer API credentials. Please complete the eKYC verification process to unlock API keys, webhooks, and integration tools.</p>
        <button type="button" className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">Complete eKYC Verification</button>
      </section>
    );
  }
  return <VerifiedApi />;
}

function VerifiedApi() {
  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState<EnvName>("production");
  const [production, setProduction] = useState<JsonRecord | null>(null);
  const [staging, setStaging] = useState<JsonRecord | null>(null);
  const [webhook, setWebhook] = useState("");
  const [esWebhook, setEsWebhook] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [regen, setRegen] = useState<"closed" | "confirm" | "success">("closed");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [busy, setBusy] = useState<"webhook" | "eswebhook" | "password" | "key" | "stage" | "">("");

  const active = env === "staging" ? staging : production;
  const source = text(production?.source);
  const resellerId = text(active?.reseller_id);

  function apply(info: JsonRecord | null) {
    setWebhook(text(info?.webhook_url));
    setEsWebhook(text(info?.es_webhook_alert));
  }

  async function loadProduction() {
    const res = await portalRequest<JsonRecord>("/api/developer");
    const data = asRecord(res.data);
    setProduction(data);
    return data;
  }

  useEffect(() => {
    loadProduction()
      .then((data) => apply(data))
      .catch(() => toast.error("Failed to load Developer API info."))
      .finally(() => setLoading(false));
  }, []);

  async function profileEmail() {
    const profile = await portalRequest<JsonRecord>("/api/developer?env=profile");
    return text(asRecord(profile.profile_data)?.email);
  }

  async function fetchStaging(email: string) {
    const res = await portalRequest<JsonRecord>(`/api/developer?env=staging&email=${encodeURIComponent(email)}`);
    return asRecord(res.data);
  }

  async function loadStaging() {
    setBusy("stage");
    try {
      const email = await profileEmail();
      if (!email) {
        toast.info("Unable to find account email for dev API details.");
        return;
      }
      if (staging) {
        setEnv("staging");
        apply(staging);
      }
      const data = await fetchStaging(email);
      if (!data) {
        toast.error("Staging API details were not returned.");
        return;
      }
      setStaging(data);
      setEnv("staging");
      apply(data);
      toast.success("Staging API details loaded successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Staging API details.");
    } finally {
      setBusy("");
    }
  }

  async function showProduction() {
    setBusy("stage");
    try {
      const data = await loadProduction();
      setEnv("production");
      apply(data);
    } catch {
      toast.error("Failed to load Developer API info.");
    }
    try {
      const email = await profileEmail();
      if (!email) {
        toast.info("Unable to find account email for dev API details.");
      } else {
        const data = await fetchStaging(email);
        if (!data) toast.error("Staging API details were not returned.");
        else setStaging(data);
      }
    } catch {
      toast.error("Failed to load Staging API details.");
    } finally {
      setBusy("");
    }
  }

  async function saveWebhook(action: "webhook" | "eswebhook") {
    if (action === "webhook" && !webhook.trim()) {
      toast.info("Please enter a webhook URL.");
      return;
    }
    if (action === "eswebhook" && !esWebhook.trim()) {
      toast.info("Please enter an ES webhook alert URL.");
      return;
    }
    setBusy(action);
    try {
      await portalRequest("/api/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, env, reseller_id: resellerId, webhook_url: webhook, es_webhook_alert: esWebhook }),
      });
      toast.success(action === "webhook" ? "Webhook URL updated successfully!" : "ES webhook alert updated successfully!");
    } catch {
      toast.error(action === "webhook" ? "Failed to update webhook URL." : "Failed to update ES webhook alert.");
    } finally {
      setBusy("");
    }
  }

  async function regenerate() {
    setBusy("key");
    try {
      const res = await portalRequest<JsonRecord>("/api/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "regenerate", env, reseller_id: resellerId }),
      });
      const key = text(res.api_key_code);
      setNewKey(key);
      const applyKey = (current: JsonRecord | null) => current ? { ...current, api_key_code: key } : current;
      if (env === "staging") setStaging(applyKey);
      else setProduction(applyKey);
      setRegen("success");
    } catch {
      toast.error("Failed to regenerate API key. Please try again.");
      setRegen("closed");
    } finally {
      setBusy("");
    }
  }

  async function generatePassword() {
    setBusy("password");
    try {
      const res = await portalRequest<JsonRecord>("/api/developer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "password", env, reseller_id: resellerId, password }),
      });
      if (res.success === false) throw new Error(text(res.message));
      setPassword("");
      setConfirm("");
      setPasswordOpen(false);
      toast.success("Password generated successfully!");
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Failed to generate password.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <PageLoader />;
  const label = env === "production" ? "Production" : "Stage";
  const docsUrl = text(active?.api_documentation_url);

  function copyKey() {
    const key = text(active?.api_key_code);
    if (!key) return;
    navigator.clipboard.writeText(key).then(() => toast.success("Access key copied to clipboard!")).catch(() => toast.error("Failed to copy to clipboard"));
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Developer APIs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Keys, webhooks, and the API password for this account.</p>
        </div>
        {source === "PROD" ? (
          <Tabs value={env} onValueChange={(value) => { if (value === "production") showProduction(); else loadStaging(); }}>
            <TabsList>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="staging">{busy === "stage" ? "Loading..." : "Stage"}</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
      </div>

      <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 shadow-[var(--shadow)]">
        For your custom email templates or any developer-related inquiries, please contact{" "}
        <a href="mailto:support@zetexa.com" className="font-semibold text-primary underline">support@zetexa.com</a>
      </p>

      <section className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mint text-primary"><FiKey className="h-5 w-5" /></span>
          <h2 className="text-lg font-semibold text-ink">API key</h2>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-page px-4 py-3">
          <span className="min-w-0 flex-1 select-none font-mono text-base tracking-[0.22em] text-muted">{"•".repeat(42)}</span>
          <button type="button" aria-label="Copy API key" onClick={copyKey} className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-soft hover:text-primary">
            <FiCopy className="h-4 w-4" />
          </button>
        </div>
        <button type="button" onClick={() => setRegen("confirm")} className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-danger px-5 text-sm font-semibold text-white transition hover:opacity-90">Regenerate API Keys</button>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-6 text-ink">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <p>Never share your {env === "production" ? "production" : "stage"} API key in client-side code or public repositories.{env === "production" ? " Regenerating your key will immediately invalidate the current one." : ""}</p>
        </div>
        {docsUrl ? (
          <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 rounded-2xl bg-soft/80 px-4 py-3 text-sm leading-6">
            <span className="font-semibold text-ink">{label} API Docs:</span>
            <a className="break-all font-semibold text-primary" href={docsUrl} target="_blank" rel="noreferrer">{docsUrl}</a>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-lg font-semibold text-ink">API password</h2>
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-primary/20 bg-mint/50 px-4 py-3 text-sm leading-6 text-ink">
          <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p><span className="font-semibold">Note:</span> Your registered email address is your API username. Please create or update your password below to authenticate API requests.</p>
        </div>
        <div className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2">
          <PasswordField label="Password" placeholder="Enter Password" value={password} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setPassword} />
          <PasswordField label="Confirm Password" placeholder="Confirm Password" value={confirm} show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} onChange={setConfirm} />
        </div>
        <button type="button" onClick={() => {
          if (!password.trim()) return toast.info("Please enter a password.");
          if (!confirm.trim()) return toast.info("Please confirm the password.");
          if (password.trim() !== confirm.trim()) return toast.info("Password and confirm password do not match.");
          setPasswordOpen(true);
        }} className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">Submit</button>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <WebhookPanel title={`${label} Webhook URL`} placeholder="Enter Webhook URL" value={webhook} onChange={setWebhook} busy={busy === "webhook"} onSave={() => saveWebhook("webhook")} payload={active?.webhook_payload} payloadTitle="Webhook Payload" note="The webhook will be automatically triggered once the SIM usage reaches either 0% or 90%." />
        <WebhookPanel title={`${label} ES Webhook Alert`} placeholder="Enter ES Webhook Alert URL" value={esWebhook} onChange={setEsWebhook} busy={busy === "eswebhook"} onSave={() => saveWebhook("eswebhook")} payload={active?.es_webhook_alert_payload} payloadTitle="ES Webhook Alert Payload" note={<>The <code className="rounded bg-soft px-1 font-mono text-[11px] text-primary">es-webhook-url</code> supports eSIM status events such as eSIM Activated, eSIM Deactivated, BPP Installation, BPP Installation Completed, BPP Installation Failed, eSIM Installed, and eSIM Deleted.</>} />
      </div>

      <Dialog open={regen !== "closed"} onOpenChange={() => { if (busy !== "key") setRegen("closed"); }}>
        {regen === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Regenerate API Key?</DialogTitle>
              <DialogDescription>You are about to generate a new {label} API Key. Please read the following carefully before proceeding.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 rounded-2xl border border-line bg-page px-4 py-3 text-sm leading-6 text-ink">
              <li>Your existing API Key will be permanently replaced and immediately invalidated.</li>
              <li>All API requests using the old key will be rejected instantly.</li>
              <li>You must update your integrations and services with the new API Key immediately.</li>
              <li>Keep your new key strictly confidential. Never share it publicly or in client-side code.</li>
            </ul>
            <DialogFooter>
              <button type="button" onClick={() => setRegen("closed")} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">Cancel</button>
              <button type="button" disabled={busy === "key"} onClick={regenerate} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-danger px-5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60">{busy === "key" ? "Regenerating..." : "Yes, Regenerate"}</button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>New API Key Generated!</DialogTitle>
              <DialogDescription>Your new {label} API Key has been generated successfully. Copy it now. This is the only time it will be shown in full here.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-2xl border border-primary/30 bg-page px-4 py-3">
              <p className="min-w-0 flex-1 break-all font-mono text-sm text-ink">{newKey}</p>
              <button type="button" className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-on-primary" onClick={() => navigator.clipboard.writeText(newKey).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 3000); }).catch(() => toast.error("Failed to copy to clipboard"))}>
                <FiCopy className="h-3.5 w-3.5" />{copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm leading-6 text-ink">
              <FiAlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <p><span className="font-semibold">Important:</span> Update all your services and integrations with this new key immediately. Never share it with anyone.</p>
            </div>
            <DialogFooter>
              <button type="button" onClick={() => setRegen("closed")} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">Done</button>
            </DialogFooter>
          </>
        )}
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogHeader>
          <DialogTitle>Generate API password</DialogTitle>
          <DialogDescription>Generating a new API password will overwrite the previous password.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={() => setPasswordOpen(false)} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">Cancel</button>
          <button type="button" disabled={busy === "password"} onClick={generatePassword} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">Generate</button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function PasswordField({ label, placeholder, value, show, onToggle, onChange }: { label: string; placeholder: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm font-medium text-ink">
      {label}
      <span className="relative mt-1.5 block">
        <input type={show ? "text" : "password"} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="field pr-12" />
        <button type="button" aria-label={show ? `Hide ${label}` : `Show ${label}`} onClick={onToggle} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:text-primary">
          {show ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
        </button>
      </span>
    </label>
  );
}

function WebhookPanel({ title, placeholder, value, onChange, busy, onSave, payload, payloadTitle, note }: { title: string; placeholder: string; value: string; onChange: (value: string) => void; busy: boolean; onSave: () => void; payload: unknown; payloadTitle: string; note: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="field min-w-0 sm:flex-1" />
        <button type="button" disabled={busy} onClick={onSave} className="inline-flex h-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting..." : "Submit"}</button>
      </div>
      {payload ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-line bg-page">
          <p className="border-b border-line px-4 py-2.5 text-sm font-semibold text-ink">{payloadTitle}</p>
          <pre className="max-h-80 overflow-auto px-4 py-3 text-xs leading-5 break-words whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
          <p className="flex items-start gap-2 border-t border-line bg-mint/40 px-4 py-3 text-xs leading-5 text-ink"><FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" /><span><span className="font-semibold">Note:</span> {note}</span></p>
        </div>
      ) : null}
    </section>
  );
}
