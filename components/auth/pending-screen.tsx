"use client";

import { useState } from "react";
import { endSession } from "@/lib/auth-client";
import { SiteHeader } from "@/components/marketing/site-header";

export function PendingScreen() {
  const [busy, setBusy] = useState(false);

  async function logout() {
    if (busy) return;
    setBusy(true);
    const left = await endSession();
    if (!left) setBusy(false);
  }

  return (
    <div className="min-h-dvh bg-page">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Account status</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Your account is pending approval.</h1>
        <p className="mt-4 text-muted">
          The partner account was created and the session is saved. Dashboard access opens after the business verification is approved.
        </p>
        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="mt-8 inline-flex h-12 cursor-pointer items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait"
        >
          Log out
        </button>
      </main>
    </div>
  );
}
