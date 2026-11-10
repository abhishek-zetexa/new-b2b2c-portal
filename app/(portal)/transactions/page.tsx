import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Wallet" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Wallet"
      title="Wallet"
      description="Recharge the prepaid wallet and follow every debit against an order."
    />
  );
}
