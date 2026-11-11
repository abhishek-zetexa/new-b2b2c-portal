import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { readAuthUser } from "@/lib/auth-server";
import { PortalShell } from "@/components/shell/portal-shell";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await readAuthUser();
  if (!user) redirect("/login");
  if (!user.dashboardEnabled) redirect("/pending-approval");
  return <PortalShell name={user.name} email={user.email}>{children}</PortalShell>;
}
