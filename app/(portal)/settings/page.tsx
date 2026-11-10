import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Settings"
      title="Settings"
      description="Account preferences for the reseller workspace."
    />
  );
}
