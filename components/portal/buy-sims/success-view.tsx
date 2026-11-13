"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "@/components/ui/icon";
import { clearCheckout, moneyAmount } from "@/lib/buy-sims";
import { notifyCart } from "@/lib/cart-bus";
import { asList, asRecord, num, portalRequest, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";
import { fieldClass, ghostButton, primaryButton } from "@/components/portal/buy-sims/shared";

type Sim = {
  packageName: string;
  physical: boolean;
  qr: string;
  lpa: string;
  iccid: string;
  smdp: string;
  matching: string;
  data: string;
  days: string;
  quantity: number;
  unit: number;
  tax: number;
  simType: string;
};

type Addon = { name: string; passenger: string; quantity: number; unit: number; total: number; tax: number; taxRate: string };

type Docs = { aadhaar: boolean; passport: boolean; visa: boolean };

export function BuySuccessView() {
  const router = useRouter();
  const [order, setOrder] = useState<JsonRecord | null>(null);
  const [method, setMethod] = useState("");
  const [email, setEmail] = useState("");
  const [docs, setDocs] = useState<Docs | null>(null);
  const [qrCodes, setQrCodes] = useState<JsonRecord[]>([]);
  const [qrReady, setQrReady] = useState(false);
  const [slide, setSlide] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File>>({});

  useEffect(() => {
    const raw = sessionStorage.getItem("buy-sims-order");
    if (!raw) {
      router.replace("/dashboard");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as JsonRecord;
      const payload = asRecord(parsed.payload) ?? parsed;
      clearCheckout();
      const timer = window.setTimeout(() => {
        setOrder(payload);
        setMethod(text(parsed.method || payload.payment_method));
        setEmail(text(parsed.email || payload.email));
        notifyCart({ close: true, lines: [] });
      }, 0);
      return () => window.clearTimeout(timer);
    } catch {
      router.replace("/dashboard");
    }
  }, [router]);

  const orderId = text(order?.order_id);
  const status = text(order?.status);
  const needsKyc = /kyc pending/i.test(status) || /further action/i.test(status);

  useEffect(() => {
    if (!orderId || !needsKyc) return;
    portalRequest<JsonRecord>("/api/buy-sims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource: "ekyc-check", order_id: orderId }),
    }).then((payload) => {
      const documents = asRecord(payload.documents);
      setDocs({
        aadhaar: documents?.aadhaar_kyc_required === true,
        passport: documents?.passport_kyc_required === true,
        visa: documents?.packages_kyc_required === true,
      });
    }).catch(() => setDocs(null));
  }, [orderId, needsKyc]);

  useEffect(() => {
    if (!orderId || !(status === "Completed" || /further action/i.test(status))) return;
    let active = true;
    portalRequest<JsonRecord>(`/api/buy-sims?resource=qr&order_id=${encodeURIComponent(orderId)}`)
      .then((payload) => { if (active) setQrCodes(qrList(payload)); })
      .catch(() => { if (active) setQrCodes([]); })
      .finally(() => { if (active) setQrReady(true); });
    return () => { active = false; };
  }, [orderId, status]);

  if (!order) return null;

  const linkPayment = method === "payment_gateway" || text(order.orderType) === "payment_link_topup";
  const topup = text(order.orderType) === "topup";
  const paymentLink = text(order.payment_link);
  const sims = mergeQr(simsFrom(order), [...qrList(order), ...qrCodes]);
  const index = Math.min(slide, Math.max(sims.length - 1, 0));
  const current = sims[index];
  const addons = addonsFrom(order);
  const currency = text(order.currency) || "USD";
  const deliveryRequired = Boolean(order.delivery_required);
  const physical = deliveryRequired || sims.some((sim) => sim.physical);
  const showHomeOrders = status === "Completed: E-KYC Not Applicable" || status === "Requested for SIM Processing" || (status === "Completed" && !sims.length);
  const simSubtotal = sims.reduce((sum, sim) => sum + sim.unit * (sim.quantity || 1), 0);
  const simTax = sims.reduce((sum, sim) => sum + sim.tax, 0);
  const addonSubtotal = addons.reduce((sum, item) => sum + item.total, 0);
  const addonTax = addons.reduce((sum, item) => sum + item.tax, 0);

  async function downloadQr(url: string, name: string) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${name || "eSIM"}_QR_Code.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function copyLink() {
    if (!paymentLink) return;
    await navigator.clipboard.writeText(paymentLink);
    toast.success("Payment link copied");
  }

  async function copySim(sim: Sim) {
    const lines = sim.physical
      ? [`Package Name: ${sim.packageName}`, sim.iccid ? `ICCID No.: ${sim.iccid}` : ""].filter(Boolean)
      : [
        sim.lpa ? `LPA Code: ${sim.lpa}` : "",
        sim.smdp ? `SMDP Server: ${sim.smdp}` : "",
        sim.matching ? `Activation Code: ${sim.matching}` : "",
        sim.iccid ? `ICCID No.: ${sim.iccid}` : "",
      ].filter(Boolean);
    await navigator.clipboard.writeText(lines.join("\n"));
    toast.success("SIM details copied");
  }

  function chooseFile(key: string, file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      setErrors((current) => ({ ...current, [key]: "Upload a JPG, PNG, or PDF." }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((current) => ({ ...current, [key]: "File size should not exceed 5MB." }));
      return;
    }
    setFiles((current) => ({ ...current, [key]: file }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }

  async function submitKyc(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextErrors: Record<string, string> = {};
    if (docs?.aadhaar) {
      if (!text(form.get("document_type"))) nextErrors.document_type = "ID Type is required.";
      if (!text(form.get("document_id_number"))) nextErrors.document_id_number = "ID Number is required.";
      if (!files.document_image) nextErrors.document_image = "ID proof card upload is required.";
    }
    if (docs?.passport) {
      if (!text(form.get("passport_number"))) nextErrors.passport_number = "Passport number is required.";
      if (!files.passport_front) nextErrors.passport_front = "Passport 1st page is required.";
      if (!files.passport_back) nextErrors.passport_back = "Passport last page is required.";
    }
    if (docs?.visa) {
      if (!text(form.get("visa_ticket_number"))) nextErrors.visa_ticket_number = "Visa / Ticket number is required.";
      if (!files.visa_ticket_image) nextErrors.visa_ticket_image = "Visa / Ticket image is required.";
    }
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      document.getElementById(first)?.focus();
      toast.error("Please fill all required fields.");
      return;
    }
    const body = new FormData();
    body.set("resource", "ekyc");
    body.set("order_id", orderId);
    for (const [key, value] of form.entries()) if (text(value)) body.set(key, value);
    for (const [key, file] of Object.entries(files)) body.set(key, file);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", { method: "POST", body });
      toast.success(text(result.message) || "eKYC submitted");
      setSubmitted(true);
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not submit eKYC."));
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
      <section className="rounded-3xl border border-line bg-surface px-6 py-8 shadow-[var(--shadow)]">
        {linkPayment || topup ? <h1 className="text-3xl font-semibold text-ink">Thank you!</h1> : null}
        {linkPayment ? (
          <div className="mt-4 space-y-3 text-sm text-ink">
            <p>The payment link has been sent to {email || "the customer"}. Please ask the customer to complete the payment.</p>
            <p className="text-lg font-semibold">OR</p>
            <p>Copy and share this link with the customer</p>
            {paymentLink ? (
              <div className="flex flex-wrap gap-2">
                <input readOnly value={paymentLink} aria-label="Payment link" className={fieldClass} />
                <button type="button" onClick={() => void copyLink()} className={ghostButton}>Copy</button>
              </div>
            ) : null}
            <Link href="/dashboard" className={primaryButton}>Home</Link>
          </div>
        ) : null}
        {topup ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="font-semibold text-ink">Top-up processed Successfully</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard" className={primaryButton}>Home</Link>
              <Link href="/order-menu" className={ghostButton}>My Orders</Link>
            </div>
          </div>
        ) : null}
        {!linkPayment && !topup ? (
          <div className="space-y-3 text-sm text-ink">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <Icon name="check" className="h-7 w-7" />
              </span>
              <h1 className="text-2xl font-semibold">Thank you for your purchase</h1>
            </div>
            {status === "Kyc Pending" && text(order.ekyc_link) ? (
              <a href={text(order.ekyc_link)} target="_blank" rel="noreferrer" className={primaryButton}>Complete eKYC</a>
            ) : null}
            {!deliveryRequired && /further action/i.test(status) && !sims[0]?.physical ? <p>An email with the eSIM QR code has been sent to the customer. You can also share it offline.</p> : null}
            {!deliveryRequired && sims[0]?.physical ? <p className="text-center">Please handover Physical SIM to your customer.</p> : null}
            {deliveryRequired && /further action/i.test(status) ? <p>Your pSIM order is confirmed! KYC email sent to customer. Remind them to complete it or complete it on their behalf — tracking link will work after that.</p> : null}
            {/further action|kyc pending/i.test(status) ? <p>The customer must complete eKYC, OR you can complete it on their behalf using the panel on the right.</p> : null}
            {/further action|kyc pending/i.test(status) ? <p>If eKYC is not completed or incorrect details are provided, the eSIM/pSIM may be deactivated as per government norms.</p> : null}
            {status === "Completed" && !physical ? <p className="text-center">An email with QR code has been sent to the customer.</p> : null}
            {status === "Completed: E-KYC Not Applicable" || status === "Requested for SIM Processing" ? <p className="text-center">Order completed successfully. Your order details will be sent to the customer&apos;s email address.</p> : null}
            {showHomeOrders ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/dashboard" className={primaryButton}>Home</Link>
                <Link href="/order-menu" className={ghostButton}>My Orders</Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {(status === "Completed: E-KYC Not Applicable" || status === "Requested for SIM Processing") ? (
          <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
            {orderId ? <div><dt className="text-muted">Order ID</dt><dd className="font-semibold text-ink">{orderId}</dd></div> : null}
            <div><dt className="text-muted">Customer Name</dt><dd className="font-semibold text-ink">{`${text(order.firstname)} ${text(order.last_name)}`.trim() || "—"}</dd></div>
            <div><dt className="text-muted">Customer Email</dt><dd className="font-semibold text-ink">{email || "—"}</dd></div>
            <div><dt className="text-muted">Payment Method</dt><dd className="font-semibold capitalize text-ink">{method || "wallet"}</dd></div>
            <div><dt className="text-muted">Order Status</dt><dd className="font-semibold text-primary">{status}</dd></div>
            <div><dt className="text-muted">Total Amount</dt><dd className="font-semibold tabular-nums text-ink">{moneyAmount(num(order.total || order.gross_amount), currency)}</dd></div>
          </dl>
        ) : null}

        {status === "Kyc Pending" && sims.length ? <ItemTable sims={sims} currency={currency} subtotal={simSubtotal} tax={simTax} /> : null}

        {current && (status === "Completed" || /further action/i.test(status)) ? (
          <article className="mt-6 rounded-2xl border border-line p-4">
            <div className="flex items-center justify-between gap-3">
              {sims.length > 1 ? <button type="button" className={ghostButton} onClick={() => setSlide((value) => (value - 1 + sims.length) % sims.length)} aria-label="Previous SIM">Previous</button> : <span />}
              <h2 className="text-center font-semibold text-ink">{current.physical ? "pSIM Details" : "Share QR code"}</h2>
              {sims.length > 1 ? <button type="button" className={ghostButton} onClick={() => setSlide((value) => (value + 1) % sims.length)} aria-label="Next SIM">Next</button> : <span />}
            </div>
            {!current.physical ? <p className="mt-1 text-center text-sm font-semibold text-ink">{current.packageName}</p> : null}
            {!current.physical ? (
              <div className="mt-4 text-center">
                {current.qr ? (
                  <img src={qrSrc(current.qr)} alt={`QR code ${index + 1}`} className="mx-auto h-44 w-44 rounded-xl bg-white object-contain p-2" />
                ) : (
                  <p className="mx-auto max-w-sm rounded-xl bg-page px-3 py-6 text-sm text-muted">{qrReady ? "The QR code is not ready yet. Refresh this page in a moment, or use the email sent to the customer." : "Loading the QR code…"}</p>
                )}
                <p className="mt-2 text-xs text-muted">QR Code {index + 1} of {sims.length}</p>
                {current.qr ? <button type="button" className={`${ghostButton} mt-2`} onClick={() => void downloadQr(qrSrc(current.qr), current.packageName)}>Download QR Code</button> : null}
              </div>
            ) : (
              <div className="mt-4 flex justify-center text-primary"><Icon name="sim" className="h-16 w-16" /></div>
            )}
            {!current.physical ? (
              <div className="mt-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p>In case your customer faces any issue with the QR code, manual installation can be used:</p>
                  <button type="button" onClick={() => void copySim(current)} className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">Copy</button>
                </div>
                <ul className="mt-3 space-y-1 break-all">
                  {current.lpa ? <li><strong>LPA Code:</strong> {current.lpa}</li> : null}
                  {current.smdp ? <li><strong>SMDP Server:</strong> {current.smdp}</li> : null}
                  {current.matching ? <li><strong>Activation Code:</strong> {current.matching}</li> : null}
                  {current.iccid ? <li><strong>ICCID No.:</strong> {current.iccid}</li> : null}
                  {current.lpa ? (
                    <li className="pt-2">
                      <strong className="mb-2 block">1-Click Installation:</strong>
                      <span className="flex flex-wrap gap-2">
                        <a href={`https://esimsetup.android.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(current.lpa)}`} target="_blank" rel="noreferrer" className={ghostButton}>Android Setup</a>
                        <a href={`https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(current.lpa)}`} target="_blank" rel="noreferrer" className={ghostButton}>Apple Setup</a>
                      </span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <div className="mt-4 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <p><strong>Package Name - </strong>{current.packageName}</p>
                  <button type="button" onClick={() => void copySim(current)} className="font-semibold text-primary">Copy</button>
                </div>
                {current.iccid ? <p className="mt-1"><strong>ICCID No. - </strong>{current.iccid}</p> : null}
              </div>
            )}
            {status === "Completed" ? <Link href="/dashboard" className={`${primaryButton} mt-4`}>Home</Link> : null}
          </article>
        ) : null}

        {addons.length ? (
          <div className="mt-6 overflow-x-auto text-sm">
            <h2 className="font-semibold text-ink">Add-on Services</h2>
            <table className="mt-2 w-full min-w-[36rem] text-left">
              <thead className="text-xs uppercase text-muted"><tr><th>Service</th><th>Type</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Tax</th></tr></thead>
              <tbody>
                {addons.map((item) => (
                  <tr key={`${item.name}-${item.passenger}`} className="border-t border-line">
                    <td className="py-2">{item.name}</td>
                    <td>{item.passenger}</td>
                    <td className="tabular-nums">{item.quantity}</td>
                    <td className="tabular-nums">{moneyAmount(item.unit, currency)}</td>
                    <td className="tabular-nums">{moneyAmount(item.total, currency)}</td>
                    <td className="tabular-nums">{moneyAmount(item.tax, currency)}{item.taxRate ? ` (${item.taxRate}%)` : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 flex justify-between tabular-nums"><span>Order Subtotal</span><span>{moneyAmount(simSubtotal, currency)}</span></p>
            {simTax > 0 ? <p className="flex justify-between tabular-nums"><span>Order Tax</span><span>{moneyAmount(simTax, currency)}</span></p> : null}
            <p className="flex justify-between tabular-nums"><span>Addon Subtotal</span><span>{moneyAmount(addonSubtotal, currency)}</span></p>
            {addonTax > 0 ? <p className="flex justify-between tabular-nums"><span>Addon Tax</span><span>{moneyAmount(addonTax, currency)}</span></p> : null}
            <p className="flex justify-between font-semibold tabular-nums text-primary"><span>Grand Total</span><span>{moneyAmount(simSubtotal + simTax + addonSubtotal + addonTax, currency)}</span></p>
          </div>
        ) : null}
      </section>

      {needsKyc ? (
        <aside className="rounded-3xl border border-line bg-surface p-5">
          {submitted ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-ink">Your eKYC form has been successfully submitted!</h2>
              <p className="mt-2 text-sm text-muted">Please proceed to the home page to continue</p>
              <Link href="/dashboard" className={`${primaryButton} mt-4`}>Home</Link>
            </div>
          ) : (
            <form className="space-y-4 text-sm" onSubmit={(event) => void submitKyc(event)}>
              <p className="text-danger">*If eKYC is not completed or incorrect details are provided, the eSIM may be deactivated as per government norms.</p>
              {orderId ? <p>Order ID : {orderId}</p> : null}
              <h2 className="text-lg font-semibold text-ink">Complete eKYC for your customer</h2>
              {docs?.aadhaar ? (
                <div className="space-y-2">
                  <label className="font-semibold" htmlFor="document_type">*ID Proof</label>
                  <select id="document_type" name="document_type" className={fieldClass} defaultValue="">
                    <option value="">*Select ID</option>
                    <option value="AADHAAR">Aadhaar Card</option>
                    <option value="PAN_CARD">PAN Card</option>
                    <option value="DRIVING_LICENSE">Driving License</option>
                    <option value="VOTER_ID">Voter ID</option>
                  </select>
                  {errors.document_type ? <p className="text-xs text-danger">{errors.document_type}</p> : null}
                  <input id="document_id_number" name="document_id_number" placeholder="*Enter ID Number" className={fieldClass} />
                  {errors.document_id_number ? <p className="text-xs text-danger">{errors.document_id_number}</p> : null}
                  <UploadControl id="document_image" label="Upload ID proof card" file={files.document_image} error={errors.document_image} onPick={(file) => chooseFile("document_image", file)} />
                </div>
              ) : null}
              {docs?.passport ? (
                <div className="space-y-2">
                  <label className="font-semibold" htmlFor="passport_number">*Passport</label>
                  <input id="passport_number" name="passport_number" placeholder="*Enter Passport Number" className={fieldClass} />
                  {errors.passport_number ? <p className="text-xs text-danger">{errors.passport_number}</p> : null}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <UploadControl id="passport_front" label="Upload Passport 1st page" file={files.passport_front} error={errors.passport_front} onPick={(file) => chooseFile("passport_front", file)} />
                    <UploadControl id="passport_back" label="Upload Passport Last page" file={files.passport_back} error={errors.passport_back} onPick={(file) => chooseFile("passport_back", file)} />
                  </div>
                </div>
              ) : null}
              {docs?.visa ? (
                <div className="space-y-2">
                  <label className="font-semibold" htmlFor="visa_ticket_number">*Visa / Ticket</label>
                  <input id="visa_ticket_number" name="visa_ticket_number" placeholder="*Enter Visa / Ticket Number" className={fieldClass} />
                  {errors.visa_ticket_number ? <p className="text-xs text-danger">{errors.visa_ticket_number}</p> : null}
                  <UploadControl id="visa_ticket_image" label="Upload Visa / Ticket" file={files.visa_ticket_image} error={errors.visa_ticket_image} onPick={(file) => chooseFile("visa_ticket_image", file)} />
                </div>
              ) : null}
              {docs ? <button type="submit" className={primaryButton}>Submit</button> : <p className="text-muted">Checking which documents this order needs…</p>}
            </form>
          )}
        </aside>
      ) : null}
    </div>
  );
}

function ItemTable({ sims, currency, subtotal, tax }: { sims: Sim[]; currency: string; subtotal: number; tax: number }) {
  return (
    <div className="mt-6 overflow-x-auto text-sm">
      <h2 className="font-semibold text-ink">Order Items</h2>
      <table className="mt-2 w-full min-w-[36rem] text-left">
        <thead className="text-xs uppercase text-muted"><tr><th>Package</th><th>Type</th><th>Qty</th><th>Data</th><th>Validity</th><th>Unit Price</th><th>Tax</th></tr></thead>
        <tbody>
          {sims.map((sim, index) => (
            <tr key={`${sim.packageName}-${index}`} className="border-t border-line">
              <td className="py-2">{sim.packageName}</td>
              <td>{sim.simType}</td>
              <td className="tabular-nums">{sim.quantity}</td>
              <td>{sim.data ? (/\D/.test(sim.data) ? sim.data : `${sim.data} MB`) : "—"}</td>
              <td>{sim.days} Days</td>
              <td className="tabular-nums">{moneyAmount(sim.unit, currency)}</td>
              <td className="tabular-nums">{moneyAmount(sim.tax, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex justify-between tabular-nums"><span>Subtotal</span><span>{moneyAmount(subtotal, currency)}</span></p>
      {tax > 0 ? <p className="flex justify-between tabular-nums"><span>Tax</span><span>{moneyAmount(tax, currency)}</span></p> : null}
      <p className="flex justify-between font-semibold tabular-nums text-primary"><span>Grand Total</span><span>{moneyAmount(subtotal + tax, currency)}</span></p>
    </div>
  );
}

function UploadControl({ id, label, file, error, onPick }: { id: string; label: string; file?: File; error?: string; onPick: (file: File | undefined) => void }) {
  return (
    <div>
      <label htmlFor={id} className={`${ghostButton} cursor-pointer`}>↑ {label}</label>
      <input id={id} type="file" accept=".jpg,.jpeg,.png,.pdf" className="sr-only" onChange={(event) => onPick(event.target.files?.[0])} />
      {file ? <p className="mt-1 text-xs text-muted">{file.name}</p> : null}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function simsFrom(order: JsonRecord): Sim[] {
  const items = asList(order.esim_psim_items);
  const issued = asList(order.sims);
  const rows = issued.length ? issued : items;
  return rows.map((row, index) => simFrom({ ...(items[index] ?? {}), ...row, ...(asRecord(row.sim) ?? {}), ...(asRecord(row.esim) ?? {}) }));
}

function simFrom(row: JsonRecord): Sim {
  const lpa = firstText(row, ["lpa_server", "lpa_code", "lpa", "activation_code"]);
  const parts = lpa.split("$");
  return {
    packageName: firstText(row, ["package_name", "plan_name", "name"]),
    physical: row.physical_sim === true || text(row.sim_type).toUpperCase() === "PSIM",
    qr: firstText(row, ["qr_code", "qrcode", "qr_image", "qr_url", "qr"]),
    lpa,
    iccid: firstText(row, ["iccid", "iccid_number"]),
    smdp: firstText(row, ["smdpAddress", "smdp_address", "smdp"]) || parts[1] || "",
    matching: firstText(row, ["matchingID", "matching_id"]) || parts[2] || "",
    data: text(row.package_data),
    days: text(row.perioddays),
    quantity: num(row.quantity) || 1,
    unit: num(row.customer_unit_price ?? row.unit_price_usd ?? row.unit_price),
    tax: num(row.customer_tax_collected ?? row.customer_tax ?? row.tax),
    simType: text(row.sim_type || (row.physical_sim ? "PSIM" : "ESIM")),
  };
}

function mergeQr(sims: Sim[], codes: JsonRecord[]): Sim[] {
  const extras = codes.map((row) => simFrom(row));
  if (!extras.length) return sims;
  if (!sims.length) return extras;
  const used = new Set<number>();
  return sims.map((sim) => {
    const matchIndex = extras.findIndex((item, index) => !used.has(index) && (
      (sim.iccid && item.iccid === sim.iccid) || (sim.packageName && item.packageName === sim.packageName)
    ));
    const index = matchIndex >= 0 ? matchIndex : extras.findIndex((_, itemIndex) => !used.has(itemIndex));
    const match = index >= 0 ? extras[index] : undefined;
    if (!match || index < 0) return sim;
    used.add(index);
    return {
      ...sim,
      qr: sim.qr || match.qr,
      lpa: sim.lpa || match.lpa,
      smdp: sim.smdp || match.smdp,
      matching: sim.matching || match.matching,
      iccid: sim.iccid || match.iccid,
      packageName: sim.packageName || match.packageName,
    };
  });
}

function qrList(payload: JsonRecord): JsonRecord[] {
  const direct = asList(payload.qr_codes);
  if (direct.length) return direct;
  const data = asRecord(payload.data);
  return data ? asList(data.qr_codes) : [];
}

function firstText(row: JsonRecord, keys: string[]) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return "";
}

function qrSrc(value: string) {
  if (!value || value.startsWith("data:") || value.startsWith("http") || value.startsWith("/")) return value;
  return `data:image/png;base64,${value}`;
}

function addonsFrom(order: JsonRecord): Addon[] {
  if (order.has_addon_items !== true) return [];
  return asList(order.addon_items_summary).map((row) => ({
    name: text(row.service_name),
    passenger: text(row.passenger_type),
    quantity: num(row.quantity) || 1,
    unit: num(row.customer_unit_price ?? row.unit_price),
    total: num(row.customer_total_price) || num(row.customer_unit_price) * (num(row.quantity) || 1),
    tax: num(row.customer_applied_tax ?? row.item_tax),
    taxRate: text(row.applied_tax_percentage),
  }));
}
