import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Coupon Programs" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Coupons"
      title="Coupon Programs"
      description="Create partner coupons and decide which agents can issue them."
    />
  );
}
