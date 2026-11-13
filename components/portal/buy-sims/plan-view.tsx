"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { usePartner } from "@/components/shell/partner-context";
import {
  checkoutId,
  checkoutIdFromAdd,
  checkoutPath,
  dataValidity,
  inrPrices,
  isTopup,
  localPlanValidity,
  moneyAmount,
  plansFrom,
  usdPrices,
  readSession,
  setCheckoutId,
  voiceTerms,
  type CheckoutView,
  type PlanKind,
  type PlanRow,
  type PlanTab,
} from "@/lib/buy-sims";
import { cartEvent, notifyCart, type CartNotice } from "@/lib/cart-bus";
import { brandsWithDevices } from "@/lib/device-brands";
import { asList, asRecord, PortalRequestError, portalRequest, requestErrorMessage, text, type JsonRecord } from "@/lib/portal-fetch";
import { fieldClass, ghostButton, primaryButton } from "@/components/portal/buy-sims/shared";

export function PlanView({ kind, code }: { kind: PlanKind; code: string }) {
  const partner = usePartner();
  const router = useRouter();
  const [name, setName] = useState(decodeURIComponent(code));
  const [topup, setTopup] = useState(false);
  const initialTab: PlanTab = kind === "local" ? "local" : "data";
  const [tab, setTab] = useState<PlanTab>(initialTab);
  const [validity, setValidity] = useState<number | null>(null);
  const [planType, setPlanType] = useState("");
  const [priceKey, setPriceKey] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reload, setReload] = useState(0);
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [currency, setCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState("");
  const [quantities, setQuantities] = useState<Record<string, { qty: number; lineId: string }>>({});
  const [hoverFup, setHoverFup] = useState("");
  const [terms, setTerms] = useState<PlanRow | null>(null);
  const [summary, setSummary] = useState("");
  const [hoverInfo, setHoverInfo] = useState("");
  const [regions, setRegions] = useState<{ name: string }[]>([]);
  const [countries, setCountries] = useState<{ name: string; iso: string }[]>([]);
  const [destinationQuery, setDestinationQuery] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const storedName = readSession("selectedCountry");
    const titleName = storedName || decodeURIComponent(code);
    const title = kind === "region"
      ? `Buy SIMs | Region eSIM | ${titleName}`
      : kind === "local"
        ? `Buy SIMs | Local Plan | ${titleName}`
        : `Buy SIMs | Local eSIM | ${titleName}`;
    document.title = title;
    const timer = window.setTimeout(() => {
      setTopup(isTopup());
      if (storedName) setName(storedName);
      if (kind === "country") {
        const storedTab = sessionStorage.getItem("buy-sims-plan-tab");
        sessionStorage.removeItem("buy-sims-plan-tab");
        if (storedTab === "voice" || storedTab === "data") setTab(storedTab);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [kind, code]);

  const tabs = useMemo(() => {
    const items: { id: PlanTab; label: string }[] = [{ id: "data", label: "Data" }];
    if (partner.voiceSmsPlans) items.push({ id: "voice", label: "Data/Calls/SMS" });
    if ((kind === "country" || kind === "local") && partner.mvnoAccess) items.push({ id: "local", label: "Local Plan" });
    return items;
  }, [partner.mvnoAccess, partner.voiceSmsPlans, kind]);

  useEffect(() => {
    if (!partner.ready) return;
    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
    }, 0);
    const localFlow = tab === "local" || kind === "local";
    const resellerId = partner.resellerId;
    const params = new URLSearchParams();
    if (localFlow) {
      params.set("resource", "local-package");
      params.set("filterby", "Country");
      params.set("country_code", code);
      params.set("plan_name", "3");
      params.set("currency", sessionStorage.getItem("reseller-currency") || "USD");
      if (validity != null) params.set("validity_days", String(validity));
    } else {
      params.set("resource", "packages");
      params.set("filterby", kind === "region" ? "Region" : "Country");
      params.set(kind === "region" ? "region_name" : "country_code", code);
      params.set("plan_name", tab === "voice" ? "2" : "1");
      const range = dataValidity.find((item) => item.min === validity);
      if (range) {
        params.set("min_validity", String(range.min));
        params.set("max_validity", String(range.max));
      }
      if (planType) params.set("plan_type", planType);
      const prices = currency === "INR" ? inrPrices : currency === "USD" ? usdPrices : [];
      const price = prices.find((item) => item.label === priceKey);
      if (price) {
        params.set("min_price", price.min);
        if (price.max) params.set("max_price", price.max);
      }
    }
    if (resellerId) params.set("reseller_id", resellerId);
    const path = `/api/buy-sims?${params.toString()}`;
    let retryTimer = 0;
    function load(attempt: number) {
      portalRequest<JsonRecord>(path)
        .then((payload) => {
          if (id !== requestId.current) return;
          if (payload.success === false) throw new Error(text(payload.message) || "No plans match your selected filters.");
          const parsed = plansFrom(payload);
          const chips = parsed.currency === "INR" ? inrPrices : parsed.currency === "USD" ? usdPrices : [];
          if (priceKey && !chips.some((item) => item.label === priceKey)) setPriceKey("");
          setRows(parsed.rows);
          setCurrency(parsed.currency);
          setError("");
          setLoading(false);
          notifyCart({ refresh: true });
        })
        .catch((err) => {
          if (id !== requestId.current) return;
          if (attempt < 1 && err instanceof PortalRequestError && err.status >= 500) {
            retryTimer = window.setTimeout(() => load(attempt + 1), 2500);
            return;
          }
          setRows([]);
          const message = localFlow ? localPlanError(err, name) : requestErrorMessage(err, "Could not load plans.");
          if (localFlow) toast.error(message);
          setError(message);
          setLoading(false);
        });
    }
    load(0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [partner.ready, partner.resellerId, kind, code, tab, validity, planType, priceKey, reload]);

  function changeTab(next: PlanTab) {
    if (next === "local" && kind === "country") {
      sessionStorage.setItem("selectedCountry", name);
      router.push(`/buy-sims/local/${encodeURIComponent(code)}`);
      return;
    }
    if (kind === "local" && next !== "local") {
      sessionStorage.setItem("selectedCountry", name);
      sessionStorage.setItem("buy-sims-plan-tab", next);
      router.push(`/buy-sims/country/${encodeURIComponent(code)}`);
      return;
    }
    setTab(next);
    setValidity(null);
    setPlanType("");
    setPriceKey("");
    setFiltersOpen(false);
    notifyCart({ close: true });
  }

  useEffect(() => {
    function onCart(event: Event) {
      const detail = (event as CustomEvent<CartNotice>).detail;
      if (!detail?.lines) return;
      const next: Record<string, { qty: number; lineId: string }> = {};
      for (const line of detail.lines) next[line.id] = { qty: line.quantity, lineId: line.lineId };
      setQuantities(next);
    }
    window.addEventListener(cartEvent, onCart);
    return () => window.removeEventListener(cartEvent, onCart);
  }, []);

  async function add(row: PlanRow) {
    if (pending) return;
    setPending(row.id);
    const previous = quantities[row.id];
    setQuantities((current) => ({ ...current, [row.id]: { qty: (current[row.id]?.qty ?? 0) + 1, lineId: current[row.id]?.lineId || "" } }));
    try {
      const existing = checkoutId();
      if (previous) {
        await portalRequest("/api/buy-sims", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "cart-update", checkout_id: existing, package_id: row.id, sim_type: "esim", quantity: previous.qty + 1, checkout_line_id: previous.lineId }),
        });
      } else {
        const result = await portalRequest<JsonRecord>("/api/buy-sims", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "cart-add", package_id: row.id, quantity: 1, sim_type: "esim", ...(existing ? { checkout_id: existing } : {}) }),
        });
        const id = checkoutIdFromAdd(result);
        if (id) setCheckoutId(id);
      }
      notifyCart({ open: true, refresh: true });
    } catch (err) {
      setQuantities((current) => {
        const next = { ...current };
        if (previous) next[row.id] = previous;
        else delete next[row.id];
        return next;
      });
      if (requestErrorMessage(err, "").toLowerCase().includes("not found")) notifyCart({ refresh: true });
      toast.error(requestErrorMessage(err, "Could not update the cart."));
    } finally {
      setPending("");
    }
  }

  async function minus(row: PlanRow) {
    const current = quantities[row.id];
    if (!current || pending) return;
    setPending(row.id);
    setQuantities((map) => {
      const next = { ...map };
      if (current.qty <= 1) delete next[row.id];
      else next[row.id] = { ...current, qty: current.qty - 1 };
      return next;
    });
    try {
      if (current.qty <= 1) {
        await portalRequest("/api/buy-sims", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "cart-delete", checkout_id: checkoutId(), package_id: row.id }),
        });
      } else {
        await portalRequest("/api/buy-sims", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resource: "cart-update", checkout_id: checkoutId(), package_id: row.id, sim_type: "esim", quantity: current.qty - 1, checkout_line_id: current.lineId }),
        });
      }
      notifyCart({ refresh: true });
    } catch (err) {
      setQuantities((map) => ({ ...map, [row.id]: current }));
      toast.error(requestErrorMessage(err, "Could not update the cart."));
    } finally {
      setPending("");
    }
  }

  async function buyNow(row: PlanRow) {
    if (pending) return;
    if (checkoutId() && !window.confirm("Buy Now will remove your current cart items.")) return;
    setPending(row.id);
    try {
      const existing = checkoutId();
      if (existing) {
        const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=cart&checkout_id=${encodeURIComponent(existing)}`);
        for (const line of asList(payload.data)) {
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

  async function topUp(row: PlanRow) {
    if (pending) return;
    setPending(row.id);
    try {
      const result = await portalRequest<JsonRecord>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "topup-summary", package_id: row.id, iccid: sessionStorage.getItem("topupIccid") || "" }),
      });
      setSummary(JSON.stringify(result.data ?? result, null, 2));
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not load the top-up summary."));
    } finally {
      setPending("");
    }
  }

  useEffect(() => {
    if (!filtersOpen || regions.length || countries.length) return;
    Promise.all([
      portalRequest<JsonRecord>("/api/buy-sims?resource=regions"),
      portalRequest<JsonRecord>("/api/buy-sims?resource=destinations"),
    ]).then(([regionPayload, countryPayload]) => {
      setRegions(asList(asRecord(regionPayload)?.data ?? regionPayload).map((item) => ({ name: text(item.name || item.region_name) })).filter((item) => item.name));
      setCountries(asList(asRecord(countryPayload)?.data ?? countryPayload)
        .filter((item) => item.is_region !== true)
        .map((item) => ({ name: text(item.name || item.country_name), iso: text(item.iso_two || item.iso2 || item.country_code) }))
        .filter((item) => item.name && item.iso && item.name.toLowerCase() !== "india"));
    }).catch(() => {
      setRegions([]);
      setCountries([]);
    });
  }, [filtersOpen, regions.length, countries.length]);

  const destinationTerm = destinationQuery.trim().toLowerCase();
  const showDestinations = destinationTerm.length >= 3;
  const priceChips = currency === "INR" ? inrPrices : currency === "USD" ? usdPrices : [];
  const localFlow = tab === "local" || kind === "local";

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <button type="button" onClick={() => { if (window.history.length > 1) router.back(); else router.push("/buy-sims"); }} className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
        <Icon name="arrow" className="h-4 w-4 rotate-180" /> Back
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          {kind === "region" ? `Buy SIMs | Region eSIM | ${name}` : kind === "local" ? `Buy SIMs | Local Plan | ${name}` : `Buy SIMs | Local eSIM | ${name}`}
        </h1>
        {tab !== "local" && kind !== "local" && !topup ? <button type="button" onClick={() => setFiltersOpen(true)} className={ghostButton}><Icon name="filter" className="mr-2 h-4 w-4" />Filters</button> : null}
      </div>
      {topup ? null : (
        <div role="tablist" className="flex flex-wrap gap-2">
          {tabs.map((item) => {
            const selected = kind === "local" ? item.id === "local" : tab === item.id;
            return (
              <button key={item.id} type="button" role="tab" aria-selected={selected} onClick={() => changeTab(item.id)} className={`h-9 cursor-pointer rounded-full px-4 text-sm font-semibold ${selected ? "bg-mint text-primary" : "border border-line bg-surface text-muted"}`}>{item.label}</button>
            );
          })}
        </div>
      )}
      {tab === "local" || kind === "local" ? (
        <div className="flex flex-wrap gap-2">
          {localPlanValidity.map((chip) => (
            <button key={chip.label} type="button" onClick={() => setValidity((current) => current === chip.days ? null : chip.days)} className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold ${validity === chip.days ? "bg-mint text-primary" : "border border-line bg-surface text-muted"}`}>{chip.label}</button>
          ))}
        </div>
      ) : null}
      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-48 animate-pulse rounded-3xl bg-surface" />)}</div>
      ) : error ? (
        <p className="rounded-3xl border border-danger/30 bg-danger/5 px-4 py-8 text-center text-sm text-danger">{error} <button type="button" onClick={() => setReload((value) => value + 1)} className="font-semibold text-primary">Try again</button></p>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface px-4 py-10 text-center text-sm text-muted">{tab === "local" || kind === "local" ? `No plans match your selected filters for ${name}.` : `No plans match your selected filters for ${name}. Adjust filters to see more plans.`}</p>
      ) : (
        <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const action = localFlow
              ? <button type="button" onClick={() => router.push(`/checkout/mvno/${encodeURIComponent(row.id)}`)} className={`${primaryButton} w-full`}>Buy Now</button>
              : topup
                ? <button type="button" disabled={pending === row.id} onClick={() => void topUp(row)} className={`${primaryButton} w-full`}>Top up</button>
                : row.category === 2
                  ? <button type="button" disabled={pending === row.id} onClick={() => void buyNow(row)} className={`${primaryButton} w-full`}>Buy Now</button>
                  : quantities[row.id]
                    ? (
                      <div className="flex h-11 items-center justify-between rounded-full border border-line bg-soft px-1">
                        <button type="button" aria-label="Decrease quantity" disabled={pending === row.id} onClick={() => void minus(row)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-surface text-lg text-ink disabled:cursor-wait">−</button>
                        <span className="min-w-6 text-center text-sm font-semibold tabular-nums text-ink">{quantities[row.id].qty}</span>
                        <button type="button" aria-label="Increase quantity" disabled={pending === row.id} onClick={() => void add(row)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full bg-primary text-lg text-on-primary disabled:cursor-wait">+</button>
                      </div>
                    )
                    : <button type="button" disabled={pending === row.id} onClick={() => void add(row)} className={`${primaryButton} w-full`}>Add to Cart</button>;
            return (
              <article key={row.id} className={`relative flex h-full flex-col rounded-[20px] border border-line bg-surface shadow-[var(--shadow)] ${hoverInfo === row.id || hoverFup === row.id ? "z-20 overflow-visible" : "overflow-hidden"}`}>
                <div className="border-b border-line px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 truncate text-base font-semibold text-ink" title={localFlow ? row.displayName : row.name}>{localFlow ? row.displayName : row.name}</h2>
                    {!localFlow && row.coverage ? <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-primary md:hidden">{row.coverage} Speed</span> : null}
                  </div>
                  {localFlow && row.carrierLogo ? <img src={row.carrierLogo} alt={row.carrier || "Carrier"} className="carrier-logo mt-2 h-4 w-auto max-w-full object-contain object-left" /> : null}
                  {!localFlow && row.network ? <p className="mt-1 text-sm font-medium" style={{ color: "#d9534f" }}>{row.network}</p> : null}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Plan details</p>
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Validity</p>
                  {localFlow ? (
                    <>
                      <p className="text-sm font-medium text-ink">{row.dataUnlimited ? "Unlimited" : /\D/.test(row.data) ? row.data : `${row.data} GB`}</p>
                      <p className="text-sm font-medium text-ink">{localValidityLabel(row)}</p>
                      <p className="text-sm text-ink">{row.unlimitedTalk || row.voice ? `Talk: ${row.unlimitedTalk || row.voice === "Unlimited" ? "Unlimited" : `${row.voice} Minutes`}` : ""}</p>
                      <p className="text-sm text-ink">{row.unlimitedText || row.sms ? `SMS: ${row.unlimitedText || row.sms === "Unlimited" ? "Unlimited" : `${row.sms} SMS`}` : ""}</p>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-ink">{row.data || "—"}</p>
                        {row.category === 2 && row.voice ? <p className="text-sm text-ink">{row.unlimitedTalk || row.voice.toLowerCase() === "unlimited" ? "Unlimited" : Number(row.voice) > 1 ? `${row.voice} Mins` : `${row.voice} Min`}</p> : null}
                        {row.category === 2 && row.sms ? <p className="text-sm text-ink">{row.sms} sms</p> : null}
                      </div>
                      <p className="text-sm font-medium text-ink">{`${row.validity} Days`}</p>
                    </>
                  )}
                </div>
                <div className="mt-auto">
                {localFlow ? (
                  <div className="min-h-9 px-4 pb-3">
                    {row.description ? (
                      <div className="relative inline-flex" onMouseEnter={() => setHoverInfo(row.id)} onMouseLeave={() => setHoverInfo("")}>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <Icon name="info" className="h-4 w-4" />
                          Info
                        </span>
                        {hoverInfo === row.id ? (
                          <p className="absolute bottom-[calc(100%-6px)] left-0 z-20 max-h-40 w-72 overflow-y-auto rounded-2xl border border-line bg-surface px-3 py-2 text-sm leading-5 font-normal whitespace-pre-line text-ink shadow-[var(--shadow)]">{row.description}</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {!localFlow ? (
                  <div className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-1 px-4 pb-3">
                    {row.fup ? (
                      <div className="relative" onMouseEnter={() => setHoverFup(row.id)} onMouseLeave={() => setHoverFup("")}>
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                          <Icon name="info" className="h-4 w-4" />
                          FUP limits applicable
                        </span>
                        {hoverFup === row.id ? (
                          <p className="absolute bottom-[calc(100%-6px)] left-0 z-20 max-h-40 w-72 overflow-y-auto rounded-2xl border border-line bg-surface px-3 py-2 text-sm leading-5 font-normal whitespace-pre-line text-ink shadow-[var(--shadow)]">{row.fup}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {row.category === 2 ? <button type="button" onClick={() => setTerms(row)} className="text-sm font-semibold text-primary">Terms & Conditions</button> : null}
                  </div>
                ) : null}
                <div className="flex items-center justify-between border-t border-line px-4 py-3">
                  <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase"><span className="md:hidden">Retail Price</span><span className="hidden md:inline">Price</span></p>
                  <p className="text-lg font-semibold tabular-nums text-ink">
                    {localFlow && row.originalPrice > 0 ? <span className="mr-2 text-sm font-medium text-muted line-through">{row.currencySymbol}{row.originalPrice.toFixed(2)}</span> : null}
                    {localFlow ? `${row.currencySymbol}${row.price.toFixed(2)}` : moneyAmount(row.price, row.currency || currency)}
                  </p>
                </div>
                <div className="px-4 pb-4">{action}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {filtersOpen ? (
        <div className="fixed inset-0 z-40">
          <button type="button" aria-label="Close filters" className="absolute inset-0 bg-[color-mix(in_srgb,var(--navy)_40%,transparent)]" onClick={() => setFiltersOpen(false)} />
          <aside className="absolute top-0 right-0 flex h-full w-full max-w-md flex-col bg-surface p-5 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-ink">Filters</h2>
              <button type="button" onClick={() => { setValidity(null); setPlanType(""); setPriceKey(""); }} className="text-sm font-semibold text-primary">Clear</button>
            </div>
            <label className="mt-4 text-sm text-muted">Search Destination
              <input value={destinationQuery} onChange={(event) => setDestinationQuery(event.target.value)} className={`${fieldClass} mt-1`} placeholder="Search countries or regions" />
            </label>
            {showDestinations ? (
              <div className="mt-3 max-h-48 overflow-y-auto text-sm">
                <p className="font-semibold text-ink">Regions</p>
                {regions.filter((item) => item.name.toLowerCase().includes(destinationTerm)).slice(0, 20).map((item) => (
                  <button key={item.name} type="button" className="block py-1 text-left text-ink" onClick={() => { sessionStorage.setItem("selectedCountry", item.name); router.push(`/buy-sims/region/${encodeURIComponent(item.name)}`); }}>{item.name}</button>
                ))}
                <p className="mt-2 font-semibold text-ink">Countries</p>
                {countries.filter((item) => item.name.toLowerCase().includes(destinationTerm)).slice(0, 30).map((item) => (
                  <button key={item.iso} type="button" className="block py-1 text-left text-ink" onClick={() => { sessionStorage.setItem("selectedCountry", item.name); router.push(`/buy-sims/country/${encodeURIComponent(item.iso)}`); }}>{item.name}</button>
                ))}
              </div>
            ) : <p className="mt-2 text-xs text-muted">Type at least 3 characters.</p>}
            <p className="mt-4 text-sm font-semibold text-ink">Duration</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {dataValidity.map((chip) => (
                <button key={chip.label} type="button" onClick={() => setValidity((current) => current === chip.min ? null : chip.min)} className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold ${validity === chip.min ? "bg-mint text-primary" : "border border-line"}`}>{chip.label}</button>
              ))}
            </div>
            <p className="mt-4 text-sm font-semibold text-ink">Data Type</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(["limited", "unlimited"] as const).map((value) => (
                <button key={value} type="button" onClick={() => setPlanType((current) => current === value ? "" : value)} className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold capitalize ${planType === value ? "bg-mint text-primary" : "border border-line"}`}>{value}</button>
              ))}
            </div>
            {priceChips.length ? (
              <>
                <p className="mt-4 text-sm font-semibold text-ink">Price</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {priceChips.map((chip) => (
                    <button key={chip.label} type="button" onClick={() => setPriceKey((current) => current === chip.label ? "" : chip.label)} className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold ${priceKey === chip.label ? "bg-mint text-primary" : "border border-line"}`}>{chip.label}</button>
                  ))}
                </div>
              </>
            ) : null}
            <button type="button" onClick={() => setFiltersOpen(false)} className={`${primaryButton} mt-auto`}>Close</button>
          </aside>
        </div>
      ) : null}

      <Dialog open={Boolean(terms)} onOpenChange={(open) => { if (!open) setTerms(null); }}><DialogHeader><DialogTitle>Terms & Conditions</DialogTitle></DialogHeader>{terms ? <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">{voiceTerms(name, Number(terms.validity) || 0).map((line) => <li key={line}>{line}</li>)}</ol> : null}</Dialog>
      <Dialog open={Boolean(summary)} onOpenChange={(open) => { if (!open) setSummary(""); }}><DialogHeader><DialogTitle>Top-up summary</DialogTitle></DialogHeader><pre className="max-h-80 overflow-auto text-xs text-ink">{summary}</pre></Dialog>
    </div>
  );
}

function localValidityLabel(row: PlanRow) {
  const days = row.expiryDays || Number(row.validity) || 0;
  if (row.expiryType.toLowerCase() === "days") return `${days} ${days === 1 ? "Day" : "Days"}`;
  const months = Math.round(days / 30) || 0;
  return `${months} ${months === 1 ? "Month" : "Months"}`;
}

function localPlanError(err: unknown, destination: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Network error: Please check your internet connection.";
  if (err instanceof TypeError) return "Network error: Please check your internet connection.";
  const status = err instanceof PortalRequestError ? err.status : 0;
  if (status === 404) return "No packages found for the selected country.";
  if (status >= 500) return "Server error: Please try again later.";
  return requestErrorMessage(err, `No plans match your selected filters for ${destination}.`);
}

export function CartDrawer({
  open,
  loading,
  error,
  cart,
  onClose,
  onRetry,
  onChanged,
  role,
  resellerId,
  agentId,
}: {
  open: boolean;
  loading: boolean;
  error: string;
  cart: CheckoutView | null;
  onClose: () => void;
  onRetry: () => void;
  onChanged: () => void;
  role: string;
  resellerId: string;
  agentId: string;
}) {
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState("");
  const [devicesOpen, setDevicesOpen] = useState(false);
  const [brands, setBrands] = useState<JsonRecord[]>([]);
  const [devices, setDevices] = useState<string[]>([]);
  const [brandId, setBrandId] = useState("");
  const [deviceQuery, setDeviceQuery] = useState("");
  const [edit, setEdit] = useState<CheckoutView["addons"][number] | null>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!devicesOpen || brands.length) return;
    brandsWithDevices().then((list) => {
      setBrands(list);
      const first = text(list[0]?.brand_id);
      if (first) setBrandId(first);
    }).catch(() => setBrands([]));
  }, [devicesOpen, brands.length]);

  useEffect(() => {
    if (!brandId) return;
    const timer = window.setTimeout(() => {
      portalRequest<JsonRecord>(`/api/buy-sims?resource=devices&brand_id=${encodeURIComponent(brandId)}`)
        .then((payload) => {
          const names = asList(payload.data)
            .filter((item) => item.status !== false && item.status !== "false")
            .map((item) => text(item.device_name || item.name))
            .filter(Boolean)
            .reverse();
          setDevices(names);
        })
        .catch(() => setDevices([]));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [brandId]);

  if (!open) return null;
  const empty = !loading && !error && cart && !cart.lines.length && !cart.addons.length;

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button type="button" aria-label="Close cart" className="absolute inset-0 bg-[color-mix(in_srgb,var(--navy)_40%,transparent)]" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex h-full max-h-full w-full max-w-md flex-col overflow-hidden bg-surface shadow-[var(--shadow)] sm:inset-y-4 sm:right-4 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-semibold text-ink">Cart</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close cart" className="grid h-9 w-9 place-items-center rounded-full border border-line"><Icon name="close" className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="h-24 animate-pulse rounded-2xl bg-soft" />)}</div> : null}
          {error ? <p className="text-sm text-danger">{error} <button type="button" onClick={onRetry} className="font-semibold text-primary">Try again</button></p> : null}
          {empty ? <p className="py-16 text-center text-sm text-muted">No items in Cart</p> : null}
          {cart?.lines.map((line) => (
            <article key={line.lineId || line.id} className="mb-4 border-b border-line pb-4">
              <div className="flex gap-3">
                {line.flag ? <img src={line.flag} alt="" className="h-10 w-10 rounded-full object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-ink">{line.title}</h3>
                  {line.showCoverage && line.coverage && line.coverage !== line.network ? <p className="text-xs text-muted">{line.coverage}</p> : null}
                  <p className="mt-1 text-sm text-ink">
                    {line.network || (line.showCoverage ? line.coverage : "")}
                    {line.speed ? <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold text-primary">{line.speed}</span> : null}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Data</p>
                  <p className="font-medium text-ink">{line.data || "—"}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Validity</p>
                  <p className="font-medium text-ink">{line.days} Days</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-wide text-muted uppercase">Price</p>
                  <p className="font-medium tabular-nums text-ink">{moneyAmount(line.price, cart.currency)}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="inline-flex items-center rounded-full border border-line bg-soft p-1">
                  <button type="button" aria-label="Decrease quantity" disabled={busy === line.id} onClick={() => void changeLine(line, line.quantity - 1, setBusy, onChanged)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-surface text-lg text-ink disabled:cursor-wait">−</button>
                  <span className="w-8 text-center text-sm font-semibold tabular-nums text-ink">{line.quantity}</span>
                  <button type="button" aria-label="Increase quantity" disabled={busy === line.id} onClick={() => void changeLine(line, line.quantity + 1, setBusy, onChanged)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-full bg-primary text-lg text-on-primary disabled:cursor-wait">+</button>
                </div>
                <button type="button" aria-label="Remove from cart" disabled={busy === line.id} onClick={() => void changeLine(line, 0, setBusy, onChanged)} className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-line text-danger disabled:cursor-wait">
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </article>
          ))}
          {cart?.addons.map((group) => (
            <article key={group.key} className="mb-4 rounded-2xl border border-line p-3 text-sm">
              <h3 className="font-semibold text-ink">{group.serviceName}</h3>
              <p className="text-muted">{group.displayName}</p>
              <p>{group.location} · {group.terminal}</p>
              <p>{group.date} {group.time}</p>
              <p>Adults {group.adults} · Children {group.children} · Infants {group.infants}</p>
              {group.names.length ? <p className="text-muted">{group.names.join(", ")}</p> : null}
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setEdit(group)} className={ghostButton}>Edit</button>
                <button type="button" disabled={busy === group.key} onClick={() => void removeAddon(group, resellerId, agentId, setBusy, onChanged)} className={ghostButton}>Remove</button>
              </div>
            </article>
          ))}
        </div>
        {cart && (cart.lines.length || cart.addons.length) ? (
          <footer className="max-h-[46%] shrink-0 overflow-y-auto border-t border-line px-5 py-4 text-sm">
            <p className="flex justify-between tabular-nums"><span>Price</span><span>{moneyAmount(cart.summary.net, cart.currency)}</span></p>
            <p className="flex justify-between tabular-nums"><span>Tax</span><span>+ {moneyAmount(cart.summary.tax, cart.currency)}</span></p>
            <p className="flex justify-between font-semibold tabular-nums"><span>Customer will pay</span><span>{moneyAmount(cart.summary.total, cart.currency)}</span></p>
            {role === "RESELLER_AGENT" ? null : <Breakage cart={cart} />}
            <DeviceCheck open={devicesOpen} onToggle={() => setDevicesOpen((value) => !value)} brands={brands} brandId={brandId} onBrand={(id) => { setBrandId(id); setDeviceQuery(""); }} query={deviceQuery} onQuery={setDeviceQuery} devices={devices} />
            <button type="button" onClick={() => { onClose(); router.push(checkoutPath()); }} className={`${primaryButton} mt-3 w-full`}>Checkout</button>
          </footer>
        ) : null}
      </aside>
      <Dialog open={Boolean(edit)} onOpenChange={(next) => { if (!next) setEdit(null); }}>
        {edit ? <AddonEdit group={edit} resellerId={resellerId} agentId={agentId} onDone={() => { setEdit(null); onChanged(); }} /> : null}
      </Dialog>
    </div>,
    document.body,
  );
}

function Breakage({ cart }: { cart: CheckoutView }) {
  const rows = [
    ["Plan Price", cart.breakage.plan],
    ["Lounge", cart.breakage.lounge],
    ["VIP", cart.breakage.vip],
    ["Fast Track", cart.breakage.fastTrack],
    ["Meet & Greet", cart.breakage.meet],
    ["Other Addon", cart.breakage.other],
  ].filter(([, amount], index) => index === 0 || Number(amount) > 0);
  return (
    <details className="mt-3">
      <summary className="cursor-pointer font-semibold text-primary">Price breakage</summary>
      <div className="mt-2 space-y-1">
        {rows.map(([label, amount]) => <p key={String(label)} className="flex justify-between tabular-nums"><span>{label}</span><span>{moneyAmount(Number(amount), cart.currency)}</span></p>)}
        <p className="flex justify-between tabular-nums"><span>Discount</span><span>{moneyAmount(cart.breakage.discount, cart.currency)}</span></p>
        <p className="flex justify-between tabular-nums"><span>eSIM Subtotal</span><span>{moneyAmount(cart.breakage.esimSubtotal, cart.currency)}</span></p>
        <p className="flex justify-between tabular-nums"><span>Tax</span><span>{moneyAmount(cart.breakage.tax, cart.currency)}</span></p>
        <p className="flex justify-between font-semibold text-primary tabular-nums"><span>Total Price</span><span>{moneyAmount(cart.breakage.total, cart.currency)}</span></p>
        <p className="text-xs text-muted">*This amount will be debited from wallet</p>
      </div>
    </details>
  );
}

function DeviceCheck({ open, onToggle, brands, brandId, onBrand, query, onQuery, devices }: { open: boolean; onToggle: () => void; brands: JsonRecord[]; brandId: string; onBrand: (id: string) => void; query: string; onQuery: (value: string) => void; devices: string[] }) {
  const term = query.trim().toLowerCase();
  const visible = term.length > 2 ? devices.filter((name) => name.toLowerCase().includes(term)) : devices;
  return (
    <div className="mt-3 border-t border-line pt-3">
      <button type="button" onClick={onToggle} className="text-sm font-semibold text-primary">{open ? "Hide device check" : "Check device compatibility"}</button>
      {open ? (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2 overflow-x-auto">
            {brands.map((brand) => {
              const id = text(brand.brand_id);
              return <button key={id} type="button" onClick={() => onBrand(id)} className={id === brandId ? primaryButton : ghostButton}>{text(brand.brand_name || brand.name)}</button>;
            })}
          </div>
          <input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search Devices.." className={fieldClass} />
          {visible.length ? (
            <ul className="grid max-h-40 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto text-sm text-ink">
              {visible.map((device) => <li key={device}>{device}</li>)}
            </ul>
          ) : <p className="text-sm text-muted">{term.length > 2 ? "No devices match your search." : "No devices found for this brand."}</p>}
        </div>
      ) : null}
    </div>
  );
}

async function changeLine(line: CheckoutView["lines"][number], quantity: number, setBusy: (value: string) => void, onChanged: () => void) {
  setBusy(line.id);
  try {
    if (quantity < 1) {
      await portalRequest("/api/buy-sims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "cart-delete", checkout_id: checkoutId(), package_id: line.id }),
      });
    } else {
      await portalRequest("/api/buy-sims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "cart-update",
          checkout_id: checkoutId(),
          package_id: line.id,
          sim_type: "esim",
          quantity,
          checkout_line_id: line.lineId,
        }),
      });
    }
    onChanged();
  } catch (err) {
    toast.error(requestErrorMessage(err, "Could not update the cart."));
  } finally {
    setBusy("");
  }
}

async function removeAddon(group: CheckoutView["addons"][number], resellerId: string, agentId: string, setBusy: (value: string) => void, onChanged: () => void) {
  setBusy(group.key);
  try {
    await portalRequest("/api/buy-sims", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource: "addon",
        checkout_id: checkoutId(),
        plan_id: group.planId,
        service_id: group.serviceId,
        service_name: group.serviceName,
        reseller_id: resellerId,
        agent_id: agentId,
        adult_count: 0,
        child_count: 0,
        infant_count: 0,
        currency: group.currency,
        service_date: group.date,
        service_time: group.time,
        location_code: group.location,
        terminal: group.terminal,
      }),
    });
    toast.success("Airport service removed from cart");
    onChanged();
  } catch (err) {
    toast.error(requestErrorMessage(err, "Could not remove the airport service."));
  } finally {
    setBusy("");
  }
}

function AddonEdit({ group, resellerId, agentId, onDone }: { group: CheckoutView["addons"][number]; resellerId: string; agentId: string; onDone: () => void }) {
  const [adults, setAdults] = useState(group.adults);
  const [children, setChildren] = useState(group.children);
  const [infants, setInfants] = useState(group.infants);
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await portalRequest("/api/buy-sims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: "addon",
          checkout_id: checkoutId(),
          plan_id: group.planId,
          service_id: group.serviceId,
          service_name: group.serviceName,
          reseller_id: resellerId,
          agent_id: agentId,
          adult_count: adults,
          child_count: children,
          infant_count: infants,
          currency: group.currency,
          service_date: group.date,
          service_time: group.time,
          location_code: group.location,
          terminal: group.terminal,
        }),
      });
      onDone();
    } catch (err) {
      toast.error(requestErrorMessage(err, "Could not update the airport service."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div>
      <DialogHeader><DialogTitle>Edit {group.serviceName}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-3 gap-2 text-sm">
        <label>Adults<input type="number" min={0} value={adults} onChange={(event) => setAdults(Number(event.target.value))} className={fieldClass} /></label>
        <label>Children<input type="number" min={0} value={children} onChange={(event) => setChildren(Number(event.target.value))} className={fieldClass} /></label>
        <label>Infants<input type="number" min={0} value={infants} onChange={(event) => setInfants(Number(event.target.value))} className={fieldClass} /></label>
      </div>
      <button type="button" disabled={saving} onClick={() => void save()} className={`${primaryButton} mt-4`}>Save</button>
    </div>
  );
}
