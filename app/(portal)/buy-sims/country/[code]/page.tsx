import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanView } from "@/components/portal/buy-sims/plan-view";

export const metadata: Metadata = { title: "Buy SIMs" };

export default function Page({ params }: { params: Promise<{ code: string }> }) {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-sm text-muted">Loading plans…</p>}>
      <CountryPlan params={params} />
    </Suspense>
  );
}

async function CountryPlan({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlanView kind="country" code={decodeURIComponent(code)} />;
}
