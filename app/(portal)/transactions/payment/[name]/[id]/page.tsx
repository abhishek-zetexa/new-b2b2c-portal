import type { Metadata } from "next";
import { PaymentRoute } from "@/components/wallet/payment-route";

export const metadata: Metadata = { title: "Wallet recharge" };

export default function Page() {
  return <PaymentRoute />;
}
