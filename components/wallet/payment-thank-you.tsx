"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";
import { PageLoader } from "@/components/ui/wave-loader";

const captureRequests = new Map<string, Promise<JsonRecord>>();

function capturePayment(key: string, body: JsonRecord) {
  const current = captureRequests.get(key);
  if (current) return current;
  const pending = portalRequest<JsonRecord>("/api/finance/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  captureRequests.set(key, pending);
  return pending;
}

function alreadyCaptured(value: unknown) {
  return /already captured/i.test(text(value));
}

export function PaymentThankYou() {
  const [state, setState] = useState<"loading" | "stripe-ok" | "stripe-fail" | "razorpay" | "manual">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resellerId = params.get("reseller_id") || localStorage.getItem("reseller_id") || "";
    const transactionId = params.get("transaction_Id");
    const stored = localStorage.getItem("transactionObj");
    const paymentId = localStorage.getItem("payment_id") || "";

    if (resellerId && transactionId) {
      capturePayment(transactionId, {
        action: "capture",
        reseller_id: resellerId,
        payment_method_id: paymentId,
        transaction_id: transactionId,
      })
        .then((res) => {
          if (res.success === false && !alreadyCaptured(res.message)) {
            setState("stripe-fail");
            return;
          }
          localStorage.removeItem("transactionObj");
          setState("stripe-ok");
        })
        .catch((err: unknown) => {
          setState(alreadyCaptured(err instanceof Error ? err.message : "") ? "stripe-ok" : "stripe-fail");
        });
      return;
    }

    if (stored && !transactionId) {
      let transaction: JsonRecord = {};
      try {
        transaction = JSON.parse(stored) as JsonRecord;
      } catch {
        transaction = {};
      }
      portalRequest<JsonRecord>("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capture",
          reseller_id: localStorage.getItem("reseller_id") || "",
          payment_method_id: paymentId,
          transaction_id: text(transaction.request_id),
          razorpay_order_id: text(transaction.razorpay_order_id),
          razorpay_payment_id: text(transaction.razorpay_payment_id),
          razorpay_signature: text(transaction.razorpay_signature),
        }),
      })
        .then((res) => {
          if (res.success !== false) window.location.reload();
        })
        .catch(() => undefined);
      setState("razorpay");
      return;
    }

    setState("manual");
  }, []);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-[var(--shadow)]">
      {state === "loading" ? <PageLoader className="min-h-24" /> : null}
      {state === "stripe-ok" ? (
        <>
          <h1 className="text-2xl font-semibold">Payment submitted successfully!</h1>
          <p className="mt-3 text-sm text-muted">Your payment is being processed in the background and can take up to 6 hours to appear in the wallet.</p>
        </>
      ) : null}
      {state === "stripe-fail" ? <h1 className="text-2xl font-semibold">Payment request was not successful.</h1> : null}
      {state === "razorpay" ? <h1 className="text-2xl font-semibold">Your wallet top-up was successful!</h1> : null}
      {state === "manual" ? (
        <>
          <h1 className="text-2xl font-semibold">Your form has been submitted successfully!</h1>
          <p className="mt-3 text-sm text-muted">It is being processed in the background and can take up to 24 hours.</p>
        </>
      ) : null}
      <Link href="/dashboard" className="mt-6 inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white">Home Page</Link>
    </div>
  );
}
