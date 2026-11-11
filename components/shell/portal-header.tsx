"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { findNavItem } from "@/lib/navigation";
import { Icon } from "@/components/ui/icon";

export function PortalHeader({
  onMenu,
}: {
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const current = findNavItem(pathname);

  function logout() {
    sessionStorage.removeItem("zetexa-preview-session");
    router.push("/login");
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
        <p className="truncate text-sm font-semibold sm:text-base">{current.label}</p>
        <p className="hidden text-xs text-muted sm:block">Partner portal</p>
      </div>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Link
          href="/transactions"
          className="hidden h-10 items-center gap-2 rounded-full border border-line px-3 text-sm font-semibold sm:inline-flex"
        >
          <Icon name="wallet" className="h-4 w-4 text-primary" />
          Wallet
        </Link>
        <Link
          href="/settings"
          aria-label="Settings"
          className="hidden h-10 w-10 items-center justify-center rounded-full border border-line sm:inline-flex"
        >
          <Icon name="settings" className="h-[18px] w-[18px]" />
        </Link>
        <Link
          href="/profile"
          aria-label="Profile"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
        >
          <Icon name="person" className="h-[18px] w-[18px]" />
        </Link>
        <button
          type="button"
          aria-label="Log out"
          onClick={logout}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </div>
    </header>
  );
}
