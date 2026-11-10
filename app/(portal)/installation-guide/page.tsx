import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Installation Guide" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Installation"
      title="Installation Guide"
      description="Step-by-step eSIM installation for iPhone and Android, ready to share with customers."
    />
  );
}
