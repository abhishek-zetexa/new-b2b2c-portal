import type { Metadata } from "next";
import { SimInventoryView } from "@/components/portal/sim-inventory-view";

export const metadata: Metadata = { title: "Sim Inventory" };

export default function Page() {
  return <SimInventoryView />;
}
