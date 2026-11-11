"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { portalRequest } from "@/lib/portal-fetch";
import type { FeatureAccess } from "@/lib/auth-session";

export type PartnerContextValue = {
  ready: boolean;
  email: string;
  name: string;
  firstName: string;
  resellerId: string;
  agentId: string;
  role: string;
  cashbackEligible: boolean;
  featureAccess: FeatureAccess;
  resellerStatus: string;
};

const empty: PartnerContextValue = {
  ready: false,
  email: "",
  name: "",
  firstName: "",
  resellerId: "",
  agentId: "",
  role: "",
  cashbackEligible: false,
  featureAccess: {},
  resellerStatus: "",
};

const PartnerContext = createContext<PartnerContextValue>(empty);

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<PartnerContextValue>(empty);

  useEffect(() => {
    let ignore = false;
    portalRequest<Omit<PartnerContextValue, "ready" | "resellerStatus">>("/api/account/context")
      .then(async (partner) => {
        let resellerStatus = "";
        try {
          const account = await portalRequest<Record<string, unknown>>("/api/developer?env=account");
          const nested = account.data && typeof account.data === "object" ? (account.data as Record<string, unknown>) : null;
          resellerStatus = String(account.kyc_status || nested?.kyc_status || "");
          sessionStorage.setItem("resellerStatus", resellerStatus);
        } catch {
          resellerStatus = sessionStorage.getItem("resellerStatus") || "";
        }
        if (!ignore) {
          sessionStorage.setItem("role", partner.role);
          sessionStorage.setItem("agent-data", JSON.stringify({
            reseller_id: partner.resellerId,
            agent_id: partner.agentId,
            first_name: partner.firstName,
            email: partner.email,
          }));
          sessionStorage.setItem("featureAccess", JSON.stringify(partner.featureAccess));
          sessionStorage.setItem("iscashbackEligible", partner.cashbackEligible ? "true" : "false");
          setValue({ ...partner, resellerStatus, ready: true });
        }
      })
      .catch(() => {
        if (!ignore) setValue({ ...empty, ready: true });
      });
    return () => {
      ignore = true;
    };
  }, []);

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner() {
  return useContext(PartnerContext);
}
