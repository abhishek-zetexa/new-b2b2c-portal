"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentPanel } from "@/components/wallet/payment-panel";
import { usePartner } from "@/components/shell/partner-context";
import { hasPermission } from "@/lib/auth-session";
import { asList, asRecord, money, num, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";
import { formatLedgerTime, formatUtcStamp } from "@/lib/portal-time";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/ui/wave-loader";

type Ledger = "wallet" | "orders" | "cashback";
type Gate = { required: boolean; currency: "INR" | "USD" | null };
type Method = JsonRecord;

const pageSizes = [5, 10, 25, 50, 100];
const denied = "Access Denied. You dont have permission to view this page. Please contact the admin for access.";

export function WalletView() {
  const partner = usePartner();
  const [gate, setGate] = useState<Gate | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    portalRequest<Gate>("/api/finance/wallet?view=initial")
      .then((result) => {
        if (result.required && result.currency) sessionStorage.setItem("reseller-currency", result.currency);
        setGate(result);
      })
      .catch((err: Error & { status?: number }) => setError(err.status === 403 ? denied : err.message));
  }, []);

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!gate || !partner.ready) return <p className="text-sm text-muted">Checking your wallet…</p>;
  if (gate.required && gate.currency) return <FirstTopUp currency={gate.currency} />;
  return <WalletLedger />;
}

function FirstTopUp({ currency }: { currency: "INR" | "USD" }) {
  const [methods, setMethods] = useState<Method[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [selected, setSelected] = useState<Method | null>(null);
  const minimum = currency === "INR" ? 25000 : 1000;
  const symbol = currency === "INR" ? "₹" : "$";
  const formatted = currency === "INR" ? "₹25,000" : "$1,000";

  useEffect(() => {
    portalRequest<JsonRecord>("/api/finance/payments?resource=methods")
      .then((res) => {
        const all = asList(res.data);
        const filtered = all.filter((method) => {
          const name = `${text(method.name)} ${text(method.fe_name)}`.toLowerCase();
          return currency === "INR" ? /razor|upi|bank/.test(name) : /stripe|bank|card/.test(name);
        });
        const next = filtered.length ? filtered : all;
        setMethods(next);
        setStatus(next.length ? "ready" : "empty");
      })
      .catch(() => setStatus("error"));
  }, [currency]);

  if (selected) {
    return (
      <PaymentPanel
        embedded
        methodName={text(selected.fe_name)}
        methodId={text(selected.id)}
        initialAmount={minimum}
        currency={currency}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 shadow-[var(--shadow)]">
      <p className="text-sm text-muted">Wallet balance {symbol}0.00</p>
      <h1 className="mt-2 text-3xl font-semibold">Top up your wallet</h1>
      <p className="mt-3 text-sm leading-6">
        Your account is approved! Complete your first mandatory top-up of <strong>{formatted}</strong> to start selling.
      </p>
      <h2 className="mt-6 text-lg font-semibold">Recharge Options</h2>
      {status === "loading" ? <p className="mt-3 text-sm text-muted">Loading payment options…</p> : null}
      {status === "error" ? <p className="mt-3 text-sm text-danger">Payment options could not be loaded.</p> : null}
      {status === "empty" ? <p className="mt-3 text-sm text-muted">Payment options are unavailable right now.</p> : null}
      <div className="mt-4 grid gap-3">
        {methods.map((method) => (
          <button key={text(method.id)} type="button" onClick={() => setSelected(method)} className="flex items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left">
            {text(method.link) ? <img src={text(method.link)} alt="" className="h-8 w-8 object-contain" /> : null}
            <span className="font-medium">{text(method.name)}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function WalletLedger() {
  const partner = usePartner();
  const router = useRouter();
  const access = partner.featureAccess;
  const canWallet = hasPermission(access, "WalletTransaction");
  const canOrders = hasPermission(access, "OrderTransaction");
  const canCashback = partner.cashbackEligible;
  const canRecharge = hasPermission(access, "MakeWalletRecharge");
  const [ledger, setLedger] = useState<Ledger>(canWallet ? "wallet" : canOrders ? "orders" : "cashback");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [rows, setRows] = useState<JsonRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState("");
  const [offers, setOffers] = useState<JsonRecord[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function openLedger(next: Ledger) {
    setLedger(next);
    setPage(0);
    setPageSize(5);
  }

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError("");
    const request =
      ledger === "cashback"
        ? portalRequest<JsonRecord>(`/api/finance/cashback?view=history&page=${page + 1}&page_size=${pageSize}`)
        : portalRequest<JsonRecord>(`/api/finance/wallet?view=${ledger}&page=${page + 1}&page_size=${pageSize}`);
    request
      .then((res) => {
        if (ignore) return;
        setRows(asList(res.data));
        const details = asRecord(res.wallet_details);
        if (details) {
          setBalance(num(details.balance));
          setCurrency(text(details.currency));
        }
        setTotal(num(asRecord(res.pagination)?.total_records ?? res.total_records));
      })
      .catch((err: Error & { status?: number }) => {
        if (!ignore) setError(err.status === 403 ? denied : err.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [ledger, page, pageSize]);

  useEffect(() => {
    if (!currency || !canCashback) return;
    portalRequest<JsonRecord>(`/api/finance/cashback?currency=${encodeURIComponent(currency)}`)
      .then((res) => setOffers(asList(res.data)))
      .catch(() => setOffers([]));
  }, [currency, canCashback]);

  useEffect(() => {
    if (!canRecharge) return;
    portalRequest<JsonRecord>("/api/finance/payments?resource=methods")
      .then((res) => setMethods(asList(res.data)))
      .catch(() => setMethods([]));
  }, [canRecharge]);

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const symbol = currency.toUpperCase().includes("INR") || currency === "₹" ? "₹" : "$";

  return (
    <div className="mx-auto grid min-w-0 max-w-6xl gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-6">
        <section className="rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]">
          <p className="text-sm text-muted">Your Wallet Balance</p>
          <p className="mt-2 text-3xl font-semibold">{balance === null ? "—" : `${currency} ${balance.toFixed(2)}`}</p>
          <p className="mt-3 text-sm">{symbol === "₹" ? "Minimum wallet recharge amount is ₹25,000." : "Minimum wallet recharge amount is $1,000 ."}</p>
        </section>

        {canCashback && offers.length ? (
          <section className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="text-lg font-semibold">Revenue Cashback Rewards</h2>
            <p className="mt-1 text-sm text-muted">Earn cashback rewards based on your total revenue generated from bundle sales.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {offers.map((offer, index) => (
                <article key={text(offer.id) || index} className="rounded-2xl border border-line p-4">
                  <p className="font-semibold">Generate {symbol}{Math.trunc(num(offer.revenue_threshold))} Revenue</p>
                  <p className="mt-1 text-sm text-muted">Unlock cashback rewards based on your reseller performance.</p>
                  <p className="mt-2 text-lg font-semibold">{text(offer.cashback_percentage)}%</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-6">
          <Tabs value={ledger} onValueChange={(value) => openLedger(value as Ledger)}>
            <TabsList>
              {canWallet ? <TabsTrigger value="wallet">Wallet Transactions</TabsTrigger> : null}
              {canOrders ? <TabsTrigger value="orders">Orders Transactions</TabsTrigger> : null}
              {canCashback ? <TabsTrigger value="cashback">Cashback History</TabsTrigger> : null}
            </TabsList>
          </Tabs>
          {loading ? <PageLoader className="min-h-40" /> : error ? <p className="mt-4 text-sm text-danger">{error}</p> : rows.length === 0 ? <p className="mt-6 text-sm">No Records</p> : (
            <>
            <div className="mt-4 space-y-3 md:hidden">
              {rows.map((row, index) => <LedgerCard key={text(row.request_id || row.order_id || row.id) || index} ledger={ledger} row={row} />)}
            </div>
            <div className="mt-4 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] border-separate border-spacing-0 text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  {ledger === "wallet" ? <tr>{["Order Id", "Created on", "Order value", "Transaction Type", "Transaction Status"].map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-medium">{column}</th>)}</tr> : null}
                  {ledger === "orders" ? <tr>{["Order Id", "Ordered On", "Previous Value", "Order Value", "Transaction Type", "Current Balance"].map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-medium">{column}</th>)}</tr> : null}
                  {ledger === "cashback" ? <tr>{["eSIM Orders", "Addon Orders", "eSIM Revenue", "Addon Revenue", "Total Revenue", "Cashback %", "Cashback Amount", "CASH BACK DATE"].map((column) => <th key={column} className="whitespace-nowrap px-3 py-3 font-medium">{column}</th>)}</tr> : null}
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={text(row.request_id || row.order_id || row.id) || index} className="border-t border-line">
                      {ledger === "wallet" ? (
                        <>
                          <td className="max-w-56 break-all px-3 py-3">{text(row.request_id)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{formatLedgerTime(row.created_on, true)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{num(row.amount).toFixed(2)} {text(row.currency)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{text(row.transaction_type)}</td>
                          <td className="px-3 py-3"><StatusBadge status={text(row.transaction_status)} /></td>
                        </>
                      ) : null}
                      {ledger === "orders" ? (
                        <>
                          <td className="max-w-56 break-all px-3 py-3">{text(row.order_id)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{formatLedgerTime(row.created_on, false)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{text(row.previous_balance)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{text(row.amount)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{text(row.transaction_type)}</td>
                          <td className="whitespace-nowrap px-3 py-3">{text(row.balance)}</td>
                        </>
                      ) : null}
                      {ledger === "cashback" ? (
                        <>
                          <td className="py-3 pr-3">{text(row.total_esim_orders)}</td>
                          <td className="py-3 pr-3">{text(row.total_addon_orders)}</td>
                          <td className="py-3 pr-3">{money(num(row.esim_revenue), text(row.currency))}</td>
                          <td className="py-3 pr-3">{money(num(row.addon_revenue), text(row.currency))}</td>
                          <td className="py-3 pr-3">{money(num(row.total_revenue), text(row.currency))}</td>
                          <td className="py-3 pr-3">{text(row.cashback_percentage)}</td>
                          <td className="py-3 pr-3">{money(num(row.cashback_amount), text(row.currency))}</td>
                          <td className="py-3">{formatUtcStamp(row.created_at)}</td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="field h-10 w-auto py-0">
              {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 0} onClick={() => setPage((current) => current - 1)} className="h-8 rounded-xl border border-line px-3 disabled:opacity-40">Previous</button>
              <span>{page + 1} / {pages}</span>
              <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((current) => current + 1)} className="h-8 rounded-xl border border-line px-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        </section>
      </div>

      {canRecharge ? (
        <aside className="h-fit min-w-0 rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)] xl:sticky xl:top-24">
          <h2 className="font-semibold">Recharge Options</h2>
          <div className="mt-4 space-y-2">
            {methods.map((method) => (
              <button key={text(method.id)} type="button" onClick={() => router.push(`/transactions/payment/${text(method.fe_name)}/${text(method.id)}`)} className="flex w-full items-center gap-3 rounded-2xl border border-line px-3 py-3 text-left">
                {text(method.link) ? <img src={text(method.link)} alt="" className="h-8 w-8 object-contain" /> : null}
                <span>{text(method.name)}</span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

function LedgerCard({ ledger, row }: { ledger: Ledger; row: JsonRecord }) {
  const fields = ledger === "wallet"
    ? [["Order Id", text(row.request_id)], ["Created on", formatLedgerTime(row.created_on, true)], ["Order value", `${num(row.amount).toFixed(2)} ${text(row.currency)}`], ["Transaction Type", text(row.transaction_type)]]
    : ledger === "orders"
      ? [["Order Id", text(row.order_id)], ["Ordered On", formatLedgerTime(row.created_on, false)], ["Previous Value", text(row.previous_balance)], ["Order Value", text(row.amount)], ["Transaction Type", text(row.transaction_type)], ["Current Balance", text(row.balance)]]
      : [["eSIM Orders", text(row.total_esim_orders)], ["Addon Orders", text(row.total_addon_orders)], ["eSIM Revenue", money(num(row.esim_revenue), text(row.currency))], ["Addon Revenue", money(num(row.addon_revenue), text(row.currency))], ["Total Revenue", money(num(row.total_revenue), text(row.currency))], ["Cashback %", text(row.cashback_percentage)], ["Cashback Amount", money(num(row.cashback_amount), text(row.currency))], ["CASH BACK DATE", formatUtcStamp(row.created_at)]];
  return (
    <article className="space-y-2 rounded-2xl border border-line p-4">
      {fields.map(([label, value]) => (
        <div key={label} className="flex items-start justify-between gap-4 text-sm">
          <span className="text-muted">{label}</span>
          <span className="max-w-[60%] break-all text-right">{value}</span>
        </div>
      ))}
      {ledger === "wallet" ? <div className="flex justify-end"><StatusBadge status={text(row.transaction_status)} /></div> : null}
    </article>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "SUCCESS") return <Badge variant="success">{status}</Badge>;
  if (status === "PENDING") return <Badge variant="danger">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
