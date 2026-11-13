"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { usePartner } from "@/components/shell/partner-context";
import { hasPermission } from "@/lib/auth-session";
import {
  desktopLetters,
  destinationsFrom,
  letterBounds,
  mobileLetters,
  moneyAmount,
  pageMeta,
  regionCountries,
  type CatalogTab,
  type Destination,
} from "@/lib/buy-sims";
import { portalRequest, PortalRequestError, requestErrorMessage, type JsonRecord } from "@/lib/portal-fetch";
import { SkeletonCards, StatusBlock, SupportNote, ViewSwitch } from "@/components/portal/buy-sims/shared";

const tabs: { id: CatalogTab; label: string; permission?: string }[] = [
  { id: "country", label: "Country eSIM", permission: "BuyLocalSim" },
  { id: "region", label: "Regional eSIM", permission: "BuyRegionalSim" },
  { id: "local", label: "Local Plans" },
];

export function CatalogView() {
  const partner = usePartner();
  const router = useRouter();
  const search = useSearchParams();
  const allowed = useMemo(() => tabs.filter((tab) => !tab.permission || partner.role === "RESELLER_ADMIN" || hasPermission(partner.featureAccess, tab.permission)), [partner.featureAccess, partner.role]);
  const requested = search.get("tab") as CatalogTab | null;
  const tab = allowed.some((item) => item.id === requested) ? requested! : allowed[0]?.id ?? "local";
  const page = Math.max(1, Number(search.get("page") || 1));
  const letter = search.get("letter") || "All";
  const [query, setQuery] = useState(search.get("q") || "");
  const [debounced, setDebounced] = useState(query.trim());
  const [rows, setRows] = useState<Destination[]>([]);
  const [currency, setCurrency] = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const shortQuery = tab === "country" && debounced.length > 0 && debounced.length < 3;
  const requestId = useRef(0);
  const [retry, setRetry] = useState(0);
  const regionCache = useRef<Record<string, string[]>>({});
  const [openRegion, setOpenRegion] = useState("");
  const [regionList, setRegionList] = useState<string[]>([]);

  useEffect(() => {
    if (!partner.ready) return;
    const remembered = sessionStorage.getItem("buy-sims-tab");
    sessionStorage.setItem("buy-sims-view", "grid");
    if (!search.get("tab") && remembered && remembered !== tab && allowed.some((item) => item.id === remembered)) {
      const params = new URLSearchParams(search.toString());
      params.set("tab", remembered);
      router.replace(`/buy-sims?${params.toString()}`);
      return;
    }
    sessionStorage.setItem("buy-sims-tab", tab);
  }, [tab, partner.ready, allowed, router, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  function writeUrl(next: { tab?: CatalogTab; page?: number; letter?: string; q?: string }) {
    const params = new URLSearchParams();
    const nextTab = next.tab ?? tab;
    params.set("tab", nextTab);
    if ((next.q ?? (nextTab === "country" ? debounced : "")).length >= 3) params.set("q", next.q ?? query.trim());
    const nextLetter = next.letter ?? letter;
    if (nextTab === "country" && nextLetter !== "All") params.set("letter", nextLetter);
    const nextPage = next.page ?? 1;
    if (nextPage > 1) params.set("page", String(nextPage));
    router.replace(`/buy-sims?${params.toString()}`);
  }

  useEffect(() => {
    if (!partner.ready) return;
    const id = ++requestId.current;
    const trimmed = debounced;
    if (tab === "country" && trimmed.length > 0 && trimmed.length < 3) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
    }, 0);
    const bounds = tab === "country" && !trimmed ? letterBounds(letter) : null;
    const path = tab === "region"
      ? "/api/buy-sims?resource=regions"
      : tab === "local"
        ? "/api/buy-sims?resource=local-countries"
        : bounds
          ? `/api/buy-sims?resource=countries-range&start=${bounds.start}&end=${bounds.end}&page=${page}&page_size=50`
          : `/api/buy-sims?resource=countries&page=${trimmed ? 1 : page}&page_size=${trimmed ? 24 : 12}${trimmed ? `&query=${encodeURIComponent(trimmed)}` : ""}`;
    let retryTimer = 0;
    function load(attempt: number) {
      portalRequest<JsonRecord>(path)
        .then((payload) => {
          if (id !== requestId.current) return;
          const meta = pageMeta(payload);
          setRows(destinationsFrom(payload, tab));
          setCurrency(meta.currency);
          setTotalPages(meta.totalPages);
          setError("");
          setLoading(false);
        })
        .catch((err) => {
          if (id !== requestId.current) return;
          if (attempt < 1 && err instanceof PortalRequestError && err.status >= 500) {
            retryTimer = window.setTimeout(() => load(attempt + 1), 2500);
            return;
          }
          setRows([]);
          setError(requestErrorMessage(err, "We couldn’t load destinations right now. Please try again."));
          setLoading(false);
        });
    }
    load(0);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [partner.ready, tab, page, letter, debounced, retry]);

  async function showRegion(name: string) {
    setOpenRegion(name);
    if (regionCache.current[name]) {
      setRegionList(regionCache.current[name]);
      return;
    }
    try {
      const payload = await portalRequest<JsonRecord>(`/api/buy-sims?resource=overview&filterby=Region&country_code=&region_name=${encodeURIComponent(name)}`);
      const countries = regionCountries(payload);
      regionCache.current[name] = countries;
      setRegionList(countries);
    } catch {
      setRegionList([]);
    }
  }

  function openDestination(item: Destination) {
    sessionStorage.removeItem("istopup");
    sessionStorage.setItem("selectedCountry", item.name);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Buy SIMs</h1>
        <ViewSwitch active="grid" />
      </header>
      <div role="tablist" aria-label="Destination type" className="flex flex-wrap gap-2">
        {allowed.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => writeUrl({ tab: item.id, page: 1, letter: "All", q: "" })}
            className={`h-9 cursor-pointer rounded-full px-4 text-sm font-semibold ${tab === item.id ? "bg-mint text-primary" : "border border-line bg-surface text-muted hover:text-ink"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "country" ? (
        <div className="space-y-3">
          <label className="relative block">
            <span className="sr-only">Search countries</span>
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (!value.trim()) writeUrl({ page: 1, letter: "All", q: "" });
              }}
              placeholder="Search countries"
              className="h-11 w-full rounded-2xl border border-line bg-surface pr-3 pl-10 text-sm text-ink outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap gap-2 md:hidden">
            {mobileLetters.map((chip) => (
              <LetterChip key={chip} chip={chip} active={letter === chip && !debounced} onSelect={() => { setQuery(""); writeUrl({ letter: chip, page: 1, q: "" }); }} />
            ))}
          </div>
          <div className="hidden flex-wrap gap-2 md:flex">
            {desktopLetters.map((chip) => (
              <LetterChip key={chip} chip={chip} active={letter === chip && !debounced} onSelect={() => { setQuery(""); writeUrl({ letter: chip, page: 1, q: "" }); }} />
            ))}
          </div>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">{loading ? "Loading destinations" : `${rows.length} destinations`}</p>
      {shortQuery ? (
        <StatusBlock title="Type at least 3 letters" />
      ) : loading ? (
        <div>
          <p className="mb-3 text-sm text-muted">Loading destinations…</p>
          <SkeletonCards />
        </div>
      ) : error ? (
        <StatusBlock title={error} action={{ label: "Try again", onClick: () => setRetry((value) => value + 1) }} />
      ) : rows.length === 0 ? (
        <StatusBlock title="No destinations match your search." />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {rows.map((item) => {
            const href = tab === "region"
              ? `/buy-sims/region/${encodeURIComponent(item.id)}`
              : tab === "local"
                ? `/buy-sims/local/${encodeURIComponent(item.id)}`
                : `/buy-sims/country/${encodeURIComponent(item.id)}`;
            return (
              <div key={item.id} className="relative" onMouseLeave={() => { if (tab === "region") setOpenRegion(""); }}>
                <Link
                  href={href}
                  aria-label={item.name}
                  onClick={() => openDestination(item)}
                  className="flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-3 shadow-[var(--shadow)] transition hover:border-primary"
                >
                  {item.flag ? <img src={item.flag} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" /> : null}
                  {item.image ? <img src={item.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" /> : null}
                  <span className={`min-w-0 flex-1 ${tab === "region" ? "pr-8" : ""}`}>
                    <span className="block truncate font-semibold text-ink">{item.name}</span>
                    {tab === "country" && item.price != null ? (
                      <span className="block text-xs text-muted">Plans start from {moneyAmount(item.price, item.currency || currency, 2)}</span>
                    ) : null}
                    {item.carrier ? <span className="block truncate text-xs text-muted">{item.carrier}</span> : null}
                  </span>
                  {item.carrierLogo ? <img src={item.carrierLogo} alt="" className="h-6 max-w-16 shrink-0 object-contain" /> : null}
                  <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted" />
                </Link>
                {tab === "region" ? (
                  <button
                    type="button"
                    aria-label={`${item.name} countries`}
                    onMouseEnter={() => void showRegion(item.name)}
                    onFocus={() => void showRegion(item.name)}
                    onClick={() => void showRegion(openRegion === item.name ? "" : item.name)}
                    className="absolute top-1/2 right-10 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-mint hover:text-primary"
                  >
                    <Icon name="info" className="h-4 w-4" />
                  </button>
                ) : null}
                {tab === "region" && openRegion === item.name ? (
                  <div className="absolute top-[calc(100%-1px)] right-0 left-0 z-20 max-h-40 overflow-y-auto rounded-2xl border border-line bg-surface p-3 text-sm leading-5 text-ink shadow-[var(--shadow)]">
                    {regionList.length ? regionList.join(", ") : "No country list yet."}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {!shortQuery && !loading && !error && totalPages > 1 && tab === "country" ? (
        <div className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => { writeUrl({ page: page - 1 }); document.querySelector("main")?.scrollTo({ top: 0 }); }} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40">‹</button>
          <span className="text-sm text-muted">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => { writeUrl({ page: page + 1 }); document.querySelector("main")?.scrollTo({ top: 0 }); }} className="grid h-9 w-9 place-items-center rounded-full border border-line disabled:opacity-40">›</button>
        </div>
      ) : null}
      <SupportNote />
    </div>
  );
}

function LetterChip({ chip, active, onSelect }: { chip: string; active: boolean; onSelect: () => void }) {
  const label = chip === "All" ? "All" : chip.split("-").filter((_, index, list) => index === 0 || index === list.length - 1).join("–");
  return (
    <button type="button" onClick={onSelect} className={`h-8 cursor-pointer rounded-full px-3 text-xs font-semibold ${active ? "bg-mint text-primary" : "border border-line bg-surface text-muted"}`}>
      {label}
    </button>
  );
}
