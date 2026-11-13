import type { Metadata } from "next";
import { CheckoutSuccessView } from "@/components/portal/dashboard/checkout-success-view";

export const metadata: Metadata = { title: "Complete eKYC" };

export default function CheckoutSuccessPage() {
  return <CheckoutSuccessView />;
}
