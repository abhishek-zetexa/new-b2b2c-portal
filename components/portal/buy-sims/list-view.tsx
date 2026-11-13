"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePartner } from "@/components/shell/partner-context";
import {
  agentSession,
  clearTopup,
  destinationsFrom,
  downloadXlsx,
  isTopup,
  localListValidity,
  moneyAmount,
  plansFrom,
  checkoutIdFromAdd,
  checkoutPath,
  setCheckoutId,
  travelValidity,
  type ListTab,
  type PlanRow,
} from "@/lib/buy-sims";
import { notifyCart } from "@/lib/cart-bus";
import { portalRequest, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";
import { fieldClass, ghostButton, primaryButton, SupportNote, ViewSwitch } from "@/components/portal/buy-sims/shared";

const pageSizes = [10, 20, 50, 100];

export function ListView() {
  const partner = usePartner();
  const router = useRouter();
  const search = useSearchParams();
  const [topup, setTopup] = useState(false);
  const tab = (search.get("tab") === "local" ? "local" : "travel") as ListTab;
  const page = Math.max(1, Number(search.get("page") || 1));
  const pageSize = pageSizes.includes(Number(search.get("pageSize"))) ? Number(search.get("pageSize")) : 10;
  const [country, setCountry] = useState(search.get("country") || "");
  const [region, setRegion] = useState(search.get("region") || "");
  const [planType, setPlanType] = useState(search.get("plan") || "");
  const [validity, setValidity] = useState(search.get("validity") || "");
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [currency, setCurrency] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [regions, setRegions] = useState<{ id: string; name: string }[]>([]);
  const [pending, setPending] = useState("");
  const [terms, setTerms] = useState<PlanRow | null>(null);
  const [summary, setSummary] = useState("");
  const requestId = useRef(0);
  const localCountries = useRef<{ id: string; name: string }[] | null>(null);

  useEffect(() => {
    sessionStorage.setItem("buy-sims-view", "list");
    const timer = window.setTimeout(() => setTopup(isTopup()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function writeUrl(next: Partial<{ tab: ListTab; page: number; pageSize: number; country: string; region: string; plan: string; validity: string }>) {
    const params = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    params.set("tab", nextTab);
    params.set("page", String(next.page ?? page));
    params.set("pageSize", String(next.pageSize ?? pageSize));
    const values = {
      country: next.country ?? country,
      region: nextTab === "travel" ? next.region ?? region : "",
      plan: next.plan ?? planType,
      validity: next.validity ?? validity,
    };
    for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
    router.replace(`/buy-sims/list?${params.toString()}`);
  }

  useEffect(() => {
    if (!partner.ready) return;
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
    }, 0);
    const agent = agentSession();
    const resellerId = agent.resellerId || partner.resellerId;
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (resellerId) params.set("reseller_id", resellerId);
    if (tab === "local" && !topup) {
      params.set("resource", "local-plans");
      if (country) {
        params.set("filterby", "Country");
        params.set("country_code", country);
      }
      const days = validity.split("-").filter(Boolean).pop();
      if (days) params.set("validity_days", days);
    } else {
      const [min, max] = validity.split("-");
      const useRegion = Boolean(region);
      const code = useRegion ? "" : country || (topup ? sessionStorage.getItem("topupCountryCode") || "" : "");
      params.set("resource", topup ? "topup-plans" : "travel-plans");
      if (useRegion) {
        params.set("filterby", "Region");
        params.set("region_name", region);
      } else if (code) {
        params.set("filterby", "Country");
        params.set("country_code", code);
      }
      if (planType === "data") params.set("plan_name", "1");
      if (planType === "data_voice") params.set("plan_name", "2");
      if (min) params.set("min_validity", min);
      if (max) params.set("max_validity", max);
      if (topup) {
        const iccid = sessionStorage.getItem("topupIccid") || "";
        if (iccid) params.set("iccid", iccid);
      }
    }
    const path = `/api/buy-sims?${params.toString()}`;
    portalRequest<JsonRecord>(path)
      .then((payload) => {
        if (id !== requestId.current) return;
        const parsed = plansFrom(payload);
        setRows(parsed.rows);
        setCurrency(parsed.currency);
        setTotalPages(parsed.totalPages);
        setError("");
        setLoading(false);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setRows([]);
        setError(requestErrorMessage(err, "We couldn’t load plans right now. Please try again."));
        setLoading(false);
      });
    return () => window.clearTimeout(timer);
  }, [partner.ready, partner.resellerId, tab, page, pageSize, country, region, planType, validity, topup, retry]);

  useEffect(() => {
    if (!partner.ready) return;
    const loadCountries = tab === "local"
      ? localCountries.current
        ? Promise.resolve(localCountries.current)
        : readLocalCountries().then((list) => {
            localCountries.current = list;
            return list;
          })
      : portalRequest<JsonRecord>("/api/buy-sims?resource=countries&page=1&page_size=250").then((payload) => destinationsFrom(payload, "country").map((item) => ({ id: item.id, name: item.name })));
    void loadCountries.then(setCountries).catch(() => setCountries([]));
    if (tab === "travel") {
      void portalRequest<JsonRecord>("/api/buy-sims?resource=regions")
        .then((payload) => setRegions(destinationsFrom(payload, "region").map((item) => ({ id: item.name, name: item.name }))))
        .catch(() => setRegions([]));
    }
  }, [partner.ready, tab]);

  async function addData(row: PlanRow) {
    if (pending) return;
    setPending(row.id);
    try {
      const existing = sessionStorage.getItem("CheckoutId");
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "cart-add",
          package_id: row.id,
          quantity: 1,
          sim_type: "esim",
          ...(existing ? { checkout_id: existing } : {}),
        }),
      });
      const id = text(result.checkout_id || (result.data && typeof result.data === "object" ? (result.data as JsonRecord).checkout_id : ""));
      if (id) setCheckoutId(id);
      notifyCart({ open: true, refresh: true });
      toast.success("Added to cart.");
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not add this plan to the cart."));
    } finally {
      setPending("");
    }
  }

  async function buyVoice(row: PlanRow) {
    if (pending) return;
    const existing = sessionStorage.getItem("CheckoutId");
    if (existing && !window.confirm("Buy Now will remove your current cart items.")) return;
    setPending(row.id);
    try {
      if (existing) {
        const cart = await portalRequest<JsonRecord>(`/api/buy-sims?resource=cart&checkout_id=${encodeURIComponent(existing)}`);
        const lines = Array.isArray(cart.data) ? cart.data as JsonRecord[] : [];
        for (const line of lines) {
          await portalRequest("/api/buy-sims", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resource: "cart-delete", checkout_id: existing, package_id: text(line.package_id) }),
          });
        }
      }
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "cart-add", package_id: row.id, quantity: 1, sim_type: "esim" }),
      });
      const id = checkoutIdFromAdd(result);
      if (id) setCheckoutId(id);
      router.push(checkoutPath(id));
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not start checkout."));
    } finally {
      setPending("");
    }
  }

  async function startTopup(row: PlanRow) {
    if (pending) return;
    setPending(row.id);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "topup-summary", package_id: row.id, iccid: sessionStorage.getItem("topupIccid") || "" }),
      });
      setSummary(text(result.message) || "Top-up summary is ready.");
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not load the top-up summary."));
    } finally {
      setPending("");
    }
  }

  const validityOptions = tab === "local" ? localListValidity : travelValidity;
  const showInfo = rows.some((row) => row.category === 2 || row.voicePlan || Boolean(row.description));
  const countryName = countries.find((item) => item.id === country)?.name || country;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Buy SIMs</h1>
        {topup ? (
          <button type="button" onClick={() => { clearTopup(); router.push("/buy-sims"); }} className={ghostButton}>Cancel top-up</button>
        ) : <ViewSwitch active="list" />}
      </header>
      {topup ? null : (
        <div role="tablist" className="flex gap-2">
          {(["travel", "local"] as const).map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => { setCountry(""); setRegion(""); setPlanType(""); setValidity(""); writeUrl({ tab: item, page: 1, country: "", region: "", plan: "", validity: "" }); }} className={`h-9 cursor-pointer rounded-full px-4 text-sm font-semibold ${tab === item ? "bg-mint text-primary" : "border border-line bg-surface text-muted"}`}>
              {item === "travel" ? "Travel SIM" : "Local SIM"}
            </button>
          ))}
        </div>
      )}
      <div className="sticky top-0 z-20 flex flex-wrap gap-2 rounded-3xl border border-line bg-surface/95 p-3 backdrop-blur">
        <FilterSelect label="Country" value={country} options={countries} onChange={(value) => { setCountry(value); writeUrl({ country: value, page: 1 }); }} />
        {tab === "travel" ? <FilterSelect label="Region" value={region} options={regions} onChange={(value) => { setRegion(value); writeUrl({ region: value, page: 1 }); }} /> : null}
        {tab === "travel" && !topup ? (
          <label className="min-w-36 text-xs text-muted">Plan type
            <select value={planType} onChange={(event) => { setPlanType(event.target.value); writeUrl({ plan: event.target.value, page: 1 }); }} className={`${fieldClass} mt-1`}>
              <option value="">Any</option>
              <option value="data">Data Only</option>
              <option value="data_voice">Data & Voice</option>
            </select>
          </label>
        ) : null}
        <label className="min-w-36 text-xs text-muted">Validity
          <select value={validity} onChange={(event) => { setValidity(event.target.value); writeUrl({ validity: event.target.value, page: 1 }); }} className={`${fieldClass} mt-1`}>
            <option value="">Any</option>
            {validityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => { setCountry(""); setRegion(""); setPlanType(""); setValidity(""); writeUrl({ page: 1, country: "", region: "", plan: "", validity: "" }); }} className={`${ghostButton} self-end`}>Clear</button>
        <button type="button" disabled={!rows.length} onClick={() => downloadXlsx("plans.xlsx", tab === "local" ? ["Package Name", "Package ID", "Country", "Price", "Currency", "Data", "Speed", "Voice Mins", "SMS", "Validity"] : ["Name", "Price", "Data", "Speed", "Voice Mins", "SMS", "Validity", "Network"], rows.map((row) => tab === "local" ? [row.displayName || row.name, row.id, countryName, row.price.toFixed(2), row.currency || currency, row.dataUnlimited ? "Unlimited" : row.data, row.coverage || row.speed, row.unlimitedTalk ? "Unlimited" : row.voice, row.unlimitedText ? "Unlimited" : row.sms, row.validity] : [row.name, moneyAmount(row.price, row.currency || currency), row.data, row.coverage || row.speed, row.unlimitedTalk ? "Unlimited" : row.voice, row.unlimitedText ? "Unlimited" : row.sms, row.validity, row.network]))} className={`${ghostButton} self-end`}>Export</button>
      </div>
      <p className="sr-only" aria-live="polite">{loading ? "Loading plans" : `${rows.length} plans`}</p>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-2xl bg-surface" />)}</div>
      ) : error ? (
        <p className="rounded-2xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="font-semibold text-primary">Try again</button></p>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">No plans match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line bg-soft/85 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              <tr>
                {[...(tab === "local" ? ["Package Name", "Price", "Data", "Speed", "Voice Mins", "SMS", "Validity"] : ["Name", "Price", "Data", "Speed", "Voice Mins", "SMS", "Validity", "Network"]), ...(showInfo ? ["Info"] : []), "Cart"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.id} className={pending === row.id ? "opacity-60" : ""}>
                  <td className="px-3 py-3 font-medium text-ink">{tab === "local" ? row.displayName || row.name : row.name}</td>
                  <td className="px-3 py-3 tabular-nums">{moneyAmount(row.price, row.currency || currency)}</td>
                  <td className="px-3 py-3">{tab === "local" && row.dataUnlimited ? "Unlimited" : row.data || "—"}</td>
                  <td className="px-3 py-3">{row.coverage || row.speed || "—"}</td>
                  <td className="px-3 py-3">{row.unlimitedTalk ? "Unlimited" : row.voice || "—"}</td>
                  <td className="px-3 py-3">{row.unlimitedText ? "Unlimited" : row.sms || "—"}</td>
                  <td className="px-3 py-3">{row.validity || "—"}</td>
                  {tab === "local" ? null : <td className="px-3 py-3">{row.network || "—"}</td>}
                  {showInfo ? <td className="px-3 py-3">{row.category === 2 || row.voicePlan || row.description ? <button type="button" onClick={() => setTerms(row)} className="text-primary">Info</button> : null}</td> : null}
                  <td className="px-3 py-3">
                    {topup ? <button type="button" disabled={pending === row.id} onClick={() => void startTopup(row)} className={primaryButton}>Top up</button> : tab === "local" ? <Link href={`/checkout/mvno/${encodeURIComponent(row.id)}`} className={primaryButton}>Buy Now</Link> : row.category === 2 ? <button type="button" disabled={pending === row.id} onClick={() => void buyVoice(row)} className={primaryButton}>Buy Now</button> : <button type="button" disabled={pending === row.id} onClick={() => void addData(row)} className={primaryButton}>Add</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <label>Rows
          <select value={pageSize} onChange={(event) => writeUrl({ pageSize: Number(event.target.value), page: 1 })} className={`${fieldClass} ml-2 w-24`}>
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1} onClick={() => writeUrl({ page: page - 1 })} className="h-9 rounded-full border border-line px-3 disabled:opacity-40">Previous</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => writeUrl({ page: page + 1 })} className="h-9 rounded-full border border-line px-3 disabled:opacity-40">Next</button>
        </div>
      </div>
      <SupportNote />
      <Dialog open={Boolean(terms)} onOpenChange={(open) => { if (!open) setTerms(null); }}>
        <DialogHeader><DialogTitle>Info</DialogTitle></DialogHeader>
        {terms ? <p className="text-sm whitespace-pre-line text-ink">{terms.description || "No details for this plan."}</p> : null}
      </Dialog>
      <Dialog open={Boolean(summary)} onOpenChange={(open) => { if (!open) setSummary(""); }}>
        <DialogHeader><DialogTitle>Top-up summary</DialogTitle></DialogHeader>
        <p className="text-sm text-ink">{summary}</p>
      </Dialog>
    </div>
  );
}

function readLocalCountries() {
  const cached = sessionStorage.getItem("mvno-countries");
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { id: string; name: string }[];
      if (Array.isArray(parsed)) return Promise.resolve(parsed);
    } catch {
      sessionStorage.removeItem("mvno-countries");
    }
  }
  return portalRequest<JsonRecord>("/api/buy-sims?resource=local-countries").then((payload) => {
    const list = destinationsFrom(payload, "local").map((item) => ({ id: item.id, name: item.name }));
    sessionStorage.setItem("mvno-countries", JSON.stringify(list));
    return list;
  });
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: { id: string; name: string }[]; onChange: (value: string) => void }) {
  const [search, setSearch] = useState("");
  const visible = options.filter((option) => option.name.toLowerCase().includes(search.toLowerCase())).slice(0, 80);
  return (
    <label className="min-w-40 flex-1 text-xs text-muted">{label}
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${label.toLowerCase()}`} className={`${fieldClass} mt-1`} />
      <select value={value} onChange={(event) => onChange(event.target.value)} className={`${fieldClass} mt-1`}>
        <option value="">Any</option>
        {visible.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
      </select>
    </label>
  );
}
