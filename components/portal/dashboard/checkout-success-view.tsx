"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export function CheckoutSuccessView() {
  const params = useParams<{ orderId: string }>();
  const orderId = decodeURIComponent(params.orderId || "");

  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)] sm:p-8">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Order</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Complete eKYC</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        This order needs eKYC before it can finish. Order number{" "}
        <span className="font-semibold text-ink">{orderId || "—"}</span>.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
      >
        Back to dashboard
      </Link>
    </section>
  );
}
