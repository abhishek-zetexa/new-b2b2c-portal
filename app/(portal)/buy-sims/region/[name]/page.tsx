import type { Metadata } from "next";
import { Suspense } from "react";
import { PlanView } from "@/components/portal/buy-sims/plan-view";

export const metadata: Metadata = { title: "Buy SIMs" };

export default function Page({ params }: { params: Promise<{ name: string }> }) {
  return (
    <Suspense fallback={<p className="px-6 py-16 text-sm text-muted">Loading plans…</p>}>
      <RegionPlan params={params} />
    </Suspense>
  );
}

async function RegionPlan({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  return <PlanView kind="region" code={decodeURIComponent(name)} />;
}
