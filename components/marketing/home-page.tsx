import Image from "next/image";
import Link from "next/link";
import { FaqList } from "@/components/marketing/faq-list";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { Icon } from "@/components/ui/icon";

const audiences = [
  ["Travel agencies & OTAs", "Add an eSIM and lounge pass to every itinerary at checkout or after booking."],
  ["Fintechs & digital platforms", "Offer travel data inside your app next to forex cards and international payments."],
  ["Telecom resellers", "Launch a travel connectivity line without building carrier deals or an MVNO."],
  ["Currency exchange", "Sell the eSIM at the counter while travellers pick up their cash."],
  ["Travel insurance", "Bundle connectivity with a policy so travellers stay reachable abroad."],
  ["Visa services", "Close the application with the one thing every approved traveller needs next."],
];

const catalogue = [
  ["Travel eSIM", "Data plans for 180+ countries and regions. Delivered instantly as a QR code, activated on landing.", true],
  ["Local SIM · USA, Canada, UK", "A local number with calls, texts and data for students, long stays and frequent visitors.", false],
  ["Lounge access", "Pre-booked lounge entry your customers can add on at the time of booking.", false],
  ["Fast track", "Priority lanes through security and immigration at supported airports.", false],
  ["Meet & greet", "A named host at arrival or departure, ideal for first-time, senior and family travellers.", false],
  ["VIP services", "Chauffeur transfers and end-to-end airport assistance for premium customers.", false],
] as const;

const steps = [
  ["01", "5 min", "Apply", "Tell us about your business and the products you want to sell."],
  ["02", "~1 day", "Get verified", "Our onboarding team reviews your details, usually within one business day."],
  ["03", "Your call", "Set your prices", "Top up your wallet and add a markup by product, country or plan."],
  ["04", "Ongoing", "Sell & track", "Sell from the portal, share payment links or use the API. Every order and payout in one view."],
];

const channels = [
  ["Partner portal", "Search the catalogue, place orders and manage customers from the browser. No integration needed."],
  ["Payment links", "Send a checkout link on WhatsApp or email. The customer pays, the eSIM is delivered."],
  ["Reseller API", "Put the catalogue inside your own app or booking flow and automate fulfilment."],
  ["Branded storefront", "A ready shop with your logo and prices that your customers buy from directly."],
];

const portalFeatures = [
  ["Multilingual, multi-currency", "Run the portal in English, German, French, Spanish, Hindi, Tamil or Telugu."],
  ["Agent hierarchy", "Add sub-agents under a super admin and control what each one can sell."],
  ["Prepaid wallet", "Recharge when you need to and see every debit against an order."],
  ["Customer records", "Every traveller, their plans and top-ups in one place for repeat sales."],
  ["Multilingual AI chatbot", "Customers can ask for an eSIM in their own language, including Arabic."],
  ["Live sales reporting", "Revenue, margin and usage by agent, product and destination."],
];

const partners = ["Barça Mobile", "Niyo", "EbixCash", "Almosafer", "Razorpay", "wego", "atlys", "Almatar"];

const prices = [
  ["Europe · 20 GB", "30 days · 39 countries", "$22.00", "20%", "$26.40"],
  ["UAE · 5 GB", "7 days", "$8.00", "30%", "$10.40"],
  ["Lounge · DXB T3", "Single entry", "$32.00", "15%", "$36.80"],
];

export function HomePage() {
  return (
    <div className="bg-page">
      <SiteHeader />
      <main>
        <section className="stage-wash bg-stage text-on-stage">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-stage-soft uppercase">
                B2B travel connectivity · 180+ countries
              </p>
              <h1 className="mt-4 max-w-xl text-4xl leading-[1.08] font-semibold tracking-tight text-on-stage sm:text-5xl lg:text-6xl">
                Sell travel eSIMs and airport services under{" "}
                <span className="text-mint">your own brand.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-stage-soft sm:text-lg">
                One partner account gives travel agencies, fintechs and telecom resellers a ready catalogue of eSIMs, local SIMs and lounge, fast-track and meet & greet services. You set the price. You keep the margin. No inventory.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-primary transition hover:bg-mint"
                >
                  Become a partner
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
                <a
                  href="#contact"
                  className="inline-flex h-12 items-center justify-center rounded-full border border-stage-line px-6 text-sm font-semibold text-on-stage"
                >
                  Talk to sales
                </a>
              </div>
              <ul className="mt-6 flex flex-col gap-2 text-sm text-stage-soft sm:flex-row sm:flex-wrap sm:gap-x-5">
                {["Free to apply", "Approval in ~1 business day", "Pay only for what you sell"].map((item) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    <Icon name="check" className="h-4 w-4 text-mint" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="media-stage rounded-[1.75rem] bg-stage-hover p-3 sm:p-4">
              <Image
                src="/brand/signup.png"
                alt="Zetexa partner portal showing orders and a travel eSIM checkout"
                width={1551}
                height={958}
                priority
                className="h-auto w-full rounded-2xl"
              />
              <div className="mt-4 flex items-center gap-3 px-1 pb-1">
                <Image src="/brand/sim.png" alt="" width={79} height={48} className="h-8 w-auto" />
                <div>
                  <p className="text-sm font-semibold text-on-stage">40,00,000+ SIMs sold by partners</p>
                  <p className="text-xs text-stage-soft">The same portal your team sells from today.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
            {[
              ["4,000,000+", "SIMs sold by partners"],
              ["5,500+", "B2B partners"],
              ["180+", "Countries covered"],
              ["7", "Portal languages"],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-2xl font-semibold sm:text-3xl">{value}</p>
                <p className="mt-1 text-sm text-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Selling with Zetexa today</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink/80">
            {partners.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for businesses that already talk to travellers.
          </h2>
          <p className="mt-3 max-w-2xl text-muted">
            If your customers book a trip, move money abroad or apply for a visa, connectivity is the easiest add-on you can sell them.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {audiences.map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="catalogue" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">The catalogue</p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            One account. Every step of the trip.
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {catalogue.map(([title, copy, featured]) => (
              <article
                key={title}
                className={`rounded-3xl border bg-surface p-6 shadow-[var(--shadow)] ${featured ? "border-primary" : "border-line"}`}
              >
                {featured ? <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Best seller</p> : null}
                <h3 className={`${featured ? "mt-3" : ""} text-lg font-semibold`}>{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">How it works</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From sign-up to first sale in a day.</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {steps.map(([number, time, title, copy]) => (
              <li key={number} className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
                <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
                  {number} · {time}
                </p>
                <h3 className="mt-3 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
              </li>
            ))}
          </ol>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-hover"
          >
            Start your application
          </Link>
        </section>

        <section id="pricing" className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-14 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Pricing control</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              You set the price. You keep the margin.
            </h2>
            <p className="mt-3 text-muted">
              Buy at partner rates from a prepaid wallet and sell at whatever price suits your market. No inventory to hold and no stock to write off.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-muted">
              {[
                "Markups by product, country or individual plan",
                "Separate price lists for your sub-agents",
                "Wallet in USD, checkout in your customers’ currency",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
            <div className="hidden grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] gap-3 border-b border-line px-5 py-3 text-xs font-semibold tracking-[0.12em] text-muted uppercase sm:grid">
              <span>Plan</span><span>Cost</span><span>Markup</span><span>You sell at</span>
            </div>
            {prices.map(([plan, detail, cost, markup, sell]) => (
              <div key={plan} className="grid gap-1 border-b border-line px-5 py-4 text-sm last:border-b-0 sm:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr] sm:items-center sm:gap-3">
                <div>
                  <p className="font-semibold">{plan}</p>
                  <p className="text-muted">{detail}</p>
                </div>
                <p>{cost}</p>
                <p>{markup}</p>
                <p className="font-semibold text-primary">{sell}</p>
              </div>
            ))}
            <p className="px-5 py-3 text-xs text-muted">Sample prices for illustration.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Ways to sell</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sell the way your team already works.</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {channels.map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Inside the portal</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Everything a reseller team needs, nothing it doesn’t.
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {portalFeatures.map(([title, copy]) => (
              <article key={title} className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">FAQ</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Before you apply.</h2>
          <p className="mt-3 text-sm text-muted">
            Something else? Write to{" "}
            <a className="font-semibold text-primary" href="mailto:support@zetexa.com">support@zetexa.com</a>
          </p>
          <div className="mt-6">
            <FaqList />
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="stage-wash bg-stage rounded-[1.75rem] px-6 py-10 text-on-stage sm:px-10">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-on-stage sm:text-4xl">
              Be selling before your customers’ next trip.
            </h2>
            <p className="mt-3 text-stage-soft">Apply in five minutes. Our onboarding team takes it from there.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-primary hover:bg-mint">
                Become a partner
              </Link>
              <a href="mailto:support@zetexa.com" className="inline-flex h-12 items-center justify-center rounded-full border border-stage-line px-6 text-sm font-semibold text-on-stage">
                Talk to sales
              </a>
            </div>
            <p className="mt-6 text-sm text-stage-soft">support@zetexa.com · +91 94412 33233</p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
