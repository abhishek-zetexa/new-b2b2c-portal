import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Help" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Help"
      title="Help"
      description="Answers for selling, delivery, and the questions your team hears from travellers."
    />
  );
}
