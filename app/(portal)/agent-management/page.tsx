import type { Metadata } from "next";
import { AgentManagementView } from "@/components/portal/agent-management-view";

export const metadata: Metadata = { title: "Agent management" };

export default function Page() {
  return <AgentManagementView />;
}
