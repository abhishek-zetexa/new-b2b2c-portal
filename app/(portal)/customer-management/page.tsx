import type { Metadata } from "next";
import { CustomerManagementView } from "@/components/portal/customer-management-view";

export const metadata: Metadata = { title: "Customer management" };

export default function Page() {
  return <CustomerManagementView />;
}
