import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = { title: "Dashboard" };

const actions = [
  { href: "/buy-sims", title: "Buy SIMs", copy: "Place an eSIM order and send the QR to a traveller." },
  { href: "/buy-airport-service", title: "Buy add-ons", copy: "Lounge, fast track, meet & greet, and VIP services." },
  { href: "/transactions", title: "Wallet", copy: "Top up and review every debit against an order." },
  { href: "/reports", title: "Reports", copy: "Revenue, margin, and usage when reporting is connected." },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Overview</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Sell travel eSIMs, local SIMs, and airport services from one workspace. Catalogue, orders, and wallet screens are ready to connect.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)] transition hover:border-primary"
          >
            <h2 className="text-lg font-semibold">{action.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{action.copy}</p>
          </Link>
        ))}
      </div>

      <section className="stage-wash bg-stage mt-6 overflow-hidden rounded-[1.75rem] p-3 shadow-[var(--shadow)] sm:p-4">
        <div className="grid items-center gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Image
            src="/brand/signup.png"
            alt="Current Zetexa partner portal"
            width={1551}
            height={958}
            className="h-auto w-full rounded-2xl bg-stage-hover"
          />
          <div className="px-2 py-2 sm:px-4">
            <p className="text-xs font-semibold tracking-[0.14em] text-mint uppercase">Your selling desk</p>
            <h2 className="mt-2 text-2xl font-semibold text-on-stage">Orders, margin, and delivery in one view.</h2>
            <p className="mt-3 text-sm leading-6 text-stage-soft">
              The live portal already shows cost, markup, and what the customer pays. This workspace keeps that flow, with a quieter layout that stays readable on a phone.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Image src="/brand/sim.png" alt="" width={79} height={48} className="h-8 w-auto" />
              <p className="text-sm text-stage-soft">40,00,000+ SIMs sold by partners worldwide</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
