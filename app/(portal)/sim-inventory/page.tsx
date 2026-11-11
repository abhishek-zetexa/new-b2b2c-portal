import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Sim Inventory" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="SIM inventory"
      title="Sim Inventory"
      description="See SIMs allocated to your account and what is still available to sell."
    />
  );
}
