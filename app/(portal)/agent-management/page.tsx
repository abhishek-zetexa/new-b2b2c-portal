import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Agent management" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Agents"
      title="Agent management"
      description="Add sub-agents under a reseller admin and control what each one can sell."
    />
  );
}
