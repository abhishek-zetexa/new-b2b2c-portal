"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { supportMail } from "@/lib/buy-sims";

export function SupportNote() {
  return (
    <p className="text-center text-xs text-muted">
      *For plans or pricing changes, please contact{" "}
      <a href={`mailto:${supportMail}`} className="font-semibold text-primary">{supportMail}</a>
    </p>
  );
}

export function ViewSwitch({ active }: { active: "grid" | "list" }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-1">
      <Link
        href="/buy-sims"
        aria-label="Grid view"
        aria-current={active === "grid" ? "page" : undefined}
        onClick={() => sessionStorage.setItem("buy-sims-view", "grid")}
        className={`grid h-9 w-9 place-items-center rounded-full ${active === "grid" ? "bg-mint text-primary" : "text-muted hover:text-ink"}`}
      >
        <Icon name="grid" className="h-4 w-4" />
      </Link>
      <Link
        href="/buy-sims/list"
        aria-label="List view"
        aria-current={active === "list" ? "page" : undefined}
        onClick={() => sessionStorage.setItem("buy-sims-view", "list")}
        className={`grid h-9 w-9 place-items-center rounded-full ${active === "list" ? "bg-mint text-primary" : "text-muted hover:text-ink"}`}
      >
        <Icon name="list" className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function StatusBlock({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-[var(--shadow)]">
      <p className="text-base font-semibold text-ink">{title}</p>
      {detail ? <p className="mt-2 text-sm text-muted">{detail}</p> : null}
      {action ? (
        <button type="button" onClick={action.onClick} className="mt-4 inline-flex h-11 cursor-pointer items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover">
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-20 animate-pulse rounded-3xl border border-line bg-surface" />
      ))}
    </div>
  );
}

export const fieldClass = "h-10 w-full rounded-2xl border border-line bg-page px-3 text-sm text-ink outline-none focus:border-primary";
export const primaryButton = "inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait";
export const ghostButton = "inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink hover:border-primary hover:text-primary disabled:cursor-wait";
