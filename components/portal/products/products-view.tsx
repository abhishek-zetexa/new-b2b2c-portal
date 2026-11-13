"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import { usePartner } from "@/components/shell/partner-context";
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldLabel, FieldMessage } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { Switch } from "@/components/ui/switch";
import { PageLoader } from "@/components/ui/wave-loader";
import { hasPermission } from "@/lib/auth-session";
import { asRecord, portalRequest, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";
import { ancillaryImage } from "@/lib/dashboard";
import {
  catalogProducts,
  markupError,
  productImage,
  productTitle,
  staticProducts,
  type PortalProduct,
} from "@/lib/products";

export function ProductsView() {
  const partner = usePartner();
  const [products, setProducts] = useState<PortalProduct[]>(staticProducts);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<PortalProduct | null>(null);
  const [whatsapp, setWhatsapp] = useState<PortalProduct | null>(null);
  const canMarkup = hasPermission(partner.featureAccess, "ProductMarkup");
  const showAdminNote = partner.ready && !hasPermission(partner.featureAccess, "TotalRevenue");

  const load = useCallback(async () => {
    if (!partner.resellerId) {
      setProducts(staticProducts);
      setLoading(false);
      return;
    }
    try {
      const payload = await portalRequest<JsonRecord>(
        `/api/products?reseller_id=${encodeURIComponent(partner.resellerId)}`,
      );
      setProducts(catalogProducts(payload));
    } catch {
      setProducts(staticProducts);
    } finally {
      setLoading(false);
    }
  }, [partner.resellerId]);

  useEffect(() => {
    if (!partner.ready) return;
    let ignore = false;
    const timer = window.setTimeout(() => {
      if (ignore) return;
      void load();
    }, 0);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [load, partner.ready]);

  if (!partner.ready || loading) return <PageLoader />;

  return (
    <div className="mx-auto w-full max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Products</h1>
        <p className="mt-1 text-sm text-muted">
          Subscribe to a service, or update the markup on one you already sell.
        </p>
      </header>
      <section
        aria-label="Products"
        className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {products.map((product) => (
          <ProductCard
            key={product.key}
            product={product}
            canMarkup={canMarkup}
            onSettings={setSettings}
            onWhatsapp={setWhatsapp}
          />
        ))}
      </section>
      {showAdminNote ? (
        <p className="mx-auto mt-8 max-w-[480px] rounded-[10px] border border-line bg-surface px-4 py-3 text-center text-[13.5px] leading-6 text-muted">
          To subscribe to new products, please contact your <span className="font-bold text-primary">Admin</span>.
        </p>
      ) : null}
      <ProductSettingsDialog
        product={settings}
        resellerId={partner.resellerId}
        onClose={() => setSettings(null)}
        onSaved={() => {
          setSettings(null);
          void load();
        }}
      />
      <WhatsappDialog product={whatsapp} onClose={() => setWhatsapp(null)} />
    </div>
  );
}

function ProductCard({
  product,
  canMarkup,
  onSettings,
  onWhatsapp,
}: {
  product: PortalProduct;
  canMarkup: boolean;
  onSettings: (product: PortalProduct) => void;
  onWhatsapp: (product: PortalProduct) => void;
}) {
  const whatsapp = product.isWhatsappBot;
  const title = productTitle(product.displayName);
  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-surface p-4 text-center shadow-[var(--shadow)]">
      <ProductArt product={product} whatsapp={whatsapp} />
      <h2 className="mt-4 line-clamp-2 min-h-11 text-base font-semibold leading-snug text-ink" title={title}>
        {title}
      </h2>
      <div className="mt-auto pt-4">
        {whatsapp ? (
          <button type="button" onClick={() => onWhatsapp(product)} className={solidButton}>
            SUBSCRIBE
          </button>
        ) : product.editable === false ? (
          <button type="button" disabled className={lockedButton}>
            SUBSCRIBED
            <Icon name="check-circle" className="h-4 w-4" />
          </button>
        ) : product.subscribed && canMarkup ? (
          <button type="button" onClick={() => onSettings(product)} className={ghostButton}>
            SUBSCRIBED
            <Icon name="edit" className="h-3.5 w-3.5" />
          </button>
        ) : !product.subscribed && canMarkup ? (
          <button type="button" onClick={() => onSettings(product)} className={solidButton}>
            SUBSCRIBE
          </button>
        ) : null}
      </div>
    </article>
  );
}

const solidButton =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-on-primary transition hover:-translate-y-px hover:bg-primary-hover hover:shadow-[0_8px_20px_color-mix(in_srgb,var(--primary)_32%,transparent)]";

const lockedButton =
  "inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-primary/10 px-3 text-sm font-semibold text-primary";

const ghostButton =
  "inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-primary bg-transparent px-3 text-sm font-semibold text-primary transition hover:-translate-y-px hover:bg-mint";

function ProductArt({ product, whatsapp }: { product: PortalProduct; whatsapp: boolean }) {
  const fallback = product.icon || ancillaryImage(product.displayName);
  const [src, setSrc] = useState(productImage(product));
  const [wide, setWide] = useState(false);

  return (
    <div
      className={`flex h-28 items-center justify-center overflow-hidden rounded-2xl ${
        whatsapp ? "bg-[#25d366]/10" : wide ? "bg-ink/5" : "bg-soft"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onLoad={(event) => {
          const image = event.currentTarget;
          setWide(image.naturalWidth / Math.max(image.naturalHeight, 1) > 1.8);
        }}
        onError={() => {
          if (src !== fallback) setSrc(fallback);
        }}
        className={
          wide
            ? "h-full w-full object-cover"
            : whatsapp
              ? "h-16 w-16 rounded-2xl object-contain shadow-[0_10px_22px_rgba(37,211,102,0.35)]"
              : "max-h-[88px] max-w-[72%] object-contain"
        }
      />
    </div>
  );
}

function ProductSettingsDialog({
  product,
  resellerId,
  onClose,
  onSaved,
}: {
  product: PortalProduct | null;
  resellerId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => { if (!open && !saving) onClose(); }}>
      <DialogHeader>
        <DialogTitle>Product Settings</DialogTitle>
      </DialogHeader>
      {product ? (
        <ProductSettingsForm
          key={product.key}
          product={product}
          resellerId={resellerId}
          saving={saving}
          onSaving={setSaving}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function ProductSettingsForm({
  product,
  resellerId,
  saving,
  onSaving,
  onSaved,
}: {
  product: PortalProduct;
  resellerId: string;
  saving: boolean;
  onSaving: (saving: boolean) => void;
  onSaved: () => void;
}) {
  const [markup, setMarkup] = useState(product.markup);
  const [sendEmail, setSendEmail] = useState(product.sendEmail);
  const [attempted, setAttempted] = useState(false);
  const error = markupError(markup);

  async function save(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);
    if (markupError(markup)) return;
    onSaving(true);
    try {
      const result = await portalRequest<JsonRecord>("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: product.serviceName,
          reseller_id: resellerId,
          reseller_markup_percentage: Number(markup),
          send_email_to_customer: sendEmail,
        }),
      });
      if (result.success === false) throw new Error("Failed to save service settings.");
      toast.success(product.subscribed ? "Service settings updated successfully." : "Service successfully subscribed.");
      onSaved();
    } catch (err) {
      if (requestErrorMessage(err, "Failed to save service settings.")) {
        toast.error("Failed to save service settings.");
      }
    } finally {
      onSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={save}>
      <div>
        <FieldLabel htmlFor="product-markup" required>Product MarkUp Percentage</FieldLabel>
        <input
          id="product-markup"
          type="number"
          max={100}
          value={markup}
          onChange={(event) => setMarkup(event.target.value)}
          onBlur={() => setAttempted(true)}
          placeholder="Enter MarkUp for the Product"
          aria-invalid={attempted && error ? true : undefined}
          className="field mt-2"
        />
        <FieldMessage>{attempted ? error : ""}</FieldMessage>
      </div>
      <div className="mt-5">
        <Switch
          id="product-email"
          checked={sendEmail}
          onCheckedChange={setSendEmail}
          label="Send Emails to Customer?"
        />
      </div>
      <DialogFooter>
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait"
        >
          {saving ? "Assigning..." : "Assign"}
        </button>
      </DialogFooter>
    </form>
  );
}

function WhatsappDialog({ product, onClose }: { product: PortalProduct | null; onClose: () => void }) {
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    setSaving(true);
    let details: JsonRecord | null = null;
    try {
      const profile = await portalRequest<JsonRecord>("/api/profile");
      details = asRecord(profile.profile_data);
      if (!details) {
        toast.error("Unable to fetch profile details. Please try again.");
        return;
      }
    } catch (err) {
      if (requestErrorMessage(err, "Unable to fetch profile details. Please try again.")) {
        toast.error("Unable to fetch profile details. Please try again.");
      }
      return;
    } finally {
      if (!details) setSaving(false);
    }

    try {
      const result = await portalRequest<JsonRecord>("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "whatsapp",
          reseller_firstname: text(details.first_name),
          reseller_lastname: text(details.last_name),
          email: text(details.email),
          reseller_id: text(details.reseller_id),
        }),
      });
      if (result.success === false) throw new Error("Failed to submit your WhatsApp Bot request. Please try again later.");
      toast.success(
        "Your WhatsApp Bot request has been submitted successfully. Our Zetexa Support Team will review it and contact you shortly.",
      );
      onClose();
    } catch (err) {
      if (requestErrorMessage(err, "Failed to submit your WhatsApp Bot request. Please try again later.")) {
        toast.error("Failed to submit your WhatsApp Bot request. Please try again later.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => { if (!open && !saving) onClose(); }}
      className="max-w-[420px] text-center"
    >
      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product?.icon || "/products/whatsapp-bot.png"} alt="" className="h-16 w-16 object-contain" />
        <DialogHeader className="text-center">
          <DialogTitle className="text-center">WhatsApp Bot Subscription</DialogTitle>
          <DialogDescription>
            Your WhatsApp Bot request will be sent to our Zetexa Support Team (
            <a href="mailto:support@zetexa.com" className="font-semibold text-primary">
              support@zetexa.com
            </a>
            ).
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-semibold text-ink">Are you sure you want to send the request?</p>
        <p className="mt-2 text-xs italic text-muted">*Standard Terms and Conditions Applicable</p>
        <DialogFooter className="w-full sm:justify-center">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center rounded-xl border border-line bg-soft px-5 text-sm font-semibold text-ink hover:border-primary hover:text-primary"
          >
            No
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            aria-busy={saving}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait"
          >
            {saving ? "Sending..." : "Yes"}
          </button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
