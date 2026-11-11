import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Developer APIs" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Developer APIs"
      title="Developer APIs"
      description="Reseller API access for putting the catalogue inside your own app or booking flow."
    />
  );
}
