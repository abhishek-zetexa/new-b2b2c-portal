"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/ui/icon";
import { WaveLoader } from "@/components/ui/wave-loader";

const points = [
  ["Minimum", "investment."],
  ["Zero", "inventory."],
  ["Set your", "markups."],
  ["Keep the", "margins."],
];

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function sendOtp(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email ID.");
      return;
    }
    setError("");
    setStep("otp");
  }

  function verify(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (otp.replace(/\D/g, "").length < 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError("");
    setBusy(true);
    const name = email.split("@")[0]?.replace(/[._-]+/g, " ") || "Partner";
    sessionStorage.setItem(
      "zetexa-preview-session",
      JSON.stringify({ email, name }),
    );
    router.push("/dashboard");
  }

  return (
    <div className="min-h-dvh bg-page">
      <SiteHeader />
      <main className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2 lg:py-12">
        <section className="stage-wash bg-stage order-2 rounded-[1.75rem] p-6 text-on-stage sm:p-8 lg:order-1">
          <p className="text-xs font-semibold tracking-[0.16em] text-stage-soft uppercase">Partner login</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-on-stage sm:text-5xl">
            Don&apos;t <span className="text-mint">miss millions</span>
          </h1>
          <p className="mt-4 max-w-md text-stage-soft">
            eSIM is the highest-selling travel ancillary. Start selling eSIMs, lounges and more.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3">
            {points.map(([lead, rest]) => (
              <li key={lead} className="rounded-2xl border border-stage-line bg-stage-hover px-4 py-3 text-sm text-on-stage">
                <span className="font-semibold text-mint">+ {lead}</span> {rest}
              </li>
            ))}
          </ul>
          <div className="mt-6 overflow-hidden rounded-[1.5rem] bg-stage-hover p-3">
            <Image
              src="/brand/signup.png"
              alt="Partner dashboard used across the Zetexa selling portal"
              width={1551}
              height={958}
              priority
              className="h-auto w-full rounded-xl"
            />
          </div>
        </section>

        <section className="order-1 lg:order-2">
          <div className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[var(--shadow)] sm:p-8">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Welcome to</p>
            <h2 className="mt-2 text-3xl font-semibold">Zetexa Global</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Let us take you to a journey with endless possibilities. Log in to access your dashboard and manage eSIMs, lounges, and more travel services.
            </p>

            {step === "email" ? (
              <form className="mt-6" onSubmit={sendOtp}>
                <label htmlFor="email" className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">
                  Email ID
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="Enter your email ID"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="field mt-2"
                />
                {error ? <p className="mt-2 text-sm text-primary">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-wait"
                >
                  {busy ? <WaveLoader size="sm" label="Sending code" /> : "Send OTP"}
                </button>
              </form>
            ) : (
              <form className="mt-6" onSubmit={verify}>
                <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">Verification</p>
                <h3 className="mt-2 text-xl font-semibold">OTP verification</h3>
                <p className="mt-2 text-sm text-muted">
                  Enter the 6-digit code for <span className="font-semibold text-ink">{email}</span>.
                  Delivery to email connects with the partner API next. Any 6 digits opens the portal preview.
                </p>
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  aria-label="One time password"
                  className="field mt-4 text-center text-lg tracking-[0.4em]"
                />
                {error ? <p className="mt-2 text-sm text-primary">{error}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:cursor-wait"
                >
                  {busy ? <WaveLoader size="sm" label="Signing in" /> : "Verify and continue"}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full text-sm font-semibold text-muted"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError("");
                  }}
                >
                  Use a different email
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-sm text-muted">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="font-semibold text-primary">
                Sign up
              </Link>
            </p>
            <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
              <Image src="/brand/sim.png" alt="" width={79} height={48} className="h-8 w-auto" />
              <div className="text-xs leading-5 text-muted">
                <p>40,00,000+ SIMs sold by partners worldwide</p>
                <p>5500+ B2B partners signed up</p>
              </div>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted">
            <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Wallet and order amounts in the portal are kept in USD for this QA environment.
          </p>
        </section>
      </main>
    </div>
  );
}
