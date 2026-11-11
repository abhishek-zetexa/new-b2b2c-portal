"use client";

import { useState, type ReactNode } from "react";
import { PartnerProvider } from "@/components/shell/partner-context";
import { PortalHeader } from "@/components/shell/portal-header";
import { Sidebar } from "@/components/shell/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export function PortalShell({
  children,
  name,
  email,
}: {
  children: ReactNode;
  name: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <ToastProvider>
      <PartnerProvider>
      <div className="min-h-dvh bg-page">
        <Sidebar
          name={name || "Partner"}
          email={email}
          mobileOpen={open}
          onNavigate={() => setOpen(false)}
        />
        <div className="min-w-0 lg:pl-[var(--sidebar-w)]">
          <PortalHeader onMenu={() => setOpen(true)} />
          <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
        </div>
        </div>
      </PartnerProvider>
    </ToastProvider>
  );
}
