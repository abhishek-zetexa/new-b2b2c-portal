import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Customer management" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Customers"
      title="Customer management"
      description="Keep every traveller, their plans, and top-ups together for the next sale."
    />
  );
}
