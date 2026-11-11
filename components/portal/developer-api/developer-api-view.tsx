"use client";

import { useEffect, useState } from "react";
import { usePartner } from "@/components/shell/partner-context";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
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
        <h1 className="text-2xl font-semibold">Verification In Progress</h1>
        <p className="mt-2 text-sm text-muted">Your eKYC verification is currently under review. You will be notified once your identity has been verified. API credentials will become available after successful verification.</p>
        <Badge variant="warning" className="mt-4">Pending Review</Badge>
      </section>
    );
  }
  if (status !== "VERIFIED") {
    return (
      <section className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6">
        <h1 className="text-2xl font-semibold">Identity Verification Required</h1>
        <p className="mt-2 text-sm text-muted">Your account needs to be verified before you can access Developer API credentials. Please complete the eKYC verification process to unlock API keys, webhooks, and integration tools.</p>
        <button type="button" className="mt-4 h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Complete eKYC Verification</button>
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

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Developer APIs</h1>
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
      <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 shadow-[var(--shadow)]">For your custom email templates or any developer-related inquiries, please contact support@zetexa.com</p>
      <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 shadow-[var(--shadow)]">For your custom email templates or any developer-related inquiries, please contact support@zetexa.com</p>

      <section className="min-w-0 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">API key</h2>
          <button type="button" onClick={() => setRegen("confirm")} className="text-sm font-semibold text-danger">Regenerate API Keys</button>
        </div>
        <p className="mt-3 break-all rounded-2xl bg-mist px-3 py-3 font-mono text-sm tracking-widest">{"•".repeat(53)}</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(text(active?.api_key_code)).then(() => toast.success("Access key copied to clipboard!"))} className="mt-3 h-9 rounded-xl border border-line px-3 text-xs font-semibold">Copy</button>
        <p className="mt-3 text-sm text-muted">Never share your {env === "production" ? "production" : "stage"} API key in client-side code or public repositories.{env === "production" ? " Regenerating your key will immediately invalidate the current one." : ""}</p>
        {text(active?.api_documentation_url) ? <p className="mt-3 break-all text-sm leading-6">{label} API Docs: <a className="font-semibold text-primary" href={text(active?.api_documentation_url)} target="_blank" rel="noreferrer">{text(active?.api_documentation_url)}</a></p> : null}
      </section>

      <section className="space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
        <h2 className="font-semibold">API password</h2>
        <p className="text-sm text-muted">Your registered email address is your API username. Please create or update your password below to authenticate API requests.</p>
        <PasswordField label="Password" value={password} show={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setPassword} />
        <PasswordField label="Confirm password" value={confirm} show={showConfirm} onToggle={() => setShowConfirm((value) => !value)} onChange={setConfirm} />
        <button type="button" onClick={() => {
          if (!password.trim()) return toast.info("Please enter a password.");
          if (!confirm.trim()) return toast.info("Please confirm the password.");
          if (password.trim() !== confirm.trim()) return toast.info("Password and confirm password do not match.");
          setPasswordOpen(true);
        }} className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Generate</button>
      </section>

      <WebhookPanel title={`${label} Webhook URL`} value={webhook} onChange={setWebhook} busy={busy === "webhook"} onSave={() => saveWebhook("webhook")} payload={active?.webhook_payload} note="The webhook will be automatically triggered once the SIM usage reaches either 0% or 90%." />
      <WebhookPanel title={`${label} ES Webhook Alert`} value={esWebhook} onChange={setEsWebhook} busy={busy === "eswebhook"} onSave={() => saveWebhook("eswebhook")} payload={active?.es_webhook_alert_payload} note="es-webhook-url supports eSIM Activated, eSIM Deactivated, BPP Installation, BPP Installation Completed, BPP Installation Failed, eSIM Installed, and eSIM Deleted." />

      <Dialog open={regen !== "closed"} onOpenChange={() => setRegen("closed")}>
        {regen === "confirm" ? (
          <>
            <DialogHeader>
              <DialogTitle>Regenerate API Key?</DialogTitle>
              <DialogDescription>The old key is permanently replaced. Old requests fail immediately. Integrations must be updated. The new key must stay confidential.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button type="button" onClick={() => setRegen("closed")} className="h-10 rounded-2xl border border-line px-4 text-sm">Cancel</button>
              <button type="button" disabled={busy === "key"} onClick={regenerate} className="h-10 rounded-2xl bg-danger px-4 text-sm font-semibold text-white">Confirm</button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader><DialogTitle>New API key</DialogTitle></DialogHeader>
            <p className="break-all font-mono text-sm">{newKey}</p>
            <button type="button" className="mt-3 text-sm font-semibold" onClick={() => navigator.clipboard.writeText(newKey).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 3000); })}>{copied ? "Copied" : "Copy"}</button>
          </>
        )}
      </Dialog>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogHeader>
          <DialogTitle>Generate API password</DialogTitle>
          <DialogDescription>Generating a new API password will overwrite the previous password.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={() => setPasswordOpen(false)} className="h-10 rounded-2xl border border-line px-4 text-sm">Cancel</button>
          <button type="button" disabled={busy === "password"} onClick={generatePassword} className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Generate</button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function PasswordField({ label, value, show, onToggle, onChange }: { label: string; value: string; show: boolean; onToggle: () => void; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      {label}
      <span className="mt-1 flex gap-2">
        <input type={show ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} className="field min-w-0 flex-1" />
        <button type="button" onClick={onToggle} className="h-10 rounded-2xl border border-line px-3 text-xs">{show ? "Hide" : "Show"}</button>
      </span>
    </label>
  );
}

function WebhookPanel({ title, value, onChange, busy, onSave, payload, note }: { title: string; value: string; onChange: (value: string) => void; busy: boolean; onSave: () => void; payload: unknown; note: string }) {
  return (
    <section className="min-w-0 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
      <h2 className="font-semibold">{title}</h2>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="field mt-4" />
      <button type="button" disabled={busy} onClick={onSave} className="mt-4 h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Save</button>
      {payload ? <pre className="mt-4 overflow-x-auto rounded-2xl bg-mist p-4 text-xs leading-5">{JSON.stringify(payload, null, 2)}</pre> : null}
      {payload ? <p className="mt-2 text-xs text-muted">{note}</p> : null}
    </section>
  );
}
