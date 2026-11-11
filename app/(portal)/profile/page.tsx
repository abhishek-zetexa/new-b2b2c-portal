import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Profile" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Profile"
      title="Profile"
      description="Your partner profile, company details, and sign-in email."
    />
  );
}
