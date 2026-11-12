"use client";

import { useEffect, useMemo, useState } from "react";
import { usePartner } from "@/components/shell/partner-context";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "react-toastify";
import { asList, asRecord, num, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";

const platforms = [
  { label: "All Platforms", value: "ALL" },
  { label: "Payment Link Sales", value: "P5" },
  { label: "Wallet Sales", value: "P3" },
  { label: "Microsite Sales", value: "P1" },
  { label: "API Client", value: "P2" },
];
const bundleColors = ["#9564F8", "#7F77DD", "#AFA9EC", "#534AB7", "#8B89C8", "#3C3489"];
const ancillaryCards = [
  ["Meet & Greet", "MeetAndGreet"],
  ["VIP Service", "VipService"],
  ["Business Lounge", "BusinessLounge"],
  ["Fast Track", "FastTrack"],
] as const;

function CountChip({ value }: { value: number }) {
  return <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">{value}</span>;
}

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthStart() {
  const today = new Date();
  return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
}

export function ReportsView() {
  const partner = usePartner();
  const initial = monthStart();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [platform, setPlatform] = useState("ALL");
  const [search, setSearch] = useState("");
  const [agentId, setAgentId] = useState("");
  const [agentQuery, setAgentQuery] = useState("");
  const [includeSubs, setIncludeSubs] = useState(false);
  const [agents, setAgents] = useState<JsonRecord[]>([]);
  const [tab, setTab] = useState<"esim" | "ancillary" | "localSim">("esim");
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [esim, setEsim] = useState<JsonRecord[]>([]);
  const [ancillary, setAncillary] = useState<JsonRecord[]>([]);
  const [localSim, setLocalSim] = useState<JsonRecord[]>([]);
  const [page, setPage] = useState(1);
  const [localPage, setLocalPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [localPageSize, setLocalPageSize] = useState(10);
  const [bundlesOpen, setBundlesOpen] = useState(true);

  const baseBody = () => ({ fromDate: from, toDate: to });

  async function fetchReports(body: Record<string, unknown>) {
    const res = await portalRequest<JsonRecord>("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = asRecord(res.data);
    const next = {
      esim: asList(data?.esimOrderResponses),
      ancillary: asList(data?.highPassResponses),
      localSim: asList(data?.mvnoOrderResponses),
    };
    setEsim(next.esim);
    setAncillary(next.ancillary);
    setLocalSim(next.localSim);
    return next;
  }

  useEffect(() => {
    if (!partner.ready) return;
    if (partner.role === "RESELLER_AGENT" ? !partner.agentId : !partner.resellerId) {
      toast.error("Invalid user ID. Please log in again or contact support.");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    fetchReports(baseBody())
      .catch((err: Error) => toast.error(err.message || "Failed to fetch data. Please try again."))
      .finally(() => setLoading(false));
    if (partner.role === "RESELLER_ADMIN") {
      portalRequest<JsonRecord>("/api/reports")
        .then((res) => setAgents(asList(res.agents ?? res.data ?? res)))
        .catch((err: Error) => toast.error(err.message || "Failed to fetch agent list"));
    }
    // The first fetch uses the dates captured on load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner.ready, partner.role, partner.agentId, partner.resellerId]);

  async function submit() {
    if (!from || !to) {
      toast.error("Please select a date range before submitting.");
      return;
    }
    const platformValue = platform === "ALL" ? "ALL" : platform === "P5" ? "Payment Link Sales" : platform === "P3" ? "Wallet Sales" : platform === "P1" ? "Microsite Sales" : "";
    const body: Record<string, unknown> = { ...baseBody() };
    if (platformValue) body.platform = platformValue;
    if (search.trim()) body.filterRequest = search.trim();
    if (partner.role === "RESELLER_ADMIN") {
      body.specific_sub_agent = agentId;
      body.include_all_subagents = agentId ? includeSubs : false;
    }
    setLoading(true);
    setHasSearched(true);
    setEsim([]);
    setAncillary([]);
    setLocalSim([]);
    setPage(1);
    setLocalPage(1);
    try {
      await fetchReports(body);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch data. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const currency = text(esim[0]?.currency) || "USD";
  const bundles = useMemo(() => topBundles(esim), [esim]);
  const visibleAgents = agents.filter((agent) => text(agent.email).toLowerCase().includes(agentQuery.toLowerCase()));

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Reports</h1>
      <div className="grid gap-3 rounded-3xl border border-line bg-surface p-4 shadow-[var(--shadow)] sm:p-5 md:grid-cols-2 xl:grid-cols-4">
        <input type="date" max={iso(new Date())} value={from} onChange={(event) => setFrom(event.target.value)} className="field" />
        <input type="date" max={iso(new Date())} value={to} onChange={(event) => setTo(event.target.value)} className="field" />
        <select value={platform} onChange={(event) => setPlatform(event.target.value)} className="field">
          {platforms.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Please enter ICCID or Customer email or Reference" className="field xl:col-span-2" />
        {partner.role === "RESELLER_ADMIN" ? (
          <>
            <input value={agentQuery} onChange={(event) => setAgentQuery(event.target.value)} placeholder="Search.." className="field" />
            <select value={agentId} onChange={(event) => { setAgentId(event.target.value); setIncludeSubs(false); }} className="field">
              <option value="">All Agents</option>
              {visibleAgents.map((agent) => <option key={text(agent.agent_id || agent.id)} value={text(agent.agent_id || agent.id)}>{text(agent.email)}</option>)}
            </select>
            {agentId ? (
              <select value={includeSubs ? "subs" : "only"} onChange={(event) => setIncludeSubs(event.target.value === "subs")} className="field">
                <option value="only">This Agent Only</option>
                <option value="subs">Include Sub-Agents</option>
              </select>
            ) : null}
          </>
        ) : null}
        <div className="flex flex-wrap gap-2 md:col-span-2 xl:col-span-4">
          <button type="button" disabled={loading} onClick={submit} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50">{loading ? "Loading..." : "Submit"}</button>
          <button type="button" onClick={() => exportWorkbook({ from, to, esim, ancillary, localSim, fetchBase: () => fetchReports(baseBody()) })} className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary">Export</button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
        <TabsList>
          <TabsTrigger value="esim">eSIM {esim.length > 0 ? <CountChip value={esim.length} /> : null}</TabsTrigger>
          <TabsTrigger value="ancillary">Ancillary {ancillary.length > 0 ? <CountChip value={ancillary.length} /> : null}</TabsTrigger>
          <TabsTrigger value="localSim">Local SIM {localSim.length > 0 ? <CountChip value={localSim.length} /> : null}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "esim" ? (
        <>
          <section className="rounded-3xl border border-line bg-surface p-4">
            <button type="button" onClick={() => setBundlesOpen((open) => !open)} className="font-semibold">Top Bundles</button>
            {bundlesOpen ? <BundlePanel rows={bundles.all} top={bundles.top} currency={currency} maxOrders={bundles.max} from={from} to={to} /> : null}
          </section>
          <DataTable
            loading={loading}
            rows={esim}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onSize={(size) => { setPageSize(size); setPage(1); }}
            empty={hasSearched ? "No records found" : ""}
            columns={["SL NO", "ICCID", "Package Name", "Reseller Name", "Reseller Email", "Agent Name", "Agent Email", "Customer name", "Customer Email", "Customer Nation", "Package Price", "Tax", "Customer Price", "Profit / Profit Percentage"]}
            render={(row, index) => [
              String(index),
              dash(row.iccid),
              dash(row.packageName),
              dash(row.resellerFullName),
              dash(row.resellerEmail),
              dash(row.agentFullName),
              dash(row.agentEmail),
              dash(row.customerFullName),
              dash(row.customerEmail),
              dash(row.customerNationality),
              price(row.packagePrice, row.currency),
              price(row.tax, row.currency),
              price(row.customerPrice, row.currency),
              dash(row.profitAndProfitPercentage),
            ]}
          />
        </>
      ) : null}

      {tab === "ancillary" ? <AncillaryView rows={ancillary} loading={loading} /> : null}
      {tab === "localSim" ? (
        <DataTable
          loading={loading}
          rows={localSim}
          page={localPage}
          pageSize={localPageSize}
          onPage={setLocalPage}
          onSize={(size) => { setLocalPageSize(size); setLocalPage(1); }}
          empty={hasSearched ? "No local SIM records found" : ""}
          columns={["SL NO", "ICCID", "MSISDN", "Plan", "Type", "Customer", "Email", "Phone", "Country", "SIM", "Status", "Data", "Talk", "Text", "Unit Price", "Customer Price", "Order Placed"]}
          render={(row, index) => [
            String(index),
            dash(row.iccid),
            dash(row.msisdn),
            dash(row.displayName || row.planName),
            orderType(text(row.orderType)),
            dash(`${text(row.firstName)} ${text(row.lastName)}`.trim()),
            dash(row.email),
            dash(row.phone),
            dash(row.country),
            simType(text(row.simType)),
            dash(row.simStatus),
            formatData(row.data),
            formatTalk(row.talk),
            formatCount(row.text),
            price(row.unitPrice, row.currency),
            price(row.customerUnitPrice, row.currency),
            formatLocal(text(row.orderPlacedOn)),
          ]}
        />
      ) : null}
    </div>
  );
}

function DataTable({ loading, rows, page, pageSize, onPage, onSize, empty, columns, render }: {
  loading: boolean;
  rows: JsonRecord[];
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onSize: (size: number) => void;
  empty: string;
  columns: string[];
  render: (row: JsonRecord, index: number) => string[];
}) {
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const start = (page - 1) * pageSize;
  const slice = rows.slice(start, start + pageSize);
  if (loading) {
    return <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]"><div className="space-y-2 px-6 py-8">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-8 animate-pulse rounded-full bg-soft" />)}</div></div>;
  }
  if (!rows.length) {
    return empty ? (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow)]">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary"><span className="text-lg font-semibold">—</span></span>
        <p className="mt-4 text-base font-semibold text-ink">{empty}</p>
      </div>
    ) : null;
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
      <div className="divide-y divide-line md:hidden">
        {slice.map((row, index) => (
          <article key={start + index} className="space-y-2 p-4">
            {render(row, start + index + 1).map((cell, cellIndex) => (
              <div key={columns[cellIndex]} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-muted">{columns[cellIndex]}</span>
                <span className="max-w-[58%] break-words text-right">{cell}</span>
              </div>
            ))}
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-soft/85 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
              {columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-3.5 font-semibold first:pl-6 last:pr-6">{column}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {slice.map((row, index) => (
              <tr key={start + index} className="transition-colors hover:bg-soft/65">
                {render(row, start + index + 1).map((cell, cellIndex) => <td key={cellIndex} className="whitespace-nowrap px-3 py-3.5 first:pl-6 last:pr-6">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={rows.length}
        totalPages={pages}
        pageSizeOptions={[10, 25, 50, 100]}
        onPageChange={onPage}
        onPageSizeChange={onSize}
        disabled={loading}
        itemLabel="records"
      />
    </div>
  );
}

function AncillaryView({ rows, loading }: { rows: JsonRecord[]; loading: boolean }) {
  if (loading) return <div className="space-y-2">{Array.from({ length: 5 }, (_, index) => <div key={index} className="h-8 animate-pulse rounded-xl bg-mist" />)}</div>;
  const total = rows.reduce((sum, row) => sum + num(row.customerUnitPrice), 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {ancillaryCards.map(([label, key]) => {
          const matched = rows.filter((row) => text(row.displayName) === key);
          const revenue = matched.reduce((sum, row) => sum + num(row.customerUnitPrice), 0);
          return <article key={key} className="rounded-3xl border border-line bg-surface p-4"><p className="text-sm font-semibold">{label}</p><p className="mt-1 text-xs text-muted">{matched.length} orders</p><p className="mt-1 font-semibold">{money(revenue)}</p></article>;
        })}
      </div>
      <p className="text-sm">Total orders {rows.length}. Total revenue {money(total)}.</p>
      <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
        <table className="w-full min-w-[980px] text-left text-xs">
          <thead className="uppercase text-muted"><tr>{["SL NO", "Display Name", "Service Name", "Location", "Terminal", "Reseller Email", "Customer", "Nationality", "Unit Price", "Customer Price", "Service Date", "Order Placed"].map((column) => <th key={column} className="px-2 py-2">{column}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line">
                {[String(index + 1), dash(row.displayName), dash(row.serviceName), dash(row.locationName), dash(row.terminal), dash(row.resellerEmail), dash(`${text(row.firstName)} ${text(row.lastName)}`.trim()), dash(row.nationality), price(row.unitPrice, "USD"), price(row.customerUnitPrice, "USD"), formatLocal(text(row.serviceDateAndTime)), formatLocal(text(row.orderPlacedOn))].map((cell, cellIndex) => <td key={cellIndex} className="px-2 py-2">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BundlePanel({ rows, top, currency, maxOrders, from, to }: { rows: Bundle[]; top: Bundle[]; currency: string; maxOrders: number; from: string; to: string }) {
  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  return (
    <div className="mt-4 space-y-3">
      {top.map((bundle, index) => (
        <div key={bundle.name}>
          <div className="flex justify-between text-xs"><span>#{index + 1} {bundle.name}</span><span>{bundle.orders} orders · {money(bundle.revenue, currency)} · {share(bundle.revenue, totalRevenue)}% · avg {money(bundle.orders ? bundle.revenue / bundle.orders : 0, currency)}</span></div>
          <div className="mt-1 h-2 rounded-full bg-mist"><div className="h-2 rounded-full" style={{ width: `${maxOrders ? (bundle.orders / maxOrders) * 100 : 0}%`, background: bundleColors[index] || bundleColors[0] }} /></div>
        </div>
      ))}
      <button type="button" onClick={() => exportBundles(rows, from, to)} className="text-xs font-semibold text-primary">Export packages</button>
    </div>
  );
}

type Bundle = { name: string; orders: number; revenue: number };

function topBundles(rows: JsonRecord[]) {
  const map = new Map<string, Bundle>();
  for (const row of rows) {
    const name = text(row.packageName) || "Unknown";
    const current = map.get(name) || { name, orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += num(row.packagePrice);
    map.set(name, current);
  }
  const all = Array.from(map.values()).sort((a, b) => b.orders - a.orders);
  return { all, top: all.slice(0, 6), max: all[0]?.orders || 0 };
}

function share(revenue: number, total: number) {
  if (!total) return 0;
  return Math.round((revenue / total) * 1000) / 10;
}

function dash(value: unknown) {
  const raw = text(value);
  return raw ? raw : "-";
}

function price(value: unknown, currency: unknown) {
  if (value == null || value === "") return "-";
  return `${text(currency) || "USD"} ${num(value).toFixed(2)}`;
}

function money(value: number, currency = "USD") {
  return `${currency} ${value.toFixed(2)}`;
}

function orderType(value: string) {
  const map: Record<string, string> = { order: "Order", renew: "Renew", topup: "Top Up", "change plan": "Change Plan" };
  return value ? map[value.toLowerCase()] || value : "-";
}

function simType(value: string) {
  if (!value) return "-";
  return value.toLowerCase() === "esim" ? "eSIM" : value;
}

function formatData(value: unknown) {
  if (value == null || value === "") return "-";
  const raw = String(value).trim();
  if (raw.toLowerCase() === "unlimited") return "Unlimited";
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return raw;
  if (amount >= 1024) {
    const gb = amount / 1024;
    return `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB`;
  }
  return `${amount} MB`;
}

function formatTalk(value: unknown) {
  if (!hasAllowance(value)) return "-";
  const raw = String(value).trim();
  if (raw.toLowerCase() === "unlimited") return "Unlimited";
  return /^\d+(\.\d+)?$/.test(raw) ? `${Number(raw)} min` : raw;
}

function formatCount(value: unknown) {
  if (!hasAllowance(value)) return "-";
  const raw = String(value).trim();
  return raw.toLowerCase() === "unlimited" ? "Unlimited" : raw;
}

function hasAllowance(value: unknown) {
  if (value == null || value === "") return false;
  const raw = String(value).trim().toLowerCase();
  return raw !== "0" && raw !== "0.0" && raw !== "0.00";
}

function formatLocal(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-US", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function workbook() {
  await new Promise<void>((resolve, reject) => {
    const existing = (window as unknown as { XLSX?: unknown }).XLSX;
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load export library."));
    document.head.appendChild(script);
  });
  return (window as unknown as { XLSX: { utils: { book_new: () => unknown; aoa_to_sheet: (rows: unknown[][]) => { "!cols"?: unknown; "!freeze"?: unknown }; book_append_sheet: (book: unknown, sheet: unknown, name: string) => void }; writeFile: (book: unknown, name: string) => void } }).XLSX;
}

async function exportBundles(rows: Bundle[], from: string, to: string) {
  const XLSX = await workbook();
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Package Name", "Total Orders", "Total Revenue"], ...rows.map((row) => [row.name, row.orders, row.revenue])]);
  XLSX.utils.book_append_sheet(book, sheet, "Packages");
  XLSX.writeFile(book, `packages_${from}_to_${to}.xlsx`);
}

async function exportWorkbook({ from, to, esim, ancillary, localSim, fetchBase }: { from: string; to: string; esim: JsonRecord[]; ancillary: JsonRecord[]; localSim: JsonRecord[]; fetchBase: () => Promise<{ esim: JsonRecord[]; ancillary: JsonRecord[]; localSim: JsonRecord[] }> }) {
  let esimRows = esim;
  let ancillaryRows = ancillary;
  let localRows = localSim;
  if (!esimRows.length && !ancillaryRows.length && !localRows.length) {
    try {
      const loaded = await fetchBase();
      esimRows = loaded.esim;
      ancillaryRows = loaded.ancillary;
      localRows = loaded.localSim;
    } catch {
      toast.error("Failed to fetch data. Please try again.");
      return;
    }
  }
  if (!esimRows.length && !ancillaryRows.length && !localRows.length) {
    toast.error("No data available to export.");
    return;
  }
  const XLSX = await workbook();
  const book = XLSX.utils.book_new();
  const add = (name: string, headers: string[], data: unknown[][]) => {
    if (!data.length) return;
    const sheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    sheet["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
    XLSX.utils.book_append_sheet(book, sheet, name);
  };
  add("eSIM Orders", ["ICCID", "Order ID", "Order Line Id", "Order Placed On", "Reseller Name", "Reseller Email", "Reseller Company", "Agent Name", "Agent Email", "Agent Company", "Customer Name", "Customer Email", "Customer Nationality", "Package Name", "Package Country", "Package Data (GB)", "Package Duration (Days)", "Plan Type", "Quantity", "Type Of Order", "Currency", "Package Price", "Tax", "Customer Price", "Coupon Code", "Coupon Value", "Coins Amount", "Profit", "Platform", "Reseller Comment", "Order Reference Id", "Order Reference Number"], esimRows.map((row) => ["iccid", "orderId", "orderLineId", "orderPlacedOn", "resellerFullName", "resellerEmail", "resellerCompany", "agentFullName", "agentEmail", "agentCompanyName", "customerFullName", "customerEmail", "customerNationality", "packageName", "packageCountry", "packageData", "periodDays", "planType", "quantity", "typeOfOrder", "currency", "packagePrice", "tax", "customerPrice", "couponCode", "couponValue", "coinsAmount", "profitAndProfitPercentage", "platform", "resellerComment", "resellerOrderReferenceId", "resellerOrderReferenceNumber"].map((key) => text(row[key]))));
  add("Ancillary", ["Order Placed On", "Reseller Email", "First Name", "Last Name", "Nationality", "Service Name", "Display Name", "Unit Price", "Customer Unit Price", "Location Code", "Location Name", "Terminal", "Service Date & Time"], ancillaryRows.map((row) => ["orderPlacedOn", "resellerEmail", "firstName", "lastName", "nationality", "serviceName", "displayName", "unitPrice", "customerUnitPrice", "locationCode", "locationName", "terminal", "serviceDateAndTime"].map((key) => text(row[key]))));
  add("Local SIM Orders", ["Order Placed On", "MVNO Order ID", "Order By", "Order Type", "First Name", "Last Name", "Email", "Phone", "Nationality", "ICCID", "MSISDN", "SIM Type", "SIM Status", "Country", "Travel Date", "Plan ID", "Display Name", "Plan Name", "Plan Start", "Plan End", "Plan Activated", "Talk", "Text", "Data", "Quantity", "Currency", "Unit Price", "Customer Unit Price", "Reseller Unit Price", "KYC Completed"], localRows.map((row) => ["orderPlacedOn", "mvnoOrderId", "orderBy", "orderType", "firstName", "lastName", "email", "phone", "nationality", "iccid", "msisdn", "simType", "simStatus", "country", "travelDate", "planId", "displayName", "planName", "planStartDate", "planEndDate", "planActivatedDateTime", "talk", "text", "data", "quantity", "currency", "unitPrice", "customerUnitPrice", "resellerUnitPrice"].map((key) => text(row[key])).concat(row.kycCompleted ? "Yes" : "No")));
  XLSX.writeFile(book, `orders_${from}_to_${to}.xlsx`);
  toast.success("Excel exported successfully");
}
