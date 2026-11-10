import type { Metadata } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export const metadata: Metadata = { title: "Become a partner" };

export default function SignupPage() {
  return (
    <div className="min-h-dvh bg-page">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Become a partner</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">Start your application.</h1>
        <p className="mt-3 text-muted">
          Tell us about your business. Approval is usually within one business day, and applying is free.
        </p>
        <form className="mt-8 space-y-4 rounded-[1.75rem] border border-line bg-surface p-6 shadow-[var(--shadow)]" action="/login">
          <label className="block text-sm font-medium">
            Work email
            <input required type="email" name="email" className="field mt-2" placeholder="you@company.com" />
          </label>
          <label className="block text-sm font-medium">
            Company name
            <input required name="company" className="field mt-2" placeholder="Atlas Travel" />
          </label>
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover"
          >
            Continue
          </button>
          <p className="text-xs leading-5 text-muted">
            The full onboarding form connects to the partner API next. This keeps the apply path open while the shell is in place.
          </p>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
