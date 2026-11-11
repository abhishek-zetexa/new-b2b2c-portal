import type { Metadata } from "next";
import { WalletView } from "@/components/wallet/wallet-view";

export const metadata: Metadata = {
  title: "Wallet & Transactions - Partner Portal",
};

export default function TransactionsPage() {
  return <WalletView />;
}
