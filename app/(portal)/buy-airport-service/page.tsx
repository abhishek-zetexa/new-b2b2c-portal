import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Buy Addons Service" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Buy add-ons"
      title="Buy Addons Service"
      description="Add lounge access, fast track, meet and greet, or VIP airport service to a booking."
    />
  );
}
