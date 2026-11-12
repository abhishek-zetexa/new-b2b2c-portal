"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { FiCheckCircle, FiDownload, FiFileText, FiLink, FiLock, FiUpload, FiUser, FiX } from "react-icons/fi";
import { usePartner } from "@/components/shell/partner-context";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TextField } from "@/components/ui/form-field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-toastify";
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
  const [downloading, setDownloading] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

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

  async function download() {
    setDownloading(true);
    try {
      await downloadPreview(sample || "preview", brand.display_name);
    } catch {
      toast.error("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Branding & Preference</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Logo and colors used on customer email.</p>
      </div>
      <Tabs value="email" onValueChange={() => undefined}>
        <TabsList>
          <TabsTrigger value="email">Email</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <form onSubmit={save} className="min-w-0 space-y-5 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-ink">Brand settings</h2>
          <p className="mt-1 text-sm text-muted">These values appear on every customer email.</p>
        </div>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-ink">
            Logo <span className="text-primary">*</span>
            <Tooltip content="40 x 120 px recommended for Email templates. Supported formats: PNG, JPG, SVG. Max 500 KB.">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-line text-xs text-muted">i</span>
            </Tooltip>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {preview ? (
              <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-page">
                <img src={sameOriginImage(preview)} alt="" className="h-full w-full object-contain" />
                <button type="button" aria-label="Remove logo" onClick={() => { setLogo(null); setPreview(""); setFileName(""); if (logoInput.current) logoInput.current.value = ""; }} className="absolute top-1 right-1 grid h-5 w-5 cursor-pointer place-items-center rounded-full bg-ink/70 text-white">
                  <FiX className="h-3 w-3" />
                </button>
              </span>
            ) : null}
            <button type="button" onClick={() => logoInput.current?.click()} className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">
              <FiUpload className="h-4 w-4" /> Upload logo
            </button>
            {fileName ? <span className="max-w-full text-xs break-all text-muted">{fileName}</span> : null}
            <input ref={logoInput} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
          </div>
        </div>
        <TextField id="display-name" label="Display Name" required value={brand.display_name} onChange={(value) => setBrand({ ...brand, display_name: value })} />
        <TextField id="support-email" label="Support Email" value={brand.support_email} onChange={(value) => setBrand({ ...brand, support_email: value })} />
        <div className="border-t border-line pt-5">
          <p className="mb-4 text-xs text-muted">Optional fields will use system defaults if not set.</p>
          <div className="space-y-4">
            <ColorField label="Primary Color" hint="Used for headers, buttons and key highlights in the email template." value={brand.primary_color} onChange={(value) => setBrand({ ...brand, primary_color: value })} />
            <ColorField label="Secondary Color" hint="Used for support card background in the email template." value={brand.secondary_color} onChange={(value) => setBrand({ ...brand, secondary_color: value })} />
            <ColorField label="Star Color" hint="Used for the star symbol." value={brand.star_color} onChange={(value) => setBrand({ ...brand, star_color: value })} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setLogo(null); setPreview(""); setFileName(""); if (logoInput.current) logoInput.current.value = ""; setBrand({ ...defaults, display_name: "", support_email: "", logo_url: "" }); }} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">Reset</button>
          <button disabled={saving} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50">{saving ? "Saving..." : "Save"}</button>
        </div>
      </form>
      <aside className="min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Sample templates</h2>
        <p className="mt-1 text-sm text-muted">Preview how your logo and colors look on each email.</p>
        <div className="mt-4 space-y-3">
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => setSample(template.id)} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-line bg-page p-3 text-left transition hover:border-primary">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-mint text-primary"><TemplateIcon id={template.id} /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{template.label}</span>
                <span className="mt-0.5 block text-sm leading-5 text-muted">{template.description}</span>
              </span>
              <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-primary">Preview</span>
            </button>
          ))}
        </div>
      </aside>
      </div>
      <Dialog open={Boolean(sample)} onOpenChange={() => setSample("")} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{templates.find((item) => item.id === sample)?.label} Preview</DialogTitle>
        </DialogHeader>
        <div className="mb-4 flex flex-wrap gap-2">
          {templates.map((template) => (
            <button key={template.id} type="button" onClick={() => setSample(template.id)} className={`inline-flex h-8 cursor-pointer items-center rounded-full px-3 text-xs font-semibold ${sample === template.id ? "bg-mint text-primary" : "border border-line bg-page text-muted hover:border-primary/45 hover:text-primary"}`}>{template.label}</button>
          ))}
        </div>
        <div className="rounded-2xl bg-page p-3 sm:p-4">
          {sample ? <EmailPreview template={sample} brand={brand} preview={preview} /> : null}
        </div>
        <button type="button" disabled={downloading} onClick={download} className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50">
          <FiDownload className="h-4 w-4" />{downloading ? "Downloading..." : "Download PNG"}
        </button>
      </Dialog>
    </div>
  );
}

function TemplateIcon({ id }: { id: (typeof templates)[number]["id"] }) {
  const className = "h-4 w-4";
  if (id === "otp") return <FiLock className={className} />;
  if (id === "order") return <FiFileText className={className} />;
  if (id === "paymentLink") return <FiLink className={className} />;
  if (id === "ekyc") return <FiUser className={className} />;
  return <FiCheckCircle className={className} />;
}

const zetexaLogo = "https://zetexa-dev-media-files.s3.ap-south-1.amazonaws.com/website-branding/esim-logo.png";

function sameOriginImage(url: string) {
  if (!url || url.startsWith("blob:") || url.startsWith("data:") || url.startsWith("/")) return url;
  return `/api/branding/image?url=${encodeURIComponent(url)}`;
}

function EmailPreview({ template, brand, preview }: { template: (typeof templates)[number]["id"]; brand: Brand; preview: string }) {
  const name = brand.display_name || "Customer";
  const support = brand.support_email || "support@zetexa.com";
  return (
    <div id="emailPreviewCapture" style={{ maxWidth: 560, margin: "0 auto", background: "#fff", color: "#423C3C", fontFamily: "Arial, sans-serif", fontSize: 13, overflow: "hidden", borderRadius: 8 }}>
      {template !== "otp" ? <LogoRow preview={preview} /> : null}
      {template === "otp" ? <OtpPreview color={brand.primary_color} /> : null}
      {template === "order" ? <OrderPreview brand={brand} preview={preview} /> : null}
      {template === "paymentLink" ? <PaymentPreview brand={brand} name={name} /> : null}
      {template === "ekyc" ? <EkycPreview brand={brand} name={name} support={support} /> : null}
      {template === "ekycCompleted" ? <EkycDonePreview brand={brand} name={name} support={support} /> : null}
    </div>
  );
}

function LogoRow({ preview }: { preview: string }) {
  return (
    <div style={{ padding: "18px 20px 10px", textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {preview ? <img src={sameOriginImage(preview)} alt="" style={{ height: 40, width: "auto", maxWidth: 120, objectFit: "contain" }} /> : null}
        <img src={sameOriginImage(zetexaLogo)} alt="Powered by Zetexa" style={{ height: 40, width: 120, objectFit: "contain" }} />
      </div>
    </div>
  );
}

function Banner({ brand }: { brand: Brand }) {
  return (
    <div style={{ marginTop: 18, padding: "10px 12px", background: brand.primary_color, color: "#fff", textAlign: "center", lineHeight: 1.45 }}>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}><span style={{ color: brand.star_color }}>★</span> ALMOST THERE! <span style={{ color: brand.star_color }}>★</span></div>
      <div style={{ marginTop: 2, fontSize: 13, fontWeight: 600 }}>Just One Quick Step to Get Your eSIM</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "6px 0", borderBottom: "1px solid #E9E6E6", fontSize: 12 }}>
      <span>{label}</span>
      <span style={{ color: "#000", textAlign: "right" }}>{value}</span>
    </div>
  );
}

function SupportCard({ color, children }: { color: string; children: ReactNode }) {
  return <div style={{ margin: "16px 20px 0", padding: "14px 16px", borderRadius: 12, background: color, color: "#fff", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>{children}</div>;
}

function OtpPreview({ color }: { color: string }) {
  return (
    <div style={{ padding: "28px 24px", textAlign: "center" }}>
      <h2 style={{ margin: "0 0 12px", color, fontSize: 22 }}>OTP Verification</h2>
      <p style={{ margin: "8px 0" }}>Dear User,</p>
      <p style={{ margin: "8px 0", lineHeight: 1.6 }}>You have requested a One-Time Password (OTP) for authentication. Please use the OTP below to proceed:</p>
      <div style={{ margin: "18px auto", width: 180, padding: "14px 12px", letterSpacing: 4, fontSize: 22, fontWeight: 700, border: "1px solid #e5e7eb", borderRadius: 6 }}>651940</div>
      <p style={{ margin: "8px 0", lineHeight: 1.6 }}>If you did not request this OTP, please ignore this email or contact support immediately.</p>
      <p style={{ margin: "16px 0 0", color, fontSize: 12 }}>© 2026 Zetexa Global PVT LTD. All rights reserved.</p>
    </div>
  );
}

function OrderPreview({ brand, preview }: { brand: Brand; preview: string }) {
  return (
    <div>
      <p style={{ margin: "16px 0 0", textAlign: "center" }}>👋 Hello {brand.display_name || "Branding"}</p>
      <p style={{ margin: "8px 20px 0", color: "#25B845", fontWeight: 700, fontStyle: "italic", textAlign: "center", fontSize: 12 }}>Your order is successfully delivered!</p>
      <p style={{ margin: "10px 22px", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>We hope you&apos;re doing great! Congratulations on your recent purchase of our SIM! We&apos;re glad to have you on board.</p>
      <p style={{ margin: "0 22px", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>Order Reference Id:<br /><strong>fhf9013-f2ef-4c17-9996-fb7b011b4cac</strong></p>
      <div style={{ margin: "14px 20px 0", borderRadius: 12, background: brand.primary_color, color: "#fff", padding: "14px 16px", fontSize: 13, lineHeight: 1.7 }}>
        <div>Your eSIM QR code is attached.</div>
        <div>Data: <strong>500 MB</strong></div>
        <div>Validity: <strong>1</strong></div>
        <div>Plan: <strong>Poland</strong></div>
      </div>
      <p style={{ margin: "16px 0 6px", textAlign: "center", fontSize: 12 }}>Order Fulfilled By:</p>
      <LogoRow preview={preview} />
      <div style={{ marginTop: 8, background: brand.primary_color, color: "#fff", textAlign: "center", padding: "10px 8px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }}>BORDERLESS <span style={{ color: brand.star_color }}>★</span> SIMLESS <span style={{ color: brand.star_color }}>★</span> FEARLESS</div>
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ background: "#F9FAFE", borderRadius: 5, padding: "16px 12px 8px" }}>
          <h2 style={{ margin: "0 0 10px 8px", fontSize: 16, fontWeight: 400, color: "#000" }}>Order Details</h2>
          <div style={{ padding: "0 8px" }}>
            <DetailRow label="Plan" value="Poland" />
            <DetailRow label="Validity" value="1 Days" />
            <DetailRow label="Data" value="500 MB" />
            <DetailRow label="ICCID" value="89372040161S8137914" />
            <DetailRow label="SMDP+ server" value="smdp.io" />
          </div>
          <div style={{ margin: "8px 0", borderBottom: `2px solid ${brand.secondary_color}` }} />
        </div>
      </div>
      <div style={{ margin: "16px 0", textAlign: "center" }}><span style={{ display: "inline-block", background: brand.primary_color, color: "#fff", borderRadius: 6, padding: "12px 28px", fontWeight: 500 }}>Installation Guide</span></div>
      <SupportCard color={brand.secondary_color}>For support, please reach us at <strong>{brand.support_email || "None"}</strong></SupportCard>
      <p style={{ margin: "16px 20px 18px", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>Thank you for choosing us.<br />Regards,<br /><strong>{brand.display_name || "Your Brand"}</strong></p>
    </div>
  );
}

function PaymentPreview({ brand, name }: { brand: Brand; name: string }) {
  return (
    <div>
      <Banner brand={brand} />
      <div style={{ padding: "16px 28px 0", color: "#9a9090", fontSize: 12, lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 10px", color: "#000", fontSize: 14 }}>Hey {name}!</p>
        <p style={{ margin: "2px 0" }}>Woohoo!</p>
        <p style={{ margin: "2px 0" }}>Thanks for choosing us — you&apos;re one step away from staying connected with your shiny new eSIM!</p>
        <p style={{ margin: "14px 0 2px" }}>Pay now to receive your QR Code in your inbox</p>
        <p style={{ margin: "12px 0 0", color: "#000", fontWeight: 700 }}>Your email Id: customer@email.com</p>
      </div>
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ background: "#F9FAFE", borderRadius: 5, padding: "16px 12px 8px" }}>
          <h2 style={{ margin: "0 0 10px 8px", fontSize: 16, fontWeight: 400, color: "#000" }}>Order Details</h2>
          <div style={{ padding: "0 8px" }}>
            <DetailRow label="Plan" value="Germany 1 Day Unlimited" />
            <DetailRow label="Validity" value="1 Days" />
            <DetailRow label="Data — Unlimited" value="Region — Germany" />
            <DetailRow label="Price" value="USD 6.08" />
            <DetailRow label="eSIM Subtotal" value="USD 6.08" />
            <DetailRow label="Tax (18.0%)" value="USD 1.09" />
            <DetailRow label="Payment Details" value="Total Amount" />
          </div>
          <div style={{ margin: "8px 0", borderBottom: `2px solid ${brand.secondary_color}` }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "0 20px", padding: "8px 10px", color: "#9a9090", fontSize: 12 }}>
        <span>After Discount & Taxes</span>
        <strong style={{ color: "#000", fontSize: 18 }}>USD 7.17</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", margin: "0 28px 8px", paddingTop: 8, borderTop: `2px solid ${brand.secondary_color}`, color: "#9a9090", fontSize: 12 }}>
        <span>Mode of Payment</span>
        <span>payment_gateway</span>
      </div>
      <div style={{ margin: "16px 0 8px", textAlign: "center" }}><span style={{ display: "inline-block", background: brand.primary_color, color: "#fff", borderRadius: 6, padding: "12px 28px", fontWeight: 500 }}>Pay Now</span></div>
      <p style={{ margin: "0 20px 8px", textAlign: "center", fontSize: 12, color: "#9a9090" }}>This payment link is valid for 24hours.</p>
      <p style={{ margin: "8px 20px 18px", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>Thank you for choosing {brand.display_name || "Travel eSIM"}.<br />We hope you enjoy the uninterrupted and fastest data connectivity.</p>
    </div>
  );
}

function EkycPreview({ brand, name, support }: { brand: Brand; name: string; support: string }) {
  return (
    <div>
      <Banner brand={brand} />
      <div style={{ padding: "16px 28px 0", color: "#9a9090", fontSize: 12, lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 10px", color: "#000", fontSize: 14 }}>Hey {name}!</p>
        <p style={{ margin: "2px 0" }}>Woohoo!</p>
        <p style={{ margin: "2px 0" }}>Thanks for choosing us—you&apos;re one step away from staying connected with your shiny new eSIM!</p>
        <p style={{ margin: "14px 0 2px" }}>All you need to do now is a <strong style={{ color: "#000" }}>quick eKYC (it&apos;s super easy, promise!).</strong> Just click the below button and follow the steps.</p>
      </div>
      <div style={{ margin: "16px 0", textAlign: "center" }}><span style={{ display: "inline-block", width: "75%", background: "#000", color: brand.primary_color, borderRadius: 6, padding: "12px 16px", fontWeight: 500 }}>Complete eKYC</span></div>
      <p style={{ margin: "0 20px 12px", textAlign: "center", color: "#9a9090", fontSize: 12, lineHeight: 1.5 }}>Stuck? Confused? Or just want to say hi?<br />We&apos;re all ears—hit us up anytime:</p>
      <SupportCard color={brand.secondary_color}>Feel free to reach out to us at <strong>{support}</strong> or contact with us WhatsApp at +919441233233</SupportCard>
      <p style={{ margin: "16px 20px 18px", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>Thank you for choosing {brand.display_name || "Zetexa"}.<br />Regards,<br /><strong>{brand.display_name || "Zetexa"} Support Team</strong></p>
    </div>
  );
}

function EkycDonePreview({ brand, name, support }: { brand: Brand; name: string; support: string }) {
  return (
    <div>
      <div style={{ padding: "18px 24px 0", textAlign: "center" }}>
        <div style={{ width: 42, height: 42, margin: "0 auto 10px", border: "2px solid #25B845", borderRadius: "50%", color: "#25B845", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700 }}>✓</div>
        <h2 style={{ margin: 0, fontSize: 16, color: "#111" }}>Your eKYC Has Been Successfully Completed!</h2>
      </div>
      <div style={{ padding: "16px 28px 0", color: "#9a9090", fontSize: 12, lineHeight: 1.6 }}>
        <p style={{ margin: "0 0 10px", color: "#000", fontSize: 14 }}>Hey {name}!</p>
        <p style={{ margin: "2px 0" }}>We&apos;ve received your ekYC form and we&apos;re happy to let you know that your ekYC verification is now complete.</p>
        <p style={{ margin: "2px 0" }}>You&apos;re all set to explore, activate, and enjoy our exclusive benefits!</p>
      </div>
      <SupportCard color={brand.secondary_color}>Feel free to reach out to us at <strong>{support}</strong> or contact with us WhatsApp at +919441233233</SupportCard>
      <p style={{ margin: "16px 20px 18px", textAlign: "center", fontSize: 12, lineHeight: 1.6 }}>Thank you for choosing {brand.display_name || "Zetexa"}.<br />Regards,<br /><strong>{brand.display_name || "Zetexa"} Team</strong></p>
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
        }} className="field font-mono text-xs" style={{ width: "7.5rem" }} />
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
