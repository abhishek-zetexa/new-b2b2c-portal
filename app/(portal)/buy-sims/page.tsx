import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/portal/buy-sims/catalog-view";
import { PageLoader } from "@/components/ui/wave-loader";

export const metadata: Metadata = { title: "Buy SIMs" };

export default function Page() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CatalogView />
    </Suspense>
  );
}
