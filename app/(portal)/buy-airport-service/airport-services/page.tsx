import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Airport Services" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Buy add-ons"
      title="Airport Services"
      description="Choose a plan for the airports already on this booking."
    />
  );
}
