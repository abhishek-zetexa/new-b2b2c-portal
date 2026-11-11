"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { authMessage, enterApp, postAuth } from "@/lib/auth-client";
import { useSignedOutGate } from "@/components/auth/use-signed-out-gate";
import { emailError, firstIssue, focusIssue, phoneError, requiredText, websiteError, otpError } from "@/lib/field-rules";
import { SiteHeader } from "@/components/marketing/site-header";
import { CheckField, FieldMessage, SelectField, TextField, useShownFields } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { WaveLoader } from "@/components/ui/wave-loader";

type Country = { name: string; dial_code: string; code: string };
type Step = 1 | 2 | "otp";

const industries = ["Travel Agency", "OTA", "Corporate Travel", "Telecom", "Technology", "Other"];
const channels = ["Reseller Portal", "API", "SDK", "Microsite", "WhatsApp Bot"];
const products = ["Travel eSIM", "Local MVNO", "Travel Ancillaries"];
const businessTypes = ["Company", "Individual", "Limited Liability Partnership (LLP)"];
const points: [string, string][] = [
  ["Minimum", "Investment."],
  ["Zero", "Inventory"],
  ["Set your", "Markups"],
  ["Keep the", "Margins"],
];
const empty = {
  firstName: "",
  lastName: "",
  email: "",
  country: "",
  dialCode: "",
  phone: "",
  companyName: "",
  businessType: "",
  industry: "",
  websiteUrl: "",
  interestedIn: "",
  referralCode: "",
  agree: false,
};

export function SignupScreen() {
  useSignedOutGate();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(empty);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [countriesError, setCountriesError] = useState("");
  const [otp, setOtp] = useState("");
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const { show, message } = useShownFields();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/countries", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("unavailable");
        return response.json() as Promise<Country[]>;
      })
      .then((list) => {
        setCountries([...list].sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setCountriesError("Country list is unavailable. Refresh and try again.");
      });
    return () => controller.abort();
  }, []);

  const dialCodes = useMemo(() => {
    const seen = new Set<string>();
    return countries.filter((country) => {
      if (seen.has(country.dial_code)) return false;
      seen.add(country.dial_code);
      return true;
    });
  }, [countries]);

  function update<K extends keyof typeof empty>(key: K, value: (typeof empty)[K]) {
    setFormError("");
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectCountry(code: string) {
    const country = countries.find((item) => item.code === code);
    setFormError("");
    setForm((current) => ({
      ...current,
      country: code,
      dialCode: country?.dial_code ?? current.dialCode,
    }));
  }

  function accountIssues() {
    return {
      firstName: requiredText(form.firstName, "Enter your first name."),
      email: emailError(form.email),
      country: countriesError || requiredText(form.country, "Select the country where your business is based."),
      dialCode: requiredText(form.dialCode, "Select your country code."),
      phone: phoneError(form.phone),
    };
  }

  function businessIssues() {
    return {
      companyName: requiredText(form.companyName, "Enter your company name."),
      businessType: requiredText(form.businessType, "Select a business type."),
      websiteUrl: websiteError(form.websiteUrl),
      agree: form.agree ? "" : "Agree to the partner terms to continue.",
    };
  }

  function reveal(issues: Record<string, string>) {
    show(...Object.keys(issues));
    const id = firstIssue(issues);
    if (id) focusIssue(id);
    return !id;
  }

  function continueToBusiness(event: FormEvent) {
    event.preventDefault();
    if (reveal(accountIssues())) setStep(2);
  }

  async function sendCode(event?: FormEvent) {
    event?.preventDefault();
    if (busy) return;
    const account = accountIssues();
    const business = businessIssues();
    if (!reveal(account)) {
      setStep(1);
      return;
    }
    if (!reveal(business)) {
      setStep(2);
      return;
    }
    setBusy(true);
    setFormError("");
    setNotice("");
    const { ok, data } = await postAuth<{ message?: string }>("/api/auth/signup", {
      ...form,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.replace(/\D/g, ""),
      interestedProducts: selectedProducts,
    });
    setBusy(false);
    if (!ok) {
      setFormError(authMessage(data, "Could not send the code. Try again."));
      return;
    }
    setNotice(authMessage(data, "OTP sent for verification."));
    setStep("otp");
  }

  async function complete(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    show("otp");
    if (otpError(otp)) {
      focusIssue("otp");
      return;
    }
    setBusy(true);
    setFormError("");
    const { ok, data } = await postAuth<{ message?: string; user?: { dashboardEnabled?: boolean } }>("/api/auth/signup/complete", {
      ...form,
      email: form.email.trim().toLowerCase(),
      phone: form.phone.replace(/\D/g, ""),
      interestedProducts: selectedProducts,
      otp,
    });
    setBusy(false);
    if (!ok) {
      setFormError(authMessage(data, "The account could not be created."));
      return;
    }
    enterApp(data.user?.dashboardEnabled);
  }

  const stepOne: StepState = step === 1 ? "current" : "complete";
  const stepTwo: StepState = step === 2 ? "current" : step === "otp" ? "complete" : "upcoming";

  return (
    <div className="min-h-dvh bg-page">
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl items-start gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 lg:py-12">
        <section className="stage-wash bg-stage rounded-[1.75rem] px-5 py-8 text-on-stage sm:px-8">
          <div className="mx-auto flex max-w-[40rem] flex-col gap-7 text-center">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Don&apos;t <span className="text-mint">Miss Millions!</span>
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-stage-soft">
                eSIM is the highest-selling travel ancillary. Start selling eSIMs, lounges &amp; more...
              </p>
            </div>
            <Image
              src="/brand/signup.png"
              alt="Partner dashboard with travel eSIM, agents, customers, and payment links"
              width={1551}
              height={958}
              priority
              className="h-auto w-full rounded-2xl border border-stage-line shadow-[0_30px_60px_-30px_rgba(8,127,112,0.9)]"
            />
            <ul className="grid grid-cols-1 gap-3 text-left sm:grid-cols-2 sm:gap-x-7 sm:gap-y-3.5">
              {points.map(([lead, rest]) => (
                <li key={lead} className="flex items-center gap-2.5">
                  <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-mint text-xs font-bold text-mint">+</span>
                  <p className="text-[13px] tracking-wide text-stage-soft uppercase">
                    <strong className="font-bold text-on-stage">{lead}</strong> {rest}
                  </p>
                </li>
              ))}
              <li className="flex items-center gap-2.5 sm:col-span-2">
                <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-mint text-xs font-bold text-mint">+</span>
                <p className="text-[13px] tracking-wide text-stage-soft uppercase">
                  <strong className="font-bold text-on-stage">Sell through reseller portal,</strong> API, SDK, Microsite, WhatsApp bot.
                </p>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-[1.75rem] border border-line bg-surface p-6 shadow-[var(--shadow)] sm:p-8">
          <nav aria-label="Sign up steps">
            <ol className="grid grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] items-center gap-2">
              <StepMark state={stepOne} index={1} label="Your details" onClick={() => { setFormError(""); setStep(1); }} />
              <li aria-hidden="true" className={`h-0.5 rounded-full ${step === 1 ? "bg-line" : "bg-primary"}`} />
              <StepMark
                state={stepTwo}
                index={2}
                label="Business"
                align="end"
                onClick={() => {
                  if (reveal(accountIssues())) setStep(2);
                }}
              />
            </ol>
          </nav>

          {step === 1 ? (
            <form className="mt-8 space-y-4" onSubmit={continueToBusiness}>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Step 1 of 2</p>
              <h2 className="text-3xl font-semibold">Create your account</h2>
              <p className="text-sm text-muted">Who you are, and how we reach you.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="firstName"
                  label="First name"
                  required
                  autoComplete="given-name"
                  value={form.firstName}
                  error={message("firstName", requiredText(form.firstName, "Enter your first name."))}
                  onBlur={() => show("firstName")}
                  onChange={(value) => update("firstName", value)}
                />
                <TextField
                  id="lastName"
                  label="Last name"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(value) => update("lastName", value)}
                />
              </div>
              <TextField
                id="email"
                label="Email ID"
                required
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="name@company.com"
                value={form.email}
                error={message("email", emailError(form.email))}
                onBlur={() => show("email")}
                onChange={(value) => update("email", value.replace(/\s+/g, "").toLowerCase())}
              />
              <SelectField
                id="country"
                label="Country"
                required
                autoComplete="country"
                value={form.country}
                error={countriesError || message("country", requiredText(form.country, "Select the country where your business is based."))}
                onBlur={() => show("country")}
                onChange={selectCountry}
              >
                <option value="">{countries.length ? "Select country" : "Loading countries…"}</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </SelectField>
              <div className="grid items-start gap-4 sm:grid-cols-[9rem_1fr]">
                <SelectField
                  id="dialCode"
                  label="Code"
                  required
                  autoComplete="tel-country-code"
                  value={form.dialCode}
                  error={message("dialCode", requiredText(form.dialCode, "Select your country code."))}
                  onBlur={() => show("dialCode")}
                  onChange={(value) => update("dialCode", value)}
                >
                  <option value="">Code</option>
                  {dialCodes.map((country) => (
                    <option key={country.dial_code} value={country.dial_code}>{country.dial_code}</option>
                  ))}
                </SelectField>
                <TextField
                  id="phone"
                  label="Mobile number"
                  required
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="9876543210"
                  value={form.phone}
                  error={message("phone", phoneError(form.phone))}
                  onBlur={() => show("phone")}
                  onChange={(value) => update("phone", value.replace(/[^\d\s-]/g, ""))}
                />
              </div>
              <button type="submit" className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover">
                Continue
              </button>
            </form>
          ) : null}

          {step === 2 ? (
            <form className="mt-8 space-y-4" onSubmit={sendCode}>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Step 2 of 2</p>
              <h2 className="text-3xl font-semibold">About the business</h2>
              <TextField
                id="companyName"
                label="Company name"
                required
                autoComplete="organization"
                value={form.companyName}
                error={message("companyName", requiredText(form.companyName, "Enter your company name."))}
                onBlur={() => show("companyName")}
                onChange={(value) => update("companyName", value)}
              />
              <SelectField
                id="businessType"
                label="Business type"
                required
                value={form.businessType}
                error={message("businessType", requiredText(form.businessType, "Select a business type."))}
                onBlur={() => show("businessType")}
                onChange={(value) => update("businessType", value)}
              >
                <option value="">Select business type</option>
                {businessTypes.map((type) => <option key={type}>{type}</option>)}
              </SelectField>
              <SelectField id="industry" label="Industry" value={form.industry} onChange={(value) => update("industry", value)}>
                <option value="">Select industry</option>
                {industries.map((industry) => <option key={industry}>{industry}</option>)}
              </SelectField>
              <TextField
                id="websiteUrl"
                label="Website"
                inputMode="text"
                autoComplete="url"
                placeholder="www.example.com"
                value={form.websiteUrl}
                error={message("websiteUrl", websiteError(form.websiteUrl))}
                onBlur={() => show("websiteUrl")}
                onChange={(value) => update("websiteUrl", value.replace(/\s+/g, "").toLowerCase())}
              />
              <SelectField id="interestedIn" label="How do you want to sell?" value={form.interestedIn} onChange={(value) => update("interestedIn", value)}>
                <option value="">Select a channel</option>
                {channels.map((channel) => <option key={channel}>{channel}</option>)}
              </SelectField>
              <fieldset>
                <legend className="text-sm font-medium">Products</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {products.map((product) => (
                    <label key={product} className="flex items-center gap-2 rounded-2xl border border-line px-3 py-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(product)}
                        onChange={(event) => {
                          setSelectedProducts((current) => event.target.checked ? [...current, product] : current.filter((item) => item !== product));
                        }}
                      />
                      {product}
                    </label>
                  ))}
                </div>
              </fieldset>
              <TextField id="referralCode" label="Referral code" value={form.referralCode} onChange={(value) => update("referralCode", value)} />
              <CheckField
                id="agree"
                checked={form.agree}
                error={message("agree", form.agree ? "" : "Agree to the partner terms to continue.")}
                onChange={(checked) => {
                  show("agree");
                  update("agree", checked);
                }}
                label="I agree with the partner terms and privacy policy."
              />
              <FieldMessage>{formError}</FieldMessage>
              <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
                <button type="button" className="inline-flex h-12 items-center justify-center rounded-full border border-line px-5 text-sm font-semibold" onClick={() => { setFormError(""); setStep(1); }}>
                  Back
                </button>
                <button type="submit" disabled={busy} aria-busy={busy} className="inline-flex h-12 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:text-on-primary">
                  {busy ? <WaveLoader size="sm" label="Sending code" /> : "Sign up"}
                </button>
              </div>
            </form>
          ) : null}

          {step === "otp" ? (
            <form className="mt-8" onSubmit={complete}>
              <p className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">Verification</p>
              <h2 className="mt-2 text-3xl font-semibold">Enter the code</h2>
              <p className="mt-2 text-sm text-muted">
                We sent a 6-digit code to <span className="font-semibold text-ink">{form.email}</span>.
              </p>
              <TextField
                id="otp"
                label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="000000"
                value={otp}
                error={message("otp", otpError(otp)) || formError}
                onBlur={() => show("otp")}
                onChange={(value) => {
                  setFormError("");
                  setOtp(value.replace(/\D/g, "").slice(0, 6));
                }}
                className="text-center text-lg tracking-[0.4em]"
              />
              {notice ? <p className="mt-3 text-sm text-muted">{notice}</p> : null}
              <button type="submit" disabled={busy} aria-busy={busy} className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary hover:bg-primary-hover disabled:text-on-primary">
                {busy ? <WaveLoader size="sm" label="Creating account" /> : "Verify and create account"}
              </button>
              <p className="mt-3 text-center">
                <button type="button" className="inline cursor-pointer text-sm font-semibold text-muted hover:underline disabled:cursor-wait" disabled={busy} onClick={() => sendCode()}>
                  Resend code
                </button>
              </p>
            </form>
          ) : null}

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account? <Link href="/login" className="inline cursor-pointer font-semibold text-primary hover:underline">Log in</Link>
          </p>
          <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
            <Image src="/brand/sim.png" alt="" width={79} height={48} className="h-9 w-auto" />
            <p className="text-xs leading-5 text-muted">40,00,000+ SIMs sold · 5500+ partners worldwide</p>
          </div>
        </section>
      </main>
    </div>
  );
}

type StepState = "current" | "complete" | "upcoming";

function StepMark({
  index,
  label,
  state,
  align = "start",
  onClick,
}: {
  index: number;
  label: string;
  state: StepState;
  align?: "start" | "end";
  onClick: () => void;
}) {
  const mark =
    state === "current"
      ? "border-transparent bg-primary text-on-primary"
      : state === "complete"
        ? "border-primary bg-mint text-primary"
        : "border-line bg-page text-muted";
  return (
    <li className={state === "current" ? "is-current" : undefined}>
      <button
        type="button"
        aria-current={state === "current" ? "step" : undefined}
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 ${align === "end" ? "justify-end text-right" : "text-left"}`}
      >
        {align === "end" ? <StepCopy index={index} label={label} muted={state === "upcoming"} /> : null}
        <span className={`inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border text-[13px] font-semibold ${mark}`}>
          {state === "complete" ? <Icon name="check" className="h-4 w-4" /> : index}
        </span>
        {align === "start" ? <StepCopy index={index} label={label} muted={state === "upcoming"} /> : null}
      </button>
    </li>
  );
}

function StepCopy({ index, label, muted }: { index: number; label: string; muted: boolean }) {
  return (
    <span className="flex flex-col">
      <small className="text-[10px] font-medium tracking-[0.08em] text-muted uppercase">Step {index}</small>
      <strong className={`text-sm ${muted ? "font-medium text-muted" : "font-semibold text-ink"}`}>{label}</strong>
    </span>
  );
}
