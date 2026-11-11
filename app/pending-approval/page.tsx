import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PendingScreen } from "@/components/auth/pending-screen";
import { readAuthUser } from "@/lib/auth-server";

export const metadata: Metadata = { title: "Pending approval" };

export default async function PendingApprovalPage() {
  const user = await readAuthUser();
  if (!user) redirect("/login");
  if (user.dashboardEnabled) redirect("/dashboard");
  return <PendingScreen />;
}
