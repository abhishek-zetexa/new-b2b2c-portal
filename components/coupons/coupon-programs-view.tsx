"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { FiSearch } from "react-icons/fi";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SelectField, TextField } from "@/components/ui/form-field";
import { Modal } from "@/components/ui/modal";
import { Icon } from "@/components/ui/icon";
import { StatusPill } from "@/components/ui/status-pill";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "react-toastify";
import { asList, asRecord, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

type Tab = "programs" | "issued";

export function CouponProgramsView() {
  const [tab, setTab] = useState<Tab>("programs");
  const [programs, setPrograms] = useState<JsonRecord[]>([]);
  const [codes, setCodes] = useState<JsonRecord[]>([]);
  const [pagination, setPagination] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [issuedQuery, setIssuedQuery] = useState("");
  const [programId, setProgramId] = useState("ALL");
  const [page, setPage] = useState(1);
  const [issuedLoaded, setIssuedLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [details, setDetails] = useState<JsonRecord | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [presetProgram, setPresetProgram] = useState("");
  const [revoking, setRevoking] = useState("");

  async function loadPrograms() {
    const res = await portalRequest<unknown>("/api/coupons?resource=programs");
    const record = asRecord(res);
    const list = Array.isArray(res) ? asList(res) : Array.isArray(record?.data) ? asList(record.data) : asList(asRecord(record?.data)?.programs);
    setPrograms(list);
  }

  async function loadCodes(nextPage = page) {
    const params = new URLSearchParams({ page: String(nextPage), page_size: "20" });
    if (programId !== "ALL") params.set("program_id", programId);
    if (issuedQuery.trim()) params.set("search", issuedQuery.trim());
    const res = await portalRequest<JsonRecord>(`/api/coupons?resource=codes&${params.toString()}`);
    const data = asRecord(res.data);
    setCodes(asList(data?.promo_codes));
    setPagination(asRecord(data?.pagination));
    setIssuedLoaded(true);
  }

  useEffect(() => {
    setLoading(true);
    loadPrograms().catch((err: Error) => toast.error(err.message || "Failed to load coupon programs.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "issued" || issuedLoaded) return;
    setLoading(true);
    loadCodes(1).catch((err: Error) => toast.error(err.message || "Error occurred while loading coupon list.")).finally(() => setLoading(false));
  }, [tab, issuedLoaded]);

  const filtered = useMemo(() => programs.filter((item) => {
    const needle = query.trim().toLowerCase();
    const platformValue = text(item.platform).toLowerCase();
    const matchesSearch = !needle || `${text(item.program_name)} ${platformValue} ${text(item.program_id)}`.toLowerCase().includes(needle);
    const matchesPlatform = platform === "ALL" || !platformValue || platformValue === platform;
    const active = item.status === true || item.status === "true" || item.status === 1 || item.status === undefined;
    const inactive = item.status === false || item.status === "false" || item.status === 0;
    const matchesStatus = status === "ALL" || (status === "Active" ? active : inactive);
    return matchesSearch && matchesPlatform && matchesStatus;
  }), [programs, query, platform, status]);

  const zetexa = programs.filter((item) => text(item.platform).toLowerCase() === "zetexa").length;
  const unlimit = programs.filter((item) => text(item.platform).toLowerCase() === "unlimitmobile").length;

  async function sync() {
    setSyncing(true);
    try {
      const res = await portalRequest<JsonRecord>("/api/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sync" }) });
      toast.success(text(res.message) || "Reseller registered and Unlimit programs enabled successfully.");
      await loadPrograms();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function refresh() {
    setLoading(true);
    try {
      if (tab === "programs") await loadPrograms();
      else await loadCodes(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setLoading(false);
    }
  }

  async function revoke(item: JsonRecord) {
    const id = text(asRecord(item.traveler)?.id || item.id);
    const couponCode = text(item.coupon_code);
    const selected = text(item.program_id);
    if (!id || !couponCode || !selected) {
      toast.error("Missing required information (id, coupon_code, or program_id) to revoke coupon.");
      return;
    }
    if (!window.confirm(`Revoke ${couponCode}?`)) return;
    setRevoking(couponCode);
    try {
      const res = await portalRequest<JsonRecord>("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", id, coupon_code: couponCode, program_id: selected }),
      });
      toast.success(text(res.message) || `Coupon ${couponCode} revoked successfully.`);
      await loadCodes(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Revoke failed.");
    } finally {
      setRevoking("");
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Coupon Programs</h1>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <button type="button" onClick={refresh} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">Refresh</button>
          <button type="button" disabled={syncing} onClick={sync} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-primary/35 bg-mint/75 px-5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-mint disabled:opacity-50">{syncing ? "Syncing..." : "Sync to Unlimit Mobile"}</button>
          <button type="button" onClick={() => { setPresetProgram(""); setRegisterOpen(true); }} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary shadow-xs transition hover:bg-primary-hover">Register Traveler & Create Coupon</button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
        <TabsList>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="issued">Issued & Usage Coupon History</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "programs" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total Programs" value={programs.length} />
            <Stat label="Zetexa Programs" value={zetexa} />
            <Stat label="Unlimitmobile Programs" value={unlimit} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-56 max-w-full">
              <FiSearch className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search programs"
                aria-label="Search programs"
                className="h-10 w-full rounded-2xl border border-line bg-page pr-3 pl-10 text-sm text-ink outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_45%,transparent)] focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
              />
            </div>
            <FilterSelect label="Platform" value={platform} onChange={setPlatform}>
              <option value="ALL">All platforms</option>
              <option value="zetexa">zetexa</option>
              <option value="unlimitmobile">unlimitmobile</option>
            </FilterSelect>
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="ALL">All statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </FilterSelect>
            <button type="button" onClick={() => setView(view === "grid" ? "table" : "grid")} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">{view === "grid" ? "Table" : "Grid"}</button>
          </div>
          {loading ? <p className="text-sm text-muted">Loading...</p> : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow)]">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary"><span className="text-lg font-semibold">—</span></span>
              <h2 className="mt-4 text-base font-semibold text-ink">No Coupon Programs Found</h2>
              <button type="button" onClick={() => { setQuery(""); setPlatform("ALL"); setStatus("ALL"); }} className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-line bg-page px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">Reset Filters</button>
            </div>
          ) : view === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => <ProgramCard key={text(item.program_id)} item={item} onDetails={() => openDetails(item, setDetails)} onIssue={() => { setPresetProgram(text(item.program_id)); setRegisterOpen(true); }} />)}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
              <table className="w-full border-collapse text-left text-sm">
                <tbody className="divide-y divide-line">
                  {filtered.map((item) => (
                    <tr key={text(item.program_id)} className="transition-colors hover:bg-soft/65">
                      <td className="px-6 py-3.5">{programSummary(item)}</td>
                      <td className="px-6 py-3.5 text-right"><button type="button" onClick={() => openDetails(item, setDetails)} className="mr-3 inline-flex h-9 cursor-pointer items-center rounded-full border border-line bg-page px-3 text-xs font-semibold text-ink hover:border-primary hover:text-primary">Details</button><button type="button" onClick={() => { setPresetProgram(text(item.program_id)); setRegisterOpen(true); }} className="inline-flex h-9 cursor-pointer items-center rounded-full bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary-hover">Issue Coupon</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <IssuedTable
          codes={codes}
          programs={programs}
          pagination={pagination}
          query={issuedQuery}
          programId={programId}
          revoking={revoking}
          onQuery={setIssuedQuery}
          onProgram={(value) => { setProgramId(value); setIssuedLoaded(false); setPage(1); }}
          onSearch={() => { setPage(1); setLoading(true); loadCodes(1).finally(() => setLoading(false)); }}
          onPage={(next) => { setPage(next); setLoading(true); loadCodes(next).finally(() => setLoading(false)); }}
          onRevoke={revoke}
          onRegister={() => { setPresetProgram(""); setRegisterOpen(true); }}
        />
      )}

      <DetailsDialog program={details} onClose={() => setDetails(null)} />
      <RegisterDialog
        open={registerOpen}
        programs={programs}
        preset={presetProgram}
        onClose={(issued) => {
          setRegisterOpen(false);
          if (issued && tab === "issued") loadCodes(page).catch(() => undefined);
        }}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative w-40 max-w-full">
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-40 max-w-full cursor-pointer appearance-none rounded-2xl border border-line bg-page pr-8 pl-3 text-sm text-ink outline-none transition focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
      >
        {children}
      </select>
      <Icon name="chevron" className="pointer-events-none absolute top-1/2 right-3 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <section className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)]"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p></section>;
}

function programSummary(item: JsonRecord) {
  const packages = Array.isArray(item.packages_list) ? item.packages_list.length : 0;
  const active = item.status === false || item.status === "false" || item.status === 0 ? "Inactive" : "Active";
  return `${text(item.program_id)} · ${text(item.discount_percent)}% OFF · ${text(item.program_name)} · ${text(item.platform) || "—"} · ${active} · ${text(item.default_validity_days)} days · ${packages || "All / Unlimited"}`;
}

function ProgramCard({ item, onDetails, onIssue }: { item: JsonRecord; onDetails: () => void; onIssue: () => void }) {
  const packages = Array.isArray(item.packages_list) ? item.packages_list.length : 0;
  const inactive = item.status === false || item.status === "false" || item.status === 0;
  return (
    <article className="flex h-full flex-col rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">#{text(item.program_id)}</p>
        <StatusPill status={inactive ? "Inactive" : "Active"} />
      </div>
      <h3 className="mt-2 text-base font-semibold leading-6 text-ink">{text(item.program_name)}</h3>
      <p className="mt-1 text-xl font-semibold tracking-tight text-primary">{text(item.discount_percent)}% OFF</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-page px-3 py-2.5 text-xs">
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Platform</dt>
          <dd className="mt-0.5 truncate font-semibold text-ink">{text(item.platform) || "—"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Validity</dt>
          <dd className="mt-0.5 font-semibold text-ink">{text(item.default_validity_days)} days</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">Packages</dt>
          <dd className="mt-0.5 truncate font-semibold text-ink">{packages || "All"}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onDetails} className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full border border-line bg-page px-3 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary">Details</button>
        <button type="button" onClick={onIssue} className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-on-primary transition hover:bg-primary-hover">Issue Coupon</button>
      </div>
    </article>
  );
}

async function openDetails(item: JsonRecord, setDetails: (value: JsonRecord | null) => void) {
  try {
    const res = await portalRequest<JsonRecord>(`/api/coupons?resource=program&id=${encodeURIComponent(text(item.program_id))}`);
    setDetails(asRecord(res.data) || item);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Program details could not be loaded.");
  }
}

function DetailsDialog({ program, onClose }: { program: JsonRecord | null; onClose: () => void }) {
  if (!program) return null;
  const packages = parsePackages(program.packages_list);
  return (
    <Dialog open onOpenChange={onClose} className="max-w-2xl">
      <DialogHeader><DialogTitle>{text(program.program_name)}</DialogTitle></DialogHeader>
      <div className="space-y-2 text-sm">
        <p>ID {text(program.program_id)} · {text(program.platform) || "—"} · {text(program.discount_percent)}% · {program.status === false ? "Inactive" : "Active"} · {text(program.default_validity_days)} days</p>
        <p>Packages: {packages.length ? packages.map(packageLabel).join(", ") : "All / Unrestricted"}</p>
        <p>Countries: {Array.isArray(program.country_list) ? program.country_list.join(", ") : text(program.country_list) || "—"}</p>
        {asList(program.package_details).map((item, index) => <p key={index}>{text(item.package_name)} · {text(item.data_quota)} · {text(item.validity_days)}</p>)}
        {text(program.program_description) ? <CopyRow label="Description" value={text(program.program_description)} /> : null}
        {text(program.redeem_url) ? <CopyRow label="Redeem URL" value={text(program.redeem_url)} href={text(program.redeem_url)} /> : null}
      </div>
    </Dialog>
  );
}

function CopyRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <p>
      {label}: {value}{" "}
      <button type="button" className="font-semibold text-primary" onClick={() => navigator.clipboard.writeText(value).then(() => toast.success(`${label} copied to clipboard!`))}>Copy</button>
      {href ? <a className="ml-2 font-semibold text-primary" href={href} target="_blank" rel="noreferrer">Open</a> : null}
    </p>
  );
}

function IssuedTable(props: {
  codes: JsonRecord[];
  programs: JsonRecord[];
  pagination: JsonRecord | null;
  query: string;
  programId: string;
  revoking: string;
  onQuery: (value: string) => void;
  onProgram: (value: string) => void;
  onSearch: () => void;
  onPage: (page: number) => void;
  onRevoke: (item: JsonRecord) => void;
  onRegister: () => void;
}) {
  const page = num(props.pagination?.current_page) || 1;
  const pages = num(props.pagination?.total_pages) || 1;
  const total = num(props.pagination?.total_items);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Search coupon code, traveler name, email..." className="field min-w-64 flex-1" />
        <select value={props.programId} onChange={(event) => props.onProgram(event.target.value)} className="field w-auto min-w-48">
          <option value="ALL">All programs</option>
          {props.programs.map((item) => <option key={text(item.program_id)} value={text(item.program_id)}>{text(item.program_name)}</option>)}
        </select>
        <button type="button" onClick={props.onSearch} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">Search</button>
      </div>
      {props.codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow)]">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary"><span className="text-lg font-semibold">—</span></span>
          <p className="mt-4 text-base font-semibold text-ink">No data found</p>
          <button type="button" onClick={props.onRegister} className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover">Register Traveler & Issue Coupon</button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-soft/85 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                {["Coupon Code", "Usage State", "Program & Platform", "Traveler Details", "Customer Details", "Reseller Email", "Generated Date", "Actions"].map((column) => <th key={column} className="whitespace-nowrap px-3 py-3.5 font-semibold first:pl-6 last:pr-6">{column}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {props.codes.map((item, index) => {
                const traveler = asRecord(item.traveler);
                const customer = asRecord(item.customer);
                const state = text(item.usage_state) || "N/A";
                const code = text(item.coupon_code) || "N/A";
                const hideRevoke = state === "REVOKED" || state === "USED" || !text(item.coupon_code);
                return (
                  <tr key={code + index} className="align-top transition-colors hover:bg-soft/65">
                    <td className="whitespace-nowrap px-3 py-3 font-mono text-xs">{code} {text(item.coupon_code) ? <button type="button" className="ml-2 font-sans font-semibold text-primary" onClick={() => navigator.clipboard.writeText(text(item.coupon_code)).then(() => toast.success("Coupon Code copied to clipboard!"))}>Copy</button> : null}</td>
                    <td className="px-3 py-3.5"><StatusPill status={state} /></td>
                    <td className="px-3 py-3">{text(item.program_name)} · {text(item.platform)}</td>
                    <td className="max-w-56 px-3 py-3 leading-5">{[text(traveler?.first_name), text(traveler?.last_name), text(traveler?.email), text(traveler?.phone_number), text(traveler?.university_name), text(traveler?.city)].filter(Boolean).join(", ") || "—"}</td>
                    <td className="max-w-56 px-3 py-3 leading-5">{[text(customer?.first_name), text(customer?.last_name), text(customer?.email), text(customer?.phone)].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-3 py-3">{text(item.reseller_email) || "—"}</td>
                    <td className="whitespace-nowrap px-3 py-3">{text(item.generated_at) ? new Date(text(item.generated_at)).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>
                    <td className="px-3 py-3">{hideRevoke ? null : <button type="button" disabled={props.revoking === text(item.coupon_code)} onClick={() => props.onRevoke(item)} className="text-xs font-semibold text-danger">{props.revoking === text(item.coupon_code) ? "..." : "Revoke"}</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex items-center justify-between text-xs">
        <span>Showing page {page} of {pages} (Total {total} coupons)</span>
        <div className="flex gap-2">
          <button type="button" disabled={!props.pagination?.has_previous} onClick={() => props.onPage(page - 1)} className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-line bg-page px-3 text-xs font-semibold text-ink transition hover:border-primary hover:bg-mint/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45">Previous</button>
          <button type="button" disabled={!props.pagination?.has_next} onClick={() => props.onPage(page + 1)} className="inline-flex h-9 cursor-pointer items-center rounded-xl border border-line bg-page px-3 text-xs font-semibold text-ink transition hover:border-primary hover:bg-mint/60 hover:text-primary disabled:cursor-not-allowed disabled:opacity-45">Next</button>
        </div>
      </div>
    </div>
  );
}

function RegisterDialog({ open, programs, preset, onClose }: { open: boolean; programs: JsonRecord[]; preset: string; onClose: (issued: boolean) => void }) {
  const [form, setForm] = useState({ program_id: preset, first_name: "", last_name: "", email: "", dial: "+91", phone: "", address: "", city: "", state: "", postal_code: "", passport_number: "" });
  const [countries, setCountries] = useState<JsonRecord[]>([]);
  const [countryIds, setCountryIds] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [coupon, setCoupon] = useState<JsonRecord | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm((current) => ({ ...current, program_id: preset }));
    setCoupon(null);
    portalRequest<unknown>("/api/coupons?resource=countries").then((res) => {
      const record = asRecord(res);
      setCountries(asList(record?.data ?? res));
    }).catch(() => setCountries([]));
  }, [open, preset]);

  useEffect(() => {
    if (!form.program_id) return;
    portalRequest<JsonRecord>(`/api/coupons?resource=program&id=${encodeURIComponent(form.program_id)}`).then((res) => {
      setCountryIds(matchCountries(asRecord(res.data)?.country_list, countries));
    }).catch(() => setCountryIds([]));
  }, [form.program_id, countries]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.first_name.trim().length < 2 || !form.program_id) {
      toast.error("Please fill in all required fields correctly.");
      return;
    }
    setBusy(true);
    try {
      const res = await portalRequest<JsonRecord>("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          program_id: String(form.program_id),
          first_name: form.first_name,
          last_name: form.last_name,
          email: form.email,
          phone_number: `${form.dial}${form.phone.replace(/\D/g, "")}`,
          address: form.address,
          city: form.city,
          state: form.state,
          postal_code: form.postal_code,
          passport_number: form.passport_number,
          country_id_list: countryIds,
        }),
      });
      if (res.success === false) throw new Error(text(res.message) || "Failed to register traveler and issue coupon.");
      setCoupon(asRecord(asRecord(res.data)?.coupon_data));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Server error occurred while registering traveler.");
    } finally {
      setBusy(false);
    }
  }

  const close = () => {
    if (!busy) onClose(Boolean(coupon));
  };

  return (
    <Modal
      open={open}
      title="Register Traveler & Create Coupon"
      onClose={close}
      footer={
        coupon ? (
          <button
            type="button"
            onClick={() => onClose(true)}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
          >
            Close
          </button>
        ) : (
          <div className="flex w-full items-center justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="register-traveler"
              disabled={busy}
              aria-busy={busy || undefined}
              className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-wait"
            >
              {busy ? "Issuing..." : "Submit"}
            </button>
          </div>
        )
      }
    >
      {coupon ? (
        <div className="space-y-2 text-sm text-ink">
          <p>
            Code: {text(coupon.coupon_code)}{" "}
            <button type="button" className="font-semibold text-primary" onClick={() => navigator.clipboard.writeText(text(coupon.coupon_code)).then(() => toast.success("Coupon Code copied to clipboard!"))}>
              Copy
            </button>
          </p>
          <p className="text-muted">{text(coupon.program_name)} · {text(coupon.discount_percent)}% · expires {text(coupon.expiry_date)}</p>
        </div>
      ) : (
        <form id="register-traveler" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <SelectField
              id="traveler-program"
              label="Program"
              required
              disabled={busy}
              value={form.program_id}
              onChange={(program_id) => setForm({ ...form, program_id })}
            >
              <option value="">Select Program</option>
              {programs.map((item) => (
                <option key={text(item.program_id)} value={text(item.program_id)}>{text(item.program_name)}</option>
              ))}
            </SelectField>
          </div>
          <TextField id="traveler-first-name" label="First Name" required disabled={busy} value={form.first_name} placeholder="Enter First Name" onChange={(first_name) => setForm({ ...form, first_name })} />
          <TextField id="traveler-last-name" label="Last Name" required disabled={busy} value={form.last_name} placeholder="Enter Last Name" onChange={(last_name) => setForm({ ...form, last_name })} />
          <TextField id="traveler-email" label="Email Id" type="email" inputMode="email" required disabled={busy} value={form.email} placeholder="Enter Email" onChange={(email) => setForm({ ...form, email })} />
          <TextField id="traveler-address" label="Address" required disabled={busy} value={form.address} placeholder="Enter Address" onChange={(address) => setForm({ ...form, address })} />
          <TextField id="traveler-city" label="City" required disabled={busy} value={form.city} placeholder="Enter City" onChange={(city) => setForm({ ...form, city })} />
          <TextField id="traveler-state" label="State" required disabled={busy} value={form.state} placeholder="Enter State" onChange={(state) => setForm({ ...form, state })} />
          <TextField id="traveler-postal" label="Postal Code" required disabled={busy} value={form.postal_code} placeholder="Enter Postal Code" onChange={(postal_code) => setForm({ ...form, postal_code })} />
          <TextField id="traveler-passport" label="Passport Number" required disabled={busy} value={form.passport_number} placeholder="Enter Passport Number" onChange={(passport_number) => setForm({ ...form, passport_number })} />
          <SelectField id="traveler-dial" label="Country code" disabled={busy} value={form.dial} onChange={(dial) => setForm({ ...form, dial })}>
            <option value="+91">India +91</option>
            <option value="+44">United Kingdom +44</option>
            <option value="+1">United States +1</option>
          </SelectField>
          <TextField id="traveler-phone" label="Phone" inputMode="tel" required disabled={busy} value={form.phone} placeholder="Enter phone" onChange={(phone) => setForm({ ...form, phone })} />
        </form>
      )}
    </Modal>
  );
}

function parsePackages(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function packageLabel(value: unknown) {
  const id = text(value);
  return /^[0-9a-f-]{32,}$/i.test(id) ? `Pkg ${id.slice(0, 8)}...` : `Package ${id}`;
}

function matchCountries(list: unknown, countries: JsonRecord[]) {
  if (!Array.isArray(list)) return [];
  const ids: number[] = [];
  for (const entry of list) {
    const raw = String(entry).trim().toLowerCase();
    const numeric = Number(entry);
    const match = countries.find((item) => {
      const id = Number(item.id ?? item.country_id);
      const iso2 = text(item.iso2 || item.iso_two || item.isotwo).toLowerCase();
      const iso3 = text(item.iso3 || item.iso_three).toLowerCase();
      const name = text(item.name || item.country_name).toLowerCase();
      return (Number.isFinite(id) && id === numeric) || iso2 === raw || iso3 === raw || name === raw;
    });
    const id = Number(match?.id ?? match?.country_id);
    if (Number.isFinite(id) && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function num(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}
