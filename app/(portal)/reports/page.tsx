import { Suspense } from "react";
import type { Metadata } from "next";
import { ReportsView } from "@/components/reports/reports-view";
import { PageLoader } from "@/components/ui/wave-loader";

export const metadata: Metadata = {
  title: "Financial & Sales Reports - Partner Portal",
};

export default function ReportsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ReportsView />
    </Suspense>
  );
}
