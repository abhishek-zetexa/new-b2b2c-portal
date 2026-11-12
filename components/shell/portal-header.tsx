"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { endSession } from "@/lib/auth-client";
import type { AccountStatus } from "@/lib/account-status";
import { accountNav, findNavItem } from "@/lib/navigation";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Icon } from "@/components/ui/icon";

export function PortalHeader({
  onMenu,
  status,
  onVerify,
}: {
  onMenu: () => void;
  status: AccountStatus | null;
  onVerify: () => void;
}) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const accountCrumb = accountNav.some((item) => item.href === pathname);
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    const left = await endSession();
    if (!left) setLeaving(false);
  }

  return (
    <header className="sticky top-0 z-30 flex h-[var(--header-h)] items-center gap-3 border-b border-line bg-surface px-3 shadow-[0_10px_30px_color-mix(in_srgb,var(--navy)_6%,transparent)] sm:px-5">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line lg:hidden"
        aria-label="Open sidebar"
        onClick={onMenu}
      >
        <Icon name="menu" className="h-[18px] w-[18px]" />
      </button>
      <div className="min-w-0">
        {accountCrumb ? (
          <nav aria-label="Breadcrumb">
            <p className="truncate text-sm font-semibold text-ink sm:text-base">{current.label}</p>
          </nav>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {status?.showEkyc ? (
          <span className="group relative">
            <button
              type="button"
              onClick={onVerify}
              title={status.verifyBody}
              className="inline-flex h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover sm:px-4 sm:text-sm"
            >
              <span className="ekyc-dot" aria-hidden="true" />
              <span className="hidden sm:inline">Complete eKYC Verification</span>
              <span className="sm:hidden">eKYC</span>
            </button>
            <span className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-64 rounded-2xl border border-line bg-surface px-3 py-2 text-xs leading-5 text-ink shadow group-hover:block">
              {status.verifyBody}
            </span>
          </span>
        ) : null}
        {status?.walletLabel ? (
          <span className="group relative">
            <span
              title={status.walletMessage || undefined}
              className={`inline-flex h-10 items-center whitespace-nowrap rounded-full px-3 text-xs font-semibold sm:px-4 sm:text-sm ${status.walletTone === "alert"
                ? "bg-danger text-white"
                : "bg-mint text-primary"
                }`}
            >
              {status.walletLabel}
            </span>
            {status.walletMessage ? (
              <span className="pointer-events-none absolute top-full right-0 z-20 mt-2 hidden w-64 rounded-2xl border border-line bg-surface px-3 py-2 text-xs leading-5 text-ink shadow group-hover:block">
                {status.walletMessage}
              </span>
            ) : null}
          </span>
        ) : null}
        <Link
          href="/transactions"
          className="hidden h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold sm:inline-flex"
        >
          <Icon name="wallet" className="h-4 w-4 text-primary" />
          Wallet
        </Link>
        {accountNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={`hidden h-10 items-center justify-center gap-2 rounded-full border px-3 text-sm font-semibold lg:inline-flex ${
                active ? "border-primary bg-mint text-primary" : "border-line"
              }`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <ThemeToggle />
        <button
          type="button"
          aria-label="Log out"
          onClick={logout}
          disabled={leaving}
          className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line disabled:cursor-wait"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
