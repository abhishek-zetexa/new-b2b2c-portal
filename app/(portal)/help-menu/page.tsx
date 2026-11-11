import type { Metadata } from "next";
import { HelpView } from "@/components/portal/help/help-view";

export const metadata: Metadata = {
  title: "Help & Support | Partner Portal",
  description: "Knowledge base, ticket support, FAQs, and live operational help for eSIM resellers.",
};

export default function Page() {
  return <HelpView />;
}
