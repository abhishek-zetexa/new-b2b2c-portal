import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Branding & Preference" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Branding"
      title="Branding & Preference"
      description="Add your logo, colours, and SMTP so customers see your brand."
    />
  );
}
