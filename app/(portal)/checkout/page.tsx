import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckoutView } from "@/components/portal/buy-sims/checkout-view";

export const metadata: Metadata = { title: "Checkout" };

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto h-40 max-w-6xl animate-pulse rounded-3xl bg-surface" />}>
      <CheckoutView />
    </Suspense>
  );
}
