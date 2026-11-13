import type { Metadata } from "next";
import { BuySuccessView } from "@/components/portal/buy-sims/success-view";

export const metadata: Metadata = { title: "Order complete" };

export default function Page() {
  return <BuySuccessView />;
}
