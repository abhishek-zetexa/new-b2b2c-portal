"use client";

import { useEffect } from "react";
import { signedInPath } from "@/lib/auth-client";

export function useSignedOutGate() {
  useEffect(() => {
    const controller = new AbortController();

    async function leaveIfSignedIn() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => null);
      if (!response || response.status === 401 || !response.ok) return;
      const data = (await response.json().catch(() => null)) as { dashboardEnabled?: boolean } | null;
      window.location.replace(signedInPath(data?.dashboardEnabled));
    }

    void leaveIfSignedIn();
    return () => controller.abort();
  }, []);
}
