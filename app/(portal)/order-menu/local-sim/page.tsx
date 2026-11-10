import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Local SIM Orders" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Local SIM orders"
      title="Local SIM Orders"
      description="Track local SIM orders for the USA, Canada, and the UK."
    />
  );
}
