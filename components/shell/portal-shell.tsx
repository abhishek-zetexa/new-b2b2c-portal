"use client";

import { useCallback, useState, type ReactNode } from "react";
import type { AccountStatus } from "@/lib/account-status";
import type { PortalLanguageCode } from "@/lib/portal-translate";
import { EkycDialog } from "@/components/portal/ekyc-dialog";
import { ChatwootWidget } from "@/components/shell/chatwoot-widget";
import { GoogleTranslateEngine } from "@/components/shell/language-selector";
import { PartnerProvider } from "@/components/shell/partner-context";
import { PortalHeader } from "@/components/shell/portal-header";
import { Sidebar } from "@/components/shell/sidebar";
import { ToastProvider } from "@/components/ui/toast";

export function PortalShell({
  children,
  name,
  email,
  status,
  chatwootToken,
}: {
  children: ReactNode;
  name: string;
  email: string;
  status: AccountStatus | null;
  chatwootToken: string;
}) {
  const [open, setOpen] = useState(false);
  const [ekycOpen, setEkycOpen] = useState(false);
  const [language, setLanguage] = useState<PortalLanguageCode>("en");
  const closeEkyc = useCallback(() => setEkycOpen(false), []);

  return (
    <ToastProvider>
      <PartnerProvider>
        <div className="min-h-dvh bg-page">
          <GoogleTranslateEngine language={language} onSyncLanguage={setLanguage} />
          <Sidebar
            name={name || "Partner"}
            email={email}
            mobileOpen={open}
            status={status}
            language={language}
            onLanguageChange={setLanguage}
            onVerify={() => setEkycOpen(true)}
            onNavigate={() => setOpen(false)}
          />
          <div className="min-w-0 lg:pl-[var(--sidebar-w)]">
            <PortalHeader
              onMenu={() => setOpen(true)}
              status={status}
              onVerify={() => setEkycOpen(true)}
            />
            <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
          </div>
          <EkycDialog open={ekycOpen} onClose={closeEkyc} />
          <ChatwootWidget
            token={chatwootToken}
            name={name}
            email={email}
            locale={language}
            hidden={ekycOpen}
          />
        </div>
      </PartnerProvider>
    </ToastProvider>
  );
}
