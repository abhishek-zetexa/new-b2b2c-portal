import type { Metadata } from "next";
import { Suspense } from "react";
import { MvnoCheckoutView } from "@/components/portal/buy-sims/mvno-checkout-view";

export const metadata: Metadata = { title: "Local SIM checkout" };

export default function Page({ params }: { params: Promise<{ packageId: string }> }) {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-sm text-muted">Loading checkout…</p>}>
      <MvnoCheckout params={params} />
    </Suspense>
  );
}

async function MvnoCheckout({ params }: { params: Promise<{ packageId: string }> }) {
  const { packageId } = await params;
  return <MvnoCheckoutView packageId={decodeURIComponent(packageId)} />;
}
