import type { Metadata } from "next";
import { PaymentThankYou } from "@/components/wallet/payment-thank-you";

export const metadata: Metadata = { title: "Wallet recharge" };

export default function Page() {
  return <PaymentThankYou />;
}
