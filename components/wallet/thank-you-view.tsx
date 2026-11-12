"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";
import { PageLoader } from "@/components/ui/wave-loader";

export function ThankYouView() {
  const [message, setMessage] = useState("Confirming the payment with the gateway.");
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let transaction: JsonRecord | null = null;
    try {
      const stored = sessionStorage.getItem("transactionObj");
      transaction = stored ? (JSON.parse(stored) as JsonRecord) : null;
    } catch {
      transaction = null;
    }
    const resellerId = params.get("reseller_id") || sessionStorage.getItem("reseller_id") || "";
    const transactionId = params.get("transaction_Id") || text(transaction?.request_id);
    const paymentId = sessionStorage.getItem("payment_id") || "";

    const body = transaction
      ? {
          action: "capture",
          reseller_id: resellerId,
          payment_method_id: paymentId,
          transaction_id: text(transaction.request_id),
          razorpay_order_id: text(transaction.razorpay_order_id),
          razorpay_payment_id: text(transaction.razorpay_payment_id),
          razorpay_signature: text(transaction.razorpay_signature),
        }
      : {
          action: "capture",
          reseller_id: resellerId,
          payment_method_id: paymentId,
          transaction_id: transactionId,
        };

    if (!transactionId) {
      setOk(false);
      setMessage("No payment reference was returned.");
      return;
    }

    portalRequest<JsonRecord>("/api/finance/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        setOk(res.success !== false);
        setMessage(text(res.message) || "Payment captured.");
        sessionStorage.removeItem("transactionObj");
      })
      .catch((err: Error) => {
        setOk(false);
        setMessage(err.message);
      });
  }, []);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-[var(--shadow)]">
      <h1 className="text-2xl font-semibold">Wallet recharge</h1>
      {ok === null ? <PageLoader className="min-h-24" /> : <p className={`mt-4 text-sm ${ok ? "text-ink" : "text-danger"}`}>{message}</p>}
      <Link href="/transactions" className="mt-6 inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
        Back to wallet
      </Link>
    </div>
  );
}
