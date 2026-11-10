import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "eSIM Orders" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="eSIM orders"
      title="eSIM Orders"
      description="Review travel eSIM orders, delivery status, and the QR sent to each customer."
    />
  );
}
