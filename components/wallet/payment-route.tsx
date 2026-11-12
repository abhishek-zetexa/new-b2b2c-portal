"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PaymentPanel } from "@/components/wallet/payment-panel";
import { asList, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

export function PaymentRoute() {
  const params = useParams<{ name: string; id: string }>();
  const router = useRouter();
  const [currency, setCurrency] = useState<"INR" | "USD">("USD");
  const [banks, setBanks] = useState<JsonRecord[]>([]);

  useEffect(() => {
    const stored = sessionStorage.getItem("reseller-currency");
    if (stored === "INR" || stored === "USD") setCurrency(stored);
    portalRequest<JsonRecord>("/api/finance/payments?resource=methods")
      .then((res) => setBanks(asList(res.data).filter((method) => text(method.fe_name) === "BANK_TRANSFER")))
      .catch(() => setBanks([]));
  }, []);

  const name = decodeURIComponent(params.name || "");
  const locked = name.toUpperCase() === "STRIPE" ? "USD" : name.toUpperCase() === "RAZORPAY" || name.toUpperCase() === "UPI" ? "INR" : currency;

  return (
    <div className="mx-auto min-w-0 max-w-3xl">
    <PaymentPanel
      methodName={name}
      methodId={params.id}
      currency={locked}
      bankMethods={banks}
      onBack={() => router.push("/transactions")}
    />
    </div>
  );
}
