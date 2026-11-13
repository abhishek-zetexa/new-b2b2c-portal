import type { Metadata } from "next";
import { Suspense } from "react";
import { ListView } from "@/components/portal/buy-sims/list-view";
import { PageLoader } from "@/components/ui/wave-loader";

export const metadata: Metadata = { title: "Buy SIMs" };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ListView />
    </Suspense>
  );
}
