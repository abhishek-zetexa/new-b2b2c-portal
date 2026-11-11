"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { asList, asRecord, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

type Keys = { stripePublishableKey: string; razorpayKey: string };

export function PaymentPanel({
  methodName,
  methodId,
  embedded = false,
  initialAmount,
  currency,
  bankMethods = [],
  onBack,
}: {
  methodName: string;
  methodId: string;
  embedded?: boolean;
  initialAmount?: number;
  currency: "INR" | "USD";
  bankMethods?: JsonRecord[];
  onBack: () => void;
}) {
  const name = methodName.toUpperCase();
  const kind = name === "STRIPE" ? "stripe" : name === "RAZORPAY" ? "razorpay" : name === "UPI" ? "upi" : name === "BANK_TRANSFER" ? "bank" : "unknown";

  useEffect(() => {
    localStorage.setItem("payment_id", methodId);
  }, [methodId]);

  if (kind === "unknown") {
    return (
      <section className="rounded-3xl border border-line bg-surface p-6">
        <p className="text-sm">This payment method is not available.</p>
        <button type="button" onClick={onBack} className="mt-4 text-sm font-semibold text-primary">Back</button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
      <button type="button" onClick={onBack} className="text-sm font-semibold text-primary">Back</button>
      {kind === "stripe" ? <StripeForm embedded={embedded} initialAmount={initialAmount} methodId={methodId} bankMethods={bankMethods} /> : null}
      {kind === "razorpay" ? <RazorpayForm embedded={embedded} initialAmount={initialAmount} methodId={methodId} /> : null}
      {kind === "upi" ? <UpiForm embedded={embedded} methodId={methodId} /> : null}
      {kind === "bank" ? <BankForm embedded={embedded} methodId={methodId} currency={currency} /> : null}
    </section>
  );
}

function StripeForm({ embedded, initialAmount, methodId, bankMethods }: { embedded: boolean; initialAmount?: number; methodId: string; bankMethods: JsonRecord[] }) {
  const minimum = embedded ? 1000 : 100;
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [meta, setMeta] = useState({ resellerId: "", requestId: "" });

  async function proceed() {
    if (!/^\d{1,8}$/.test(amount) || Number(amount) < minimum) return;
    setBusy(true);
    try {
      const online = await portalRequest<JsonRecord>("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "online", amount: Number(amount), currency: "USD", payment_method_id: methodId }),
      });
      const clientSecret = text(asRecord(online.data)?.client_secret);
      if (!online.success && !clientSecret) throw new Error(text(online.message) || "Payment request was not successful.");
      if (!clientSecret) throw new Error("Client secret is missing from the response.");
      setMeta({ resellerId: text(online.reseller_id), requestId: text(online.request_id) });
      setSecret(clientSecret);
      localStorage.setItem("reseller_id", text(online.reseller_id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Card payment could not be started.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <h2 className="text-xl font-semibold">Stripe</h2>
      <label className="block text-sm">
        Amount in USD
        <input value={amount} inputMode="numeric" maxLength={8} onChange={(event) => setAmount(event.target.value.replace(/\D/g, "").slice(0, 8))} className="field mt-2" />
      </label>
      {amount && Number(amount) < minimum ? (
        <p className="text-sm text-danger">{embedded ? "Minimum top-up is $1,000. You can enter a higher amount." : "You must recharge at least $100 to proceed."}</p>
      ) : null}
      <p className="text-xs leading-5 text-muted">US cards 2.9% + $0.30; non-US cards 7.2%; both adjusted from wallet balance.</p>
      <p className="text-sm"><span className="text-danger">Note:</span> Your payment will be verified by our accountant and reflected in your wallet within 6 business hours.</p>
      {bankMethods[0] ? (
        <p className="text-sm">
          To Avoid additional charges use Bank Transfer:{" "}
          <a className="font-semibold text-primary" href={`/transactions/payment/${text(bankMethods[0].fe_name)}/${text(bankMethods[0].id)}`}>
            {text(bankMethods[0].name)}
          </a>
        </p>
      ) : null}
      <button type="button" disabled={busy || !/^\d{1,8}$/.test(amount) || Number(amount) < minimum} onClick={proceed} className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">
        Proceed to Payment
      </button>
      {secret ? <StripeElement secret={secret} resellerId={meta.resellerId} requestId={meta.requestId} /> : null}
    </div>
  );
}

function StripeElement({ secret, resellerId, requestId }: { secret: string; resellerId: string; requestId: string }) {
  const [stripe, setStripe] = useState<{ confirmPayment: (options: unknown) => Promise<{ error?: { message?: string } }> } | null>(null);
  const [elements, setElements] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      await loadScript("https://js.stripe.com/v3/");
      const keys = await portalRequest<Keys>("/api/finance/keys");
      const factory = (window as unknown as { Stripe?: (key: string) => { elements: (options: unknown) => { create: (type: string, options: unknown) => { mount: (target: string) => void } }; confirmPayment: (options: unknown) => Promise<{ error?: { message?: string } }> } }).Stripe;
      if (!active || !factory || !keys.stripePublishableKey) return;
      const next = factory(keys.stripePublishableKey);
      const els = next.elements({ clientSecret: secret });
      els.create("payment", { layout: "tabs" }).mount("#payment-element");
      setStripe(next);
      setElements(els);
    })().catch((err: Error) => toast.error(err.message));
    return () => {
      active = false;
    };
  }, [secret]);

  return (
    <div>
      <div id="payment-element" className="mt-3 rounded-2xl border border-line p-3" />
      <button
        type="button"
        id="submit-button"
        className="mt-3 h-10 rounded-2xl bg-navy px-4 text-sm font-semibold text-white"
        onClick={async () => {
          if (!stripe) return;
          const result = await stripe.confirmPayment({
            elements,
            confirmParams: {
              return_url: `${window.location.origin}/transactions/payment/thank-you?reseller_id=${encodeURIComponent(resellerId)}&transaction_Id=${encodeURIComponent(requestId)}`,
            },
          });
          if (result.error) toast.error(result.error.message || "Payment failed.");
        }}
      >
        Pay
      </button>
    </div>
  );
}

function RazorpayForm({ embedded, initialAmount, methodId }: { embedded: boolean; initialAmount?: number; methodId: string }) {
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : "");
  const [quote, setQuote] = useState<JsonRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const minimum = embedded ? 25000 : 0;
  const valid = /^\d{1,8}$/.test(amount) && Number(amount) >= (minimum || 1);

  async function brief() {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await portalRequest<JsonRecord>("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "brief", amount: Number(amount), currency: "INR", payment_method_id: methodId }),
      });
      if (res.success === false) throw new Error(text(res.message));
      setQuote(asRecord(res.data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Amount brief failed.");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    setBusy(true);
    try {
      const res = await portalRequest<JsonRecord>("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "online", amount: Number(amount), currency: "INR", payment_method_id: methodId }),
      });
      if (res.success === false) throw new Error(text(res.message) || "Payment request was not successful.");
      localStorage.setItem("reseller_id", text(res.reseller_id));
      const data = asRecord(res.data);
      const orderId = text(data?.id);
      if (!orderId) throw new Error(text(res.message) || "Payment order was not created.");
      await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      const keys = await portalRequest<Keys>("/api/finance/keys");
      const Razorpay = (window as unknown as { Razorpay?: new (options: unknown) => { open: () => void } }).Razorpay;
      if (!Razorpay) throw new Error("Razorpay checkout did not load.");
      const requestId = text(res.request_id);
      const checkout = new Razorpay({
        key: keys.razorpayKey,
        amount: Number(amount),
        currency: "INR",
        name: "Zetexa Global",
        description: "eSIM Purchase",
        image: "https://zetexa-dev-media-files.s3.ap-south-1.amazonaws.com/zetexa-portal-media/zetexa-web-media/fav.png",
        order_id: orderId,
        theme: { color: "#5934A4" },
        handler: (response: JsonRecord) => {
          localStorage.setItem("transactionObj", JSON.stringify({ request_id: requestId, ...response }));
          window.location.assign("/transactions/payment/thank-you");
        },
      });
      checkout.open();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please refresh and try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-4">
      <h2 className="text-xl font-semibold">Razorpay</h2>
      <label className="block text-sm">
        Enter Amount in INR*
        <input value={amount} inputMode="numeric" onChange={(event) => setAmount(event.target.value.replace(/\D/g, "").slice(0, 8))} className="field mt-2" />
      </label>
      {embedded && amount && Number(amount) < 25000 ? <p className="text-sm text-danger">Minimum top-up is ₹25,000.</p> : null}
      <button type="button" disabled={!valid || busy} onClick={brief} className="h-10 rounded-2xl border border-line px-4 text-sm font-semibold disabled:opacity-50">Get Amount Brief</button>
      {quote ? (
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>Amount: {text(quote.amount)}</div>
          <div>Currency: {text(quote.currency)}</div>
          <div>Conversion rate: {text(quote.conversion_rate)}</div>
          <div>Fee amount: {text(quote.pgc_amount)}</div>
          <div>Fee percent: {text(quote.pgc_percentage)} %</div>
          <div>Amount to be credited to the wallet: {text(quote.recharge_amount)}</div>
        </dl>
      ) : null}
      <p className="text-xs leading-5 text-muted">Domestic cards, UPI, netbanking, and wallets typically 2% + GST. International cards up to 3% + GST. Final charges vary.</p>
      <p className="text-sm"><span className="text-danger">Note:</span> Your payment will be verified by our accountant and reflected in your wallet within 6 business hours.</p>
      <button type="button" disabled={!quote || busy} onClick={pay} className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Submit</button>
    </div>
  );
}

function UpiForm({ embedded, methodId }: { embedded: boolean; methodId: string }) {
  const router = useRouter();
  const [details, setDetails] = useState<JsonRecord | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ amount: "", transactionId: "", transactionDate: "", upiId: "" });

  useEffect(() => {
    portalRequest<JsonRecord>("/api/finance/payments?resource=upi")
      .then((res) => setDetails(asList(res.data)[0] || null))
      .catch(() => setError("UPI details could not be loaded."));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || (embedded && amount < 25000)) return;
    try {
      const res = await portalRequest<JsonRecord>("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "INR",
          transaction_id: form.transactionId,
          transaction_date: form.transactionDate,
          upi_id: form.upiId,
          payment_method_id: methodId,
        }),
      });
      if (res.success === false) throw new Error("Error while submitting UPI Details");
      toast.success("Wallet recharge request created");
      router.push("/transactions/payment/thank-you");
    } catch {
      toast.error("Error while submitting UPI Details");
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <h2 className="text-xl font-semibold">Payment done. Just fill out this form to verify!</h2>
      <p className="text-sm text-muted">Wallet credit is applied 24–48 hours after form submission.</p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {text(details?.upi_qr_url) ? <img src={text(details?.upi_qr_url)} alt="UPI QR" className="h-40 w-40" /> : null}
      {text(details?.upi_id || details?.upi) ? <p className="text-sm">UPI ID: {text(details?.upi_id || details?.upi)}</p> : null}
      <input required inputMode="decimal" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="field" />
      {embedded && form.amount && Number(form.amount) < 25000 ? <p className="text-sm text-danger">Minimum top-up is ₹25,000.</p> : null}
      <input required placeholder="UPI Reference Number" value={form.transactionId} onChange={(event) => setForm({ ...form, transactionId: event.target.value })} className="field" />
      <input required type="date" readOnly value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} onClick={(event) => (event.currentTarget.readOnly = false)} className="field" />
      <input required placeholder="Payer UPI ID" value={form.upiId} onChange={(event) => setForm({ ...form, upiId: event.target.value })} className="field" />
      <button className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Submit</button>
    </form>
  );
}

function BankForm({ embedded, methodId, currency }: { embedded: boolean; methodId: string; currency: "INR" | "USD" }) {
  const router = useRouter();
  const [account, setAccount] = useState<JsonRecord | null>(null);
  const [form, setForm] = useState({
    amount: "",
    transactionId: "",
    transactionDate: "",
    bankAccount: "",
    bankName: "",
    bankIfsc: "",
    bankType: "",
    currency,
  });

  useEffect(() => {
    portalRequest<JsonRecord>("/api/finance/payments?resource=bank")
      .then((res) => setAccount(asList(res.data)[0] || null))
      .catch(() => toast.error("Bank details could not be loaded."));
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    const minimum = form.currency === "INR" ? 25000 : 1000;
    if (embedded && amount < minimum) return;
    try {
      const res = await portalRequest<JsonRecord>("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: form.currency,
          transaction_id: form.transactionId,
          transaction_date: form.transactionDate,
          bank_account_number: form.bankAccount,
          bank_name: form.bankName,
          bank_ifsc: form.bankIfsc,
          bank_transaction_type: form.bankType,
          payment_method_id: methodId,
        }),
      });
      if (res.success === false) throw new Error("Error while submitting Bank Details");
      toast.success("Wallet recharge request created");
      router.push("/transactions/payment/thank-you");
    } catch {
      toast.error("Error while submitting Bank Details");
    }
  }

  const fields = ["name", "bank_name", "branch", "currency", "ifsc", "account_number", "swift", "region_or_country"] as const;

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <h2 className="text-xl font-semibold">Payment done. Just fill out this form to verify!</h2>
      <p className="text-sm text-muted">Wallet credit is applied 24–48 hours after form submission.</p>
      {account ? (
        <dl className="grid gap-1 text-sm">
          {fields.map((key) => (
            <div key={key}><span className="text-muted">{key.replaceAll("_", " ")}: </span>{text(account[key]) || "—"}</div>
          ))}
        </dl>
      ) : null}
      <input required inputMode="decimal" placeholder="Amount" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="field" />
      <input required placeholder="Transaction number" value={form.transactionId} onChange={(event) => setForm({ ...form, transactionId: event.target.value })} className="field" />
      <input required type="date" value={form.transactionDate} onChange={(event) => setForm({ ...form, transactionDate: event.target.value })} className="field" />
      <input required placeholder="Bank account number" value={form.bankAccount} onChange={(event) => setForm({ ...form, bankAccount: event.target.value })} className="field" />
      <input required placeholder="Bank name" value={form.bankName} onChange={(event) => setForm({ ...form, bankName: event.target.value })} className="field" />
      <input required placeholder="Bank IFSC/Swift" value={form.bankIfsc} onChange={(event) => setForm({ ...form, bankIfsc: event.target.value })} className="field" />
      <input required placeholder="Bank transaction type" value={form.bankType} onChange={(event) => setForm({ ...form, bankType: event.target.value })} className="field" />
      <select required value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as "INR" | "USD" })} className="field">
        <option value="INR">INR</option>
        <option value="USD">USD</option>
      </select>
      <button className="h-10 rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Submit</button>
    </form>
  );
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Payment script failed to load."));
    document.body.appendChild(script);
  });
}
