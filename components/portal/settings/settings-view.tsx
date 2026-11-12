"use client";

import { useEffect, useState } from "react";
import { usePartner } from "@/components/shell/partner-context";
import { AddonsSettings } from "@/components/portal/settings/addons-settings";
import { GeneralSettings } from "@/components/portal/settings/general-settings";
import { SmtpSettings } from "@/components/portal/settings/smtp-settings";
import { PageLoader } from "@/components/ui/wave-loader";
import { featureAccessFrom, type FeatureAccess } from "@/lib/auth-session";
import type { PartnerContextValue } from "@/components/shell/partner-context";

type AgentSession = {
  resellerId: string;
  agentId: string;
  access: FeatureAccess;
};

function readAgentSession(partner: PartnerContextValue): AgentSession {
  let resellerId = partner.resellerId;
  let agentId = partner.agentId;
  let access = partner.featureAccess;

  try {
    const raw = sessionStorage.getItem("agent-data");
    if (raw) {
      const parsed = JSON.parse(raw) as { reseller_id?: unknown; agent_id?: unknown };
      if (typeof parsed.reseller_id === "string") resellerId = parsed.reseller_id;
      if ("agent_id" in parsed) agentId = parsed.agent_id == null ? "" : String(parsed.agent_id);
    }
  } catch {
    /* keep the signed-in reseller from the portal session */
  }

  try {
    const raw = sessionStorage.getItem("featureAccess");
    if (raw) access = featureAccessFrom(JSON.parse(raw));
  } catch {
    /* keep the permissions already on the portal session */
  }

  return { resellerId, agentId, access };
}

export function SettingsView() {
  const partner = usePartner();
  const [session, setSession] = useState<AgentSession | null>(null);

  useEffect(() => {
    if (!partner.ready) return;
    setSession(readAgentSession(partner));
  }, [partner]);

  if (!session) return <PageLoader />;

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Settings</h1>
      <GeneralSettings resellerId={session.resellerId} access={session.access} />
      <SmtpSettings resellerId={session.resellerId} />
      <AddonsSettings resellerId={session.resellerId} agentId={session.agentId} />
    </div>
  );
}
