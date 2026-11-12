"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Icon } from "@/components/ui/icon";

const links = [
  { label: "Catalogue", href: "/#catalogue" },
  { label: "How it works", href: "/#how" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 shadow-[var(--shadow)] backdrop-blur">
      <div className="relative mx-auto flex h-[var(--header-h)] max-w-6xl items-center px-4 sm:px-6">
        <Link href="/" aria-label="Zetexa Partners home" className="text-ink">
          <Logo className="h-7 w-auto sm:h-8" />
        </Link>
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 text-sm font-medium text-muted lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden h-10 items-center rounded-full px-4 text-sm font-semibold text-ink sm:inline-flex"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
          >
            Become a partner
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-line bg-surface px-4 py-3 lg:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-medium text-ink"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-sm font-semibold text-primary"
            >
              Log in
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
