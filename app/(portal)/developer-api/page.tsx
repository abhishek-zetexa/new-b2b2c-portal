import type { Metadata } from "next";
import { DeveloperApiView } from "@/components/portal/developer-api/developer-api-view";

export const metadata: Metadata = {
  title: "Developer APIs | Partner Portal",
  description: "Reseller API access, keys, webhooks, and rate limits for integrating eSIM provisioning.",
};

export default function Page() {
  return <DeveloperApiView />;
}
