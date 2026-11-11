"use client";

import { useEffect, useState } from "react";
import { usePartner } from "@/components/shell/partner-context";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/form-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { PageLoader } from "@/components/ui/wave-loader";
import { asRecord, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

const defaults = { primary_color: "#F97316", secondary_color: "#3B5BDB", star_color: "#d2d4da" };
const templates = [
  { id: "otp", label: "OTP", description: "One-time password sent to verify a customer." },
  { id: "order", label: "Order", description: "Order confirmation with eSIM details and installation steps." },
  { id: "paymentLink", label: "Payment Link", description: "Payment request with the order summary and a pay button." },
  { id: "ekyc", label: "eKYC", description: "Request to complete identity verification." },
  { id: "ekycCompleted", label: "eKYC Completed", description: "Confirmation that identity verification succeeded." },
] as const;

type Brand = typeof defaults & { display_name: string; support_email: string; logo_url: string };

export function BrandingView() {
  const partner = usePartner();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brand, setBrand] = useState<Brand>({ ...defaults, display_name: "", support_email: "", logo_url: "" });
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [sample, setSample] = useState<(typeof templates)[number]["id"] | "">("");

  useEffect(() => {
    if (!partner.ready) return;
    if (partner.role === "RESELLER_AGENT") return;
    if (!partner.resellerId) {
      toast.error("Reseller ID not found");
      setLoading(false);
      return;
    }
    portalRequest<JsonRecord>("/api/branding")
      .then((res) => {
        const data = asRecord(res.data);
        if (!res.success || !data) {
          toast.error("No branding details found");
          return;
        }
        setBrand({
          display_name: text(data.display_name),
          support_email: text(data.support_email),
          logo_url: text(data.logo_url),
          primary_color: text(data.primary_color) || defaults.primary_color,
          secondary_color: text(data.secondary_color) || defaults.secondary_color,
          star_color: text(data.star_color) || defaults.star_color,
        });
        setPreview(text(data.logo_url));
        setFileName(text(data.logo_url).split("/").pop() || "");
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [partner.ready, partner.resellerId, partner.role]);

  if (!partner.ready || loading) return <PageLoader />;
  if (partner.role === "RESELLER_AGENT") return null;

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    setLogo(file);
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!partner.resellerId) return toast.error("Reseller ID not found in session. Please log in again.");
    if (!brand.display_name) return toast.error("Display name is required");
    if (!logo) return toast.error("Logo is required");
    const body = new FormData();
    body.set("logo", logo);
    body.set("display_name", brand.display_name);
    body.set("support_email", brand.support_email);
    body.set("primary_color", brand.primary_color);
    body.set("secondary_color", brand.secondary_color);
    body.set("star_color", brand.star_color);
    setSaving(true);
    try {
      const res = await portalRequest<JsonRecord>("/api/branding", { method: "POST", body });
      if (res.success === false) throw new Error(text(res.message) || "Something went wrong");
      toast.success(text(res.message) || "Branding updated successfully");
      const refreshed = await portalRequest<JsonRecord>("/api/branding");
      const data = asRecord(refreshed.data);
      if (data) setPreview(text(data.logo_url));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Branding & Preference</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Logo and colors used on customer email.</p>
      </div>
      <Tabs value="email" onValueChange={() => undefined}>
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <form onSubmit={save} className="min-w-0 space-y-5 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
        <div>
          <h2 className="text-xl font-semibold">Brand settings</h2>
          <p className="mt-1 text-sm text-muted">These values appear on every customer email.</p>
        </div>
        <div className="rounded-2xl border border-dashed border-line p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            Logo
            <Tooltip content="40 x 120 px recommended for Email templates. Supported formats: PNG, JPG, SVG. Max 500 KB.">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs text-muted">i</span>
            </Tooltip>
          </div>
          <input type="file" accept="image/*" className="mt-3 block text-xs" onChange={(event) => onFile(event.target.files?.[0])} />
          {preview ? <img src={preview} alt="" className="mt-4 h-12 max-w-[120px] object-contain" /> : null}
          {fileName ? <span className="mt-2 block break-all text-xs text-muted">{fileName}</span> : null}
          {preview ? <button type="button" className="mt-3 text-xs font-semibold text-danger" onClick={() => { setLogo(null); setPreview(""); setFileName(""); }}>Remove</button> : null}
        </div>
        <TextField id="display-name" label="Display Name" required value={brand.display_name} onChange={(value) => setBrand({ ...brand, display_name: value })} />
        <TextField id="support-email" label="Support Email" value={brand.support_email} onChange={(value) => setBrand({ ...brand, support_email: value })} />
        <p className="text-xs text-muted">Optional fields will use system defaults if not set.</p>
        <ColorField label="Primary" hint="Used for headers, buttons and key highlights in the email template." value={brand.primary_color} onChange={(value) => setBrand({ ...brand, primary_color: value })} />
        <ColorField label="Secondary" hint="Used for support card background in the email template." value={brand.secondary_color} onChange={(value) => setBrand({ ...brand, secondary_color: value })} />
        <ColorField label="Star" hint="Used for ★ Symbol." value={brand.star_color} onChange={(value) => setBrand({ ...brand, star_color: value })} />
        <div className="flex gap-2">
          <button type="button" onClick={() => { setLogo(null); setPreview(""); setFileName(""); setBrand({ ...defaults, display_name: "", support_email: "", logo_url: "" }); }} className="h-10 rounded-2xl border border-line px-4 text-sm">RESET</button>
          <button disabled={saving} className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
      <aside className="min-w-0">
        <h2 className="text-lg font-semibold">Sample templates</h2>
        <p className="mt-1 text-sm text-muted">Preview how your logo and colors look on each email.</p>
        <div className="mt-4 space-y-3">
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => setSample(template.id)} className="block w-full rounded-3xl border border-line bg-surface p-4 text-left">
              <span className="font-semibold">{template.label}</span>
              <span className="mt-1 block text-sm text-muted">{template.description}</span>
            </button>
          ))}
        </div>
      </aside>
      </div>
      <Dialog open={Boolean(sample)} onOpenChange={() => setSample("")} className="max-w-3xl">
        <DialogHeader><DialogTitle>{templates.find((item) => item.id === sample)?.label} Preview</DialogTitle></DialogHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          {templates.map((template) => <button key={template.id} type="button" onClick={() => setSample(template.id)} className={`h-8 rounded-xl px-3 text-xs ${sample === template.id ? "bg-primary text-white" : "bg-mist"}`}>{template.label}</button>)}
        </div>
        {sample ? <EmailPreview template={sample} brand={brand} preview={preview} /> : null}
        <button type="button" className="mt-3 text-sm font-semibold" onClick={() => downloadPreview(sample || "preview", brand.display_name)}>Download PNG</button>
      </Dialog>
    </div>
  );
}

function EmailPreview({ template, brand, preview }: { template: (typeof templates)[number]["id"]; brand: Brand; preview: string }) {
  const name = brand.display_name || "Customer";
  const support = brand.support_email || "support@zetexa.com";
  return (
    <div id="emailPreviewCapture" style={{ background: "#fff", color: "#1f2937", fontFamily: "Arial, sans-serif", fontSize: 14, overflow: "hidden" }}>
      {template !== "otp" ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 16 }}>
          {preview ? <img src={preview} alt="" style={{ height: 32, maxWidth: 120, objectFit: "contain" }} /> : null}
          <img src="https://zetexa-dev-media-files.s3.ap-south-1.amazonaws.com/website-branding/esim-logo.png" alt="Powered by Zetexa" style={{ height: 28 }} />
        </div>
      ) : null}
      {template === "otp" ? (
        <div style={{ padding: 24, textAlign: "center" }}>
          <h2 style={{ color: brand.primary_color }}>OTP Verification</h2>
          <p>Dear User,</p>
          <p>You have requested a One-Time Password (OTP) for authentication. Please use the OTP below to proceed:</p>
          <div style={{ margin: "16px auto", width: 160, padding: 12, letterSpacing: 4, fontSize: 22, border: "1px solid #e5e7eb" }}>651940</div>
          <p>If you did not request this OTP, please ignore this email or contact support immediately.</p>
          <p style={{ color: brand.primary_color }}>© 2026 Zetexa Global PVT LTD. All rights reserved.</p>
        </div>
      ) : null}
      {template === "order" ? (
        <div style={{ padding: "0 16px 16px" }}>
          <p>👋 Hello {brand.display_name || "Branding"}</p>
          <p style={{ color: "#25B845" }}>Your order is successfully delivered!</p>
          <p>We hope you&apos;re doing great! Congratulations on your recent purchase of our SIM! We&apos;re glad to have you on board.</p>
          <p>Order Reference Id:<br /><strong>fhf9013-f2ef-4c17-9996-fb7b011b4cac</strong></p>
          <div style={{ background: brand.primary_color, color: "#fff", borderRadius: 12, padding: 12 }}>
            <div>Your eSIM QR code is attached.</div>
            <div>Data: <strong>500 MB</strong></div>
            <div>Validity: <strong>1</strong></div>
            <div>Plan: <strong>Poland</strong></div>
          </div>
          <div style={{ marginTop: 12, background: brand.primary_color, color: "#fff", textAlign: "center", padding: 8 }}>BORDERLESS <span style={{ color: brand.star_color }}>★</span> SIMLESS <span style={{ color: brand.star_color }}>★</span> FEARLESS</div>
          <p>Plan Poland · Validity 1 Days · Data 500 MB · ICCID 89372040161S8137914</p>
          <div style={{ background: brand.secondary_color, color: "#fff", padding: 12 }}>For support, please reach us at <strong>{brand.support_email || "None"}</strong></div>
          <p>Thank you for choosing us. Regards, <strong>{brand.display_name || "Your Brand"}</strong></p>
        </div>
      ) : null}
      {template === "paymentLink" ? (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ background: brand.primary_color, color: "#fff", textAlign: "center", padding: 12 }}><span style={{ color: brand.star_color }}>★</span> ALMOST THERE! <span style={{ color: brand.star_color }}>★</span><div>Just One Quick Step to Get Your eSIM</div></div>
          <p>Hey {name}! Pay now to receive your QR Code in your inbox. Your email Id: customer@email.com</p>
          <p>Plan Germany 1 Day Unlimited · Price USD 6.08 · Tax (18.0%) USD 1.09</p>
          <p><strong>After Discount & Taxes USD 7.17</strong></p>
          <div style={{ display: "inline-block", background: brand.primary_color, color: "#fff", padding: "8px 16px" }}>Pay Now</div>
          <p>This payment link is valid for 24hours.</p>
        </div>
      ) : null}
      {template === "ekyc" ? (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ background: brand.primary_color, color: "#fff", textAlign: "center", padding: 12 }}><span style={{ color: brand.star_color }}>★</span> ALMOST THERE! <span style={{ color: brand.star_color }}>★</span><div>Just One Quick Step to Get Your eSIM</div></div>
          <p>Hey {name}! All you need to do now is a quick eKYC. Just click the below button and follow the steps.</p>
          <div style={{ display: "inline-block", color: brand.primary_color, border: `1px solid ${brand.primary_color}`, padding: "8px 16px" }}>Complete eKYC</div>
          <div style={{ marginTop: 12, background: brand.secondary_color, color: "#fff", padding: 12 }}>Feel free to reach out to us at <strong>{support}</strong> or contact with us WhatsApp at +919441233233</div>
          <p>Thank you for choosing {brand.display_name || "Zetexa"}. Regards, <strong>{brand.display_name || "Zetexa"} Support Team</strong></p>
        </div>
      ) : null}
      {template === "ekycCompleted" ? (
        <div style={{ padding: "0 16px 16px" }}>
          <h2 style={{ color: "#25B845" }}>Your eKYC Has Been Successfully Completed!</h2>
          <p>Hey {name}! We&apos;ve received your ekYC form and we&apos;re happy to let you know that your ekYC verification is now complete.</p>
          <div style={{ background: brand.secondary_color, color: "#fff", padding: 12 }}>Feel free to reach out to us at <strong>{support}</strong> or contact with us WhatsApp at +919441233233</div>
          <p>Thank you for choosing {brand.display_name || "Zetexa"}. Regards, <strong>{brand.display_name || "Zetexa"} Team</strong></p>
        </div>
      ) : null}
    </div>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  const picker = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-2 font-medium">
        {label}
        <Tooltip content={hint}>
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs text-muted">i</span>
        </Tooltip>
      </span>
      <span className="flex items-center gap-2">
        <input type="color" value={picker} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 cursor-pointer rounded-xl border border-line bg-surface p-1" />
        <input maxLength={7} value={hex} onChange={(event) => {
          const next = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`;
          setHex(next);
          if (/^#[0-9A-Fa-f]{6}$/.test(next)) onChange(next);
        }} className="field w-28 font-mono text-xs" />
      </span>
    </div>
  );
}

async function downloadPreview(template: string, brandName: string) {
  const element = document.getElementById("emailPreviewCapture");
  if (!element) return;
  await new Promise<void>((resolve, reject) => {
    const existing = (window as unknown as { html2canvas?: unknown }).html2canvas;
    if (existing) return resolve();
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Download failed"));
    document.body.appendChild(script);
  });
  const html2canvas = (window as unknown as { html2canvas: (element: HTMLElement, options: unknown) => Promise<HTMLCanvasElement> }).html2canvas;
  const canvas = await html2canvas(element, { useCORS: true, scale: 2, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = `${template}-email-${brandName || "preview"}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
