import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Buy SIMs" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Buy SIMs"
      title="Buy SIMs"
      description="Choose a destination, data plan, and traveller, then issue the eSIM from the portal."
    />
  );
}
