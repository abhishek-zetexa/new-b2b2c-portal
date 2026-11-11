"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { hasMenuFlag } from "@/lib/auth-session";
import { usePartner } from "@/components/shell/partner-context";
import { accountNav, portalNav, type NavItem } from "@/lib/navigation";
import { Icon } from "@/components/ui/icon";

function isActive(pathname: string, href: string, exact = false) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(pathname.startsWith("/order-menu"));
  const childActive = item.children?.some((child) => pathname === child.href) ?? false;
  const active = item.children ? childActive : isActive(pathname, item.href, true);

  if (!item.children) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
          active ? "bg-mint font-semibold text-primary" : "text-ink hover:bg-mint"
        }`}
      >
        <Icon name={item.icon} className="h-[18px] w-[18px]" />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <div
        className={`flex items-center rounded-2xl text-sm font-medium transition ${
          active ? "bg-mint font-semibold text-primary" : "text-ink hover:bg-mint"
        }`}
      >
        <Link href={item.href} onClick={onNavigate} className="flex flex-1 items-center gap-3 px-3 py-2.5">
          <Icon name={item.icon} className="h-[18px] w-[18px]" />
          <span>{item.label}</span>
        </Link>
        <button
          type="button"
          aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="mr-1 inline-flex h-9 w-9 items-center justify-center rounded-xl"
        >
          <Icon name="chevron" className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open ? (
        <div className="mt-1 ml-5 space-y-1 border-l border-line pl-3">
          {item.children.map((child) => {
            const selected = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                onClick={onNavigate}
                className={`block rounded-xl px-3 py-2 text-sm ${
                  selected ? "bg-mint font-semibold text-primary" : "text-muted hover:bg-mint hover:text-ink"
                }`}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar({
  name,
  email,
  mobileOpen,
  onNavigate,
}: {
  name: string;
  email: string;
  mobileOpen: boolean;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const partner = usePartner();
  const visibleNav = portalNav
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!partner.ready) return !item.flag && !item.agentHidden;
        if (item.agentHidden && partner.role === "RESELLER_AGENT") return false;
        if (item.flag) return hasMenuFlag(partner.featureAccess, item.flag);
        return true;
      }),
    }))
    .filter((group) => group.items.length > 0);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "ZP";

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--navy)_35%,transparent)] lg:hidden ${
          mobileOpen ? "block" : "hidden"
        }`}
        onClick={onNavigate}
      />
      <aside
        className={`fixed top-0 left-0 z-50 flex h-dvh w-[var(--sidebar-w)] flex-col border-r border-line bg-surface text-ink transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <Link href="/dashboard" onClick={onNavigate} className="text-ink" aria-label="Dashboard">
            <Logo className="h-8 w-auto" />
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink lg:hidden"
            aria-label="Close sidebar"
            onClick={onNavigate}
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-4 mb-4 flex items-center gap-3 rounded-2xl bg-mint px-3 py-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-navy capitalize">{name}</span>
            <span className="block truncate text-xs text-navy/70">{email || "Reseller admin"}</span>
          </span>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {visibleNav.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold tracking-[0.16em] text-muted uppercase">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink key={item.href + item.label} item={item} pathname={pathname} onNavigate={onNavigate} />
                ))}
              </div>
            </div>
          ))}
          <div className="border-t border-line pt-4 lg:hidden">
            {accountNav.map((item) => (
              <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
            ))}
          </div>
        </nav>
      </aside>
    </>
  );
}
