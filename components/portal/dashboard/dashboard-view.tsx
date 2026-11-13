"use client";

import Link from "next/link";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { toast } from "react-toastify";
import { usePartner } from "@/components/shell/partner-context";
import { PageLoader } from "@/components/ui/wave-loader";
import { PaymentPanel } from "@/components/wallet/payment-panel";
import { hasPermission, type FeatureAccess } from "@/lib/auth-session";
import {
  ancillaryItems,
  buildTrend,
  donutCircumference,
  donutRadius,
  formatCount,
  formatMoney,
  isoDate,
  parseOverview,
  percentLabel,
  rangeDates,
  sessionCurrency,
  shortDate,
  walletBalance,
  type AncillaryItem,
  type DashboardOverview,
  type MetricCard,
  type MoneyCode,
  type QuickRange,
} from "@/lib/dashboard-metrics";
import { asList, asRecord, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

const loadError = "Could not load dashboard data. Try changing the date range or refresh.";
const pageSize = 10;

export function DashboardView() {
  const partner = usePartner();
  const admin = partner.role === "RESELLER_ADMIN";
  const [gate, setGate] = useState<{ required: boolean; currency: MoneyCode | null } | null>(null);

  useEffect(() => {
    if (!partner.ready || !admin) return;
    let ignore = false;
    portalRequest<{ required?: boolean; currency?: MoneyCode | null }>("/api/finance/wallet?view=initial")
      .then((result) => {
        if (ignore) return;
        const currency = result.currency === "INR" || result.currency === "USD" ? result.currency : null;
        setGate({ required: result.required === true && Boolean(currency), currency });
      })
      .catch(() => {
        if (!ignore) setGate({ required: false, currency: null });
      });
    return () => {
      ignore = true;
    };
  }, [admin, partner.ready]);

  if (!partner.ready) return <PageLoader />;
  if (admin && !gate) {
    return <p className="py-16 text-center text-sm text-muted">Checking your wallet…</p>;
  }
  if (admin && gate?.required && gate.currency) return <FirstTopUp currency={gate.currency} />;

  return <MetricsDashboard />;
}

function FirstTopUp({ currency }: { currency: MoneyCode }) {
  const [methods, setMethods] = useState<JsonRecord[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [selected, setSelected] = useState<JsonRecord | null>(null);
  const minimum = currency === "INR" ? 25000 : 1000;
  const formatted = currency === "INR" ? "₹25,000" : "$1,000";
  const symbol = currency === "INR" ? "₹" : "$";

  useEffect(() => {
    let ignore = false;
    portalRequest<JsonRecord>("/api/finance/payments?resource=methods")
      .then((res) => {
        if (ignore) return;
        const all = asList(res.data);
        const matching = all.filter((method) => {
          const name = `${text(method.name)} ${text(method.fe_name)}`.toLowerCase();
          return currency === "INR" ? /razor|upi|bank/.test(name) : /stripe|bank|card/.test(name);
        });
        const next = matching.length ? matching : all;
        setMethods(next);
        setStatus(next.length ? "ready" : "empty");
      })
      .catch(() => {
        if (!ignore) setStatus("error");
      });
    return () => {
      ignore = true;
    };
  }, [currency]);

  if (selected) {
    return (
      <div className="mx-auto max-w-3xl">
        <PaymentPanel
          embedded
          methodName={text(selected.fe_name || selected.name)}
          methodId={text(selected.id)}
          initialAmount={minimum}
          currency={currency}
          onBack={() => setSelected(null)}
        />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-[20px] border border-line bg-surface p-8 shadow-[var(--shadow)]">
      <p className="text-sm text-muted">Wallet balance {symbol}0.00</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">Top up your wallet</h1>
      <p className="mt-3 text-sm leading-6 text-ink">
        Your account is approved! Complete your first mandatory top-up of <strong>{formatted}</strong> to start selling.
      </p>
      <h2 className="mt-6 text-lg font-semibold text-ink">Recharge Options</h2>
      {status === "loading" ? <p className="mt-3 text-sm text-muted">Loading payment options…</p> : null}
      {status === "error" ? <p className="mt-3 text-sm text-danger">Payment options could not be loaded.</p> : null}
      {status === "empty" ? <p className="mt-3 text-sm text-muted">Payment options are unavailable right now.</p> : null}
      <div className="mt-4 grid gap-3">
        {methods.map((method) => (
          <button
            key={text(method.id)}
            type="button"
            onClick={() => setSelected(method)}
            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left transition hover:border-primary hover:bg-mint/50 motion-reduce:transition-none"
          >
            {text(method.link) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={text(method.link)} alt="" className="h-8 w-8 object-contain" />
            ) : null}
            <span className="font-medium text-ink">{text(method.name)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function MetricsDashboard() {
  const partner = usePartner();
  const access = permissions(partner.role, partner.featureAccess);
  const initial = rangeDates("7d");
  const [range, setRange] = useState<QuickRange>("7d");
  const [fromDate, setFromDate] = useState(initial.fromDate);
  const [toDate, setToDate] = useState(initial.toDate);
  const [loading, setLoading] = useState(access.canLoad);
  const [error, setError] = useState("");
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trendPage, setTrendPage] = useState(0);
  const [balance, setBalance] = useState(0);
  const [walletCode, setWalletCode] = useState<MoneyCode>(sessionCurrency());

  useEffect(() => {
    if (!access.showWallet) return;
    let ignore = false;
    portalRequest<JsonRecord>("/api/dashboard?resource=details")
      .then((payload) => {
        if (ignore) return;
        const wallet = walletBalance(payload);
        setBalance(wallet.balance);
        setWalletCode(wallet.currency);
        sessionStorage.setItem("reseller-currency", wallet.currency);
      })
      .catch(() => {
        if (!ignore) setBalance(0);
      });
    return () => {
      ignore = true;
    };
  }, [access.showWallet]);

  useEffect(() => {
    if (!access.canLoad || !fromDate || !toDate || fromDate > toDate) return;
    let ignore = false;
    portalRequest<JsonRecord>("/api/dashboard?resource=revenue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromDate,
        toDate,
        reseller_id: partner.resellerId,
        reseller_currency: sessionCurrency(),
      }),
    })
      .then((payload) => {
        if (ignore) return;
        if (asRecord(payload)?.success === false) {
          setOverview(null);
          setError(loadError);
        } else {
          const next = parseOverview(payload);
          setOverview(next);
          setTrendPage(0);
          setError("");
          sessionStorage.setItem("reseller-currency", next.currency);
        }
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setOverview(null);
        setError(loadError);
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [access.canLoad, fromDate, partner.resellerId, toDate]);

  function applyQuick(next: Exclude<QuickRange, "custom">) {
    const dates = rangeDates(next);
    setRange(next);
    if (dates.fromDate === fromDate && dates.toDate === toDate) return;
    setLoading(true);
    setError("");
    setFromDate(dates.fromDate);
    setToDate(dates.toDate);
  }

  function applyCustom(nextFrom: string, nextTo: string) {
    setRange("custom");
    setFromDate(nextFrom);
    setToDate(nextTo);
    if (!nextFrom || !nextTo || nextFrom > nextTo || (nextFrom === fromDate && nextTo === toDate)) return;
    setLoading(true);
    setError("");
  }

  const currency = overview?.currency ?? sessionCurrency();
  const today = isoDate(new Date());
  const showing = `Showing: ${fromDate} → ${toDate}${range === "24h" ? " (last 24 hours)" : ""}`;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-primary">Dashboard</h1>
          {access.showFilters ? <p className="mt-1 text-sm text-muted">{showing}</p> : null}
        </div>
        {access.showFilters ? (
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex min-w-0 overflow-hidden rounded-full border border-line">
              {(["24h", "7d", "10d", "30d"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => applyQuick(item)}
                  className={`h-8 min-w-0 flex-1 cursor-pointer px-2 text-xs font-semibold transition motion-reduce:transition-none sm:flex-none sm:px-3 ${
                    range === item ? "bg-primary text-on-primary" : "text-ink hover:bg-mint"
                  }`}
                >
                  {item === "24h" ? "24 Hours" : item === "7d" ? "7 Days" : item === "10d" ? "10 Days" : "30 Days"}
                </button>
              ))}
            </div>
            <div className={`flex h-8 min-w-0 items-center gap-2 rounded-full border px-3 ${range === "custom" ? "border-primary" : "border-line"}`}>
              <input
                type="date"
                max={today}
                value={fromDate}
                aria-label="From date"
                onChange={(event) => applyCustom(event.target.value, toDate)}
                className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none"
              />
              <span className="text-xs text-muted">→</span>
              <input
                type="date"
                max={today}
                value={toDate}
                aria-label="To date"
                onChange={(event) => applyCustom(fromDate, event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none"
              />
            </div>
          </div>
        ) : null}
      </header>

      {error && access.showFilters ? (
        <p className="rounded-[14px] border border-danger/60 bg-danger/10 px-[18px] py-3 text-sm text-danger">{error}</p>
      ) : null}

      {access.showKpi ? (
        <section
          className={`grid grid-cols-1 gap-4 min-[576px]:grid-cols-2 min-[992px]:grid-cols-3 min-[1400px]:grid-cols-4 ${
            loading ? "pointer-events-none opacity-55" : ""
          }`}
        >
          {access.showAdmin ? (
            <KpiCard label="Total Orders" value={formatCount(overview?.cards.totalOrders.value ?? 0)} trend={periodTrend(overview?.cards.totalOrders)} up={(overview?.cards.totalOrders.changePercent ?? 0) >= 0} />
          ) : null}
          {access.showRevenue ? (
            <KpiCard
              label="Total Revenue"
              value={formatMoney(overview?.cards.totalRevenue.value ?? 0, currency, 2)}
              trend={periodTrend(overview?.cards.totalRevenue)}
              up={(overview?.cards.totalRevenue.changePercent ?? 0) >= 0}
              accent
              action={<Link href="/reports" className={outlineButton}>View All</Link>}
            />
          ) : null}
          {access.showAdmin ? (
            <>
              <KpiCard label="Packages Sold" value={formatCount(overview?.cards.packagesSold.value ?? 0)} trend={shortTrend(overview?.cards.packagesSold)} up={(overview?.cards.packagesSold.changePercent ?? 0) >= 0} />
              <KpiCard label="eSIMs Sold" value={formatCount(overview?.cards.esimsSold.value ?? 0)} trend={shortTrend(overview?.cards.esimsSold)} up={(overview?.cards.esimsSold.changePercent ?? 0) >= 0} />
              <KpiCard label="pSIMs Sold" value={formatCount(overview?.cards.psimsSold.value ?? 0)} trend={shortTrend(overview?.cards.psimsSold)} up={(overview?.cards.psimsSold.changePercent ?? 0) >= 0} />
              <KpiCard label="Customers in Period" value={formatCount(overview?.cards.customersInPeriod.value ?? 0)} trend={`▲ ${formatCount(overview?.cards.customersInPeriod.newCustomers ?? 0)} new customers`} up />
            </>
          ) : null}
          {access.showWallet ? (
            <KpiCard
              label="🏦 Wallet Balance"
              value={formatMoney(balance, walletCode, 2)}
              wallet
              action={<Link href="/transactions" className={outlineButton}>Top-Up</Link>}
            />
          ) : null}
        </section>
      ) : null}

      {access.showAdmin ? (
        <>
          <TrendPanel
            points={overview?.trend ?? []}
            page={trendPage}
            currency={currency}
            loading={loading && !overview}
            fromDate={fromDate}
            toDate={toDate}
            onPage={setTrendPage}
          />
          <div className="grid min-w-0 grid-cols-1 gap-4 min-[1200px]:grid-cols-[1.6fr_1fr]">
            <Last24Panel last={overview?.last24 ?? null} currency={currency} />
            <SplitPanel split={overview?.split ?? null} />
          </div>
          <div className="grid grid-cols-1 gap-4 min-[1200px]:grid-cols-[2fr_1fr]">
            <PackagesPanel packages={overview?.packages ?? []} currency={currency} ready={Boolean(overview)} />
            <CustomersPanel customers={overview?.customers ?? null} types={overview?.orderTypes ?? null} />
          </div>
        </>
      ) : null}

      {access.showAncillaries ? <Ancillaries resellerId={partner.resellerId} agentId={partner.agentId} /> : null}
    </div>
  );
}

function permissions(role: string, access: FeatureAccess) {
  const allowed = (name: string) => role === "RESELLER_ADMIN" || hasPermission(access, name);
  const showAdmin = allowed("AdminDashboardMetrics");
  const showRevenue = allowed("TotalRevenue");
  const showWallet = allowed("WalletBalance");
  const showKpi = showAdmin || showRevenue || showWallet;
  const showAncillaries = allowed("YourAncillaries") || allowed("ActiveServices");
  return {
    showAdmin,
    showRevenue,
    showWallet,
    showKpi,
    showAncillaries,
    showFilters: showKpi || showAdmin,
    canLoad: showAdmin || showRevenue,
  };
}

function periodTrend(card: MetricCard | undefined) {
  return `${(card?.changePercent ?? 0) >= 0 ? "▲" : "▼"} ${percentLabel(card?.changePercent ?? 0)}% vs previous period`;
}

function shortTrend(card: MetricCard | undefined) {
  return `${(card?.changePercent ?? 0) >= 0 ? "▲" : "▼"} ${percentLabel(card?.changePercent ?? 0)}%`;
}

const outlineButton =
  "inline-flex h-8 items-center rounded-full border border-primary px-3 text-xs font-semibold text-primary transition hover:bg-mint motion-reduce:transition-none";

function KpiCard({
  label,
  value,
  trend,
  up = true,
  accent = false,
  wallet = false,
  action,
}: {
  label: string;
  value: string;
  trend?: string;
  up?: boolean;
  accent?: boolean;
  wallet?: boolean;
  action?: ReactNode;
}) {
  return (
    <article
      className={`flex min-h-[132px] flex-col rounded-[20px] border bg-surface px-5 pt-[18px] pb-4 shadow-[var(--shadow)] ${
        accent ? "border-primary" : "border-line"
      } ${wallet ? "shadow-[0_0_0_1px_var(--primary),0_12px_28px_color-mix(in_srgb,var(--primary)_22%,transparent)]" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted">{label}</p>
        {action}
      </div>
      <p className="mt-2 text-[30px] leading-none font-bold text-ink">{value}</p>
      {trend ? <p className={`mt-auto pt-3 text-xs font-semibold ${up ? "text-primary" : "text-danger"}`}>{trend}</p> : null}
    </article>
  );
}

function TrendPanel({
  points,
  page,
  currency,
  loading,
  fromDate,
  toDate,
  onPage,
}: {
  points: DashboardOverview["trend"];
  page: number;
  currency: MoneyCode;
  loading: boolean;
  fromDate: string;
  toDate: string;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(points.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = points.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const chart = buildTrend(visible);
  const [tip, setTip] = useState<{ x: number; y: number; date: string; orders: number; revenue: number } | null>(null);

  function showTip(event: MouseEvent, date: string, orders: number, revenue: number) {
    const host = (event.currentTarget as Element).closest("[data-trend]") as HTMLElement | null;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const limit = Math.max(rect.width - 90, 90);
    setTip({
      x: Math.min(Math.max(event.clientX - rect.left, Math.min(90, limit)), limit),
      y: Math.max(event.clientY - rect.top, 70),
      date,
      orders,
      revenue,
    });
  }

  function exportCsv() {
    if (!points.length) return;
    const header = `Date,Orders,Packages Sold,Revenue (${currency}),Revenue (USD)`;
    const rows = points.map((point) => `${point.date},${point.orders},${point.packagesSold},${point.revenue},${point.revenueUSD}`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-revenue-trend_${fromDate}_${toDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Orders & Revenue Trend</h2>
          <p className="mt-1 text-sm text-muted">Daily orders (bars) vs revenue (line) — selected period</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={!points.length} className={`${outlineButton} disabled:opacity-50`}>
          Export
        </button>
      </div>
      {loading ? <div className="mt-4 h-[260px]" /> : visible.length ? (
        <div className="relative mt-4" data-trend onMouseLeave={() => setTip(null)}>
          <svg viewBox="0 0 1000 260" preserveAspectRatio="none" className="h-[260px] w-full" role="img" aria-label="Daily orders and revenue trend chart">
            {chart.bars.map((bar) => (
              <rect
                key={bar.date}
                x={bar.x}
                y={bar.y}
                width={bar.w}
                height={bar.h}
                rx="6"
                className="cursor-pointer fill-[#7da934] transition hover:fill-[#c1e48a] motion-reduce:transition-none"
                onMouseEnter={(event) => showTip(event, bar.date, bar.orders, bar.revenue)}
                onMouseMove={(event) => showTip(event, bar.date, bar.orders, bar.revenue)}
              />
            ))}
            <path d={chart.line} fill="none" stroke="var(--primary)" strokeWidth="2" />
            {chart.dots.map((dot) => (
              <circle
                key={dot.date}
                cx={dot.cx}
                cy={dot.cy}
                r="4"
                fill="var(--primary)"
                stroke="var(--surface)"
                strokeWidth="2"
                className="cursor-pointer"
                onMouseEnter={(event) => showTip(event, dot.date, dot.orders, dot.revenue)}
                onMouseMove={(event) => showTip(event, dot.date, dot.orders, dot.revenue)}
              />
            ))}
          </svg>
          {tip ? (
            <div
              className="pointer-events-none absolute z-30 min-w-44 -translate-x-1/2 -translate-y-[calc(100%+16px)] rounded-xl border border-primary/40 bg-navy px-3.5 py-3 text-white shadow-lg"
              style={{ left: tip.x, top: tip.y }}
            >
              <p className="mb-2 text-xs font-bold tracking-wide text-primary uppercase">{shortDate(tip.date)}</p>
              <p className="flex items-center justify-between gap-4 text-xs"><span>Orders</span><strong>{formatCount(tip.orders)}</strong></p>
              <p className="mt-1 flex items-center justify-between gap-4 text-xs"><span>Revenue</span><strong>{formatMoney(tip.revenue, currency, 0)}</strong></p>
            </div>
          ) : null}
          <div className="mt-2 grid text-center text-[11px] text-muted" style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}>
            {visible.map((point) => <span key={point.date}>{shortDate(point.date)}</span>)}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7c6cf0]" />Orders</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary" />Revenue ({currency})</span>
            </div>
            {points.length > pageSize ? (
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{shortDate(visible[0]?.date || "")} – {shortDate(visible[visible.length - 1]?.date || "")}</span>
                <button type="button" aria-label="Previous 10 days" disabled={safePage === 0} onClick={() => onPage(safePage - 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line disabled:opacity-40">‹</button>
                <span>Page {safePage + 1} of {pages}</span>
                <button type="button" aria-label="Next 10 days" disabled={safePage >= pages - 1} onClick={() => onPage(safePage + 1)} className="grid h-8 w-8 place-items-center rounded-full border border-line disabled:opacity-40">›</button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No orders in this period yet. Change the date range to see the trend.</p>
      )}
    </section>
  );
}

function Last24Panel({ last, currency }: { last: DashboardOverview["last24"] | null; currency: MoneyCode }) {
  const stats = [
    ["Orders", formatCount(last?.orders ?? 0)],
    ["Revenue", formatMoney(last?.revenue ?? 0, currency, 0)],
    ["eSIMs Activated", formatCount(last?.esimsActivated ?? 0)],
    ["New Customers", formatCount(last?.newCustomers ?? 0)],
  ];
  return (
    <section className="min-w-0 rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-lg font-semibold text-ink">Last 24 Hours</h2>
      <p className="mt-1 text-sm text-muted">{last?.from || "—"} → {last?.to || "—"}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 min-[576px]:grid-cols-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-[14px] bg-soft px-4 py-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-lg font-semibold text-ink">{value}</p>
          </div>
        ))}
      </div>
      {last?.hourly.length ? (
        <div className="mt-5 min-w-0">
          <div className="flex h-[120px] min-w-0 items-end gap-1">
            {last.hourly.map((bar, index) => (
              <div key={`${bar.hour}-${index}`} className="flex h-full min-w-0 flex-1 items-end" title={`${bar.hour} — Orders: ${bar.orders}`}>
                <div className="w-full rounded-t rounded-b-sm bg-primary transition-[height] motion-reduce:transition-none" style={{ height: `${bar.heightPct}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex min-w-0 gap-1">
            {last.hourly.map((bar, index) => (
              <span key={`${bar.hour}-${index}`} className="min-w-0 flex-1 text-center text-[10.5px] text-muted" style={{ visibility: index % 4 === 0 ? "visible" : "hidden" }}>
                {bar.hour}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SplitPanel({ split }: { split: DashboardOverview["split"] | null }) {
  const share = split?.esimSharePercent ?? 0;
  const dash = (share / 100) * donutCircumference;
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-lg font-semibold text-ink">eSIM vs pSIM Split</h2>
      <p className="mt-1 text-sm text-muted">By units sold in period</p>
      <div className="relative mx-auto mt-4 w-[200px]">
        <svg viewBox="0 0 180 180" className="h-[200px] w-[200px]" role="img" aria-label="eSIM versus pSIM share donut">
          <circle cx="90" cy="90" r={donutRadius} fill="none" stroke="#4fc3f7" strokeWidth="22" />
          <circle
            cx="90"
            cy="90"
            r={donutRadius}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="22"
            strokeDasharray={`${dash} ${donutCircumference}`}
            transform="rotate(-90 90 90)"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-bold text-ink">{share}%</p>
            <p className="text-xs text-muted">eSIM share</p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs">
        <span className="text-primary">eSIM · {formatCount(split?.esimUnits ?? 0)}</span>
        <span className="text-[#4fc3f7]">pSIM · {formatCount(split?.psimUnits ?? 0)}</span>
      </div>
    </section>
  );
}

function PackagesPanel({
  packages,
  currency,
  ready,
}: {
  packages: DashboardOverview["packages"];
  currency: MoneyCode;
  ready: boolean;
}) {
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-lg font-semibold text-ink">Top 10 Sold Packages</h2>
      <p className="mt-1 text-sm text-muted">Ranked by units sold in selected period</p>
      {!ready || packages.length ? (
        <div className="mt-4 space-y-2 text-sm">
          <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] gap-3 px-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase min-[576px]:grid-cols-[2rem_minmax(0,1.4fr)_auto_auto_auto_minmax(5rem,1fr)]">
            <span>#</span><span>Package</span><span>Type</span>
            <span className="text-right">Units</span>
            <span className="hidden text-right min-[576px]:block">Revenue</span>
            <span className="hidden min-[576px]:block">Share</span>
          </div>
          {packages.map((item) => (
            <div key={`${item.rank}-${item.packageName}`} className="grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-1 min-[576px]:grid-cols-[2rem_minmax(0,1.4fr)_auto_auto_auto_minmax(5rem,1fr)]">
              <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">{item.rank}</span>
              <span className="truncate text-ink">{item.packageName}</span>
              <span className={`inline-flex justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${item.type === "pSIM" ? "bg-sky-100 text-sky-700" : "bg-mint text-primary"}`}>{item.type}</span>
              <span className="text-right text-ink">{formatCount(item.units)}</span>
              <span className="hidden text-right text-ink min-[576px]:block">{formatMoney(item.revenue, currency, 0)}</span>
              <span className="hidden items-center gap-2 min-[576px]:flex">
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-soft">
                  <span className="block h-full rounded-full bg-[linear-gradient(90deg,#7c6cf0,var(--primary))]" style={{ width: `${Math.min(Math.max(item.sharePercent, 0), 100)}%` }} />
                </span>
                <span className="text-xs text-muted">{item.sharePercent}%</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted">No packages sold in this period.</p>
      )}
    </section>
  );
}

function CustomersPanel({
  customers,
  types,
}: {
  customers: DashboardOverview["customers"] | null;
  types: DashboardOverview["orderTypes"] | null;
}) {
  const rows = [
    ["Total Customers", customers?.totalCustomers ?? 0],
    ["New Customers", customers?.newCustomers ?? 0],
    ["Repeat Buyers", customers?.repeatBuyers ?? 0],
  ] as const;
  return (
    <section className="rounded-[20px] border border-line bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-lg font-semibold text-ink">Customer Summary</h2>
      <p className="mt-1 text-sm text-muted">In selected period</p>
      <div className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-soft px-4 py-3">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-ink">{formatCount(value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
        <p className="flex items-center justify-between"><span className="text-muted">New orders</span><strong className="text-ink">{formatCount(types?.orders ?? 0)}</strong></p>
        <p className="flex items-center justify-between"><span className="text-muted">Top-ups</span><strong className="text-ink">{formatCount(types?.topups ?? 0)}</strong></p>
      </div>
    </section>
  );
}

function Ancillaries({ resellerId, agentId }: { resellerId: string; agentId: string }) {
  const [items, setItems] = useState<AncillaryItem[]>(() => ancillaryItems(null));
  const [busy, setBusy] = useState("");

  function load() {
    const query = new URLSearchParams({
      resource: "services",
      reseller_id: resellerId,
      agent_id: agentId,
    });
    return portalRequest<JsonRecord>(`/api/dashboard?${query.toString()}`)
      .then((payload) => setItems(ancillaryItems(payload)))
      .catch(() => setItems(ancillaryItems(null)));
  }

  useEffect(() => {
    let ignore = false;
    const query = new URLSearchParams({
      resource: "services",
      reseller_id: resellerId,
      agent_id: agentId,
    });
    portalRequest<JsonRecord>(`/api/dashboard?${query.toString()}`)
      .then((payload) => {
        if (!ignore) setItems(ancillaryItems(payload));
      })
      .catch(() => {
        if (!ignore) setItems(ancillaryItems(null));
      });
    return () => {
      ignore = true;
    };
  }, [agentId, resellerId]);

  async function toggle(item: AncillaryItem) {
    if (item.locked || busy) return;
    setBusy(item.serviceName);
    try {
      await portalRequest("/api/dashboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_name: item.serviceName,
          reseller_id: resellerId,
          status: !item.status,
        }),
      });
      await load();
    } catch {
      toast.error("Could not update this ancillary.");
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="rounded-[20px] border border-primary/50 bg-surface p-5 shadow-[var(--shadow)]">
      <h2 className="text-lg font-normal text-ink">Your Ancillaries</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 min-[576px]:grid-cols-2 min-[992px]:grid-cols-3 min-[1400px]:grid-cols-5">
        {items.map((item) => (
          <article key={item.serviceName} className="rounded-2xl border border-line bg-page p-4 text-center">
            <div className="flex h-[120px] items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" className="max-h-24 max-w-[120px] object-contain" />
            </div>
            <h3 className="mt-3 text-base font-semibold text-ink">{item.serviceName}</h3>
            <button
              type="button"
              aria-pressed={item.status}
              aria-label={`Toggle ${item.serviceName}`}
              disabled={item.locked || busy === item.serviceName}
              onClick={() => void toggle(item)}
              className={`relative mx-auto mt-3 h-9 w-[72px] rounded-full border ${
                item.status ? "border-primary" : "border-line"
              } ${item.locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
            >
              <span
                className={`absolute top-[3px] left-[3px] h-7 w-7 rounded-full transition-transform motion-reduce:transition-none ${
                  item.status ? "translate-x-9 bg-primary" : "bg-[#b6bdd1]"
                }`}
              />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
