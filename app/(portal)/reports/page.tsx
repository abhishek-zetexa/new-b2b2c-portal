import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Reports" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Reports"
      title="Reports"
      description="Revenue, margin, and usage by agent, product, and destination."
    />
  );
}
