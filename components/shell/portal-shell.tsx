"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { PortalHeader } from "@/components/shell/portal-header";
import { Sidebar } from "@/components/shell/sidebar";

type Session = { name: string; email: string };

const fallback: Session = { name: "Partner", email: "Reseller admin" };

const fallbackRaw = "";

function readRaw() {
  return sessionStorage.getItem("zetexa-preview-session") ?? fallbackRaw;
}

function parseSession(raw: string): Session {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw) as Partial<Session>;
    return {
      name: parsed.name || fallback.name,
      email: parsed.email || fallback.email,
    };
  } catch {
    return fallback;
  }
}

export function PortalShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const raw = useSyncExternalStore(() => () => {}, readRaw, () => fallbackRaw);
  const session = parseSession(raw);

  return (
    <div className="min-h-dvh bg-page">
      <Sidebar
        name={session.name || "Partner"}
        email={session.email || ""}
        mobileOpen={open}
        onNavigate={() => setOpen(false)}
      />
      <div className="lg:pl-[var(--sidebar-w)]">
        <PortalHeader onMenu={() => setOpen(true)} />
        <main className="px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
