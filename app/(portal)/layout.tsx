import type { ReactNode } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { readAccountStatus } from "@/lib/account-status-server";
import { readAuthUser } from "@/lib/auth-server";
import { publicEnv } from "@/lib/public-env";
import { serverEnv } from "@/lib/server-env";
import { PortalShell } from "@/components/shell/portal-shell";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  await connection();
  const user = await readAuthUser();
  if (!user) redirect("/login");
  if (!user.dashboardEnabled) redirect("/pending-approval");
  const status = await readAccountStatus(user.role);
  const chatwootToken =
    (publicEnv.production ? serverEnv.chatwootProdToken : "") ||
    serverEnv.chatwootToken;

  return (
    <PortalShell
      name={user.name}
      email={user.email}
      status={status}
      chatwootToken={chatwootToken}
    >
      {children}
    </PortalShell>
  );
}
