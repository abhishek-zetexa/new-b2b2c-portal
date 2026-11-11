"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  FiCheck,
  FiCopy,
  FiCpu,
  FiPlus,
  FiSearch,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { Pagination } from "@/components/ui/pagination";
import { WaveLoader } from "@/components/ui/wave-loader";
import { AssignSimModal } from "@/components/portal/assign-sim-modal";
import {
  statusBadgeTone,
  type SimInventoryListResponse,
  type SimInventoryRecord,
} from "@/lib/sim-inventory";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function StatusBadge({ status }: { status: string }) {
  const clean = status.trim();
  if (!clean) {
    return <span className="text-xs text-muted">—</span>;
  }

  const tone = statusBadgeTone(clean);
  const toneClasses =
    tone === "ok"
      ? "bg-mint text-primary"
      : tone === "warn"
        ? "bg-danger/10 text-danger"
        : "border border-line bg-page text-muted";
  const dotClasses =
    tone === "ok"
      ? "bg-primary"
      : tone === "warn"
        ? "bg-danger"
        : "bg-muted";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} aria-hidden="true" />
      <span>{clean}</span>
    </span>
  );
}

function CopyIccidButton({
  iccid,
  copied,
  onCopy,
}: {
  iccid: string;
  copied: boolean;
  onCopy: (iccid: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCopy(iccid)}
      aria-label={copied ? `Copied ICCID ${iccid}` : `Copy ICCID ${iccid}`}
      title={copied ? "Copied!" : "Copy ICCID"}
      className={`inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition ${
        copied
          ? "border-primary/35 bg-mint text-primary"
          : "border-line bg-page text-muted hover:border-primary/50 hover:text-primary"
      }`}
    >
      {copied ? (
        <FiCheck className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <FiCopy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

function SimSkeletonList() {
  return (
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center justify-center">
        <WaveLoader size="md" label="Loading SIM inventory" />
      </div>
      <div className="hidden space-y-3 md:block">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-12 items-center gap-4 rounded-2xl border border-line/70 bg-page/55 px-4 py-3.5"
          >
            <div className="col-span-3 h-3.5 animate-pulse rounded-full bg-soft" />
            <div className="col-span-3 h-3.5 animate-pulse rounded-full bg-soft" />
            <div className="col-span-3 h-3.5 animate-pulse rounded-full bg-soft" />
            <div className="col-span-1 h-6 animate-pulse rounded-full bg-soft" />
            <div className="col-span-2 h-6 animate-pulse rounded-full bg-soft" />
          </div>
        ))}
      </div>
      <div className="space-y-3 md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-line/70 bg-page/55 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-3.5 w-44 animate-pulse rounded-full bg-soft" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-soft" />
            </div>
            <div className="h-3 w-36 animate-pulse rounded-full bg-soft" />
            <div className="h-3 w-48 animate-pulse rounded-full bg-soft" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimInventoryView() {
  const [items, setItems] = useState<SimInventoryRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchDraft, setSearchDraft] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalKey, setAssignModalKey] = useState(0);

  const [copiedIccid, setCopiedIccid] = useState("");

  const listAbortRef = useRef<AbortController | null>(null);
  const copyTimerRef = useRef<number | null>(null);

  const redirectToLogin = useCallback(() => {
    window.location.replace("/login");
  }, []);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  // Debounce search input (300ms) and reset to page 1.
  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === activeSearch) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setActiveSearch(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, activeSearch]);

  useEffect(() => {
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    async function loadInventory() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search_key: activeSearch,
      });

      try {
        const response = await fetch(`/api/sim-inventory?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data = (await response.json().catch(() => ({}))) as Partial<
          SimInventoryListResponse & { message?: string }
        >;

        if (controller.signal.aborted) return;

        if (!response.ok) {
          setError(data.message || "Failed to load SIM inventory.");
          setItems([]);
          setTotalCount(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        const nextTotalCount =
          typeof data.totalCount === "number" && data.totalCount >= 0
            ? data.totalCount
            : 0;
        const nextTotalPages =
          typeof data.totalPages === "number" && data.totalPages >= 1
            ? data.totalPages
            : Math.max(1, Math.ceil(nextTotalCount / pageSize));

        if (page > nextTotalPages) {
          setPage(nextTotalPages);
          return;
        }

        setItems(Array.isArray(data.items) ? data.items : []);
        setTotalCount(nextTotalCount);
        setTotalPages(nextTotalPages);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Cannot reach the SIM inventory service. Try again in a moment.");
        setItems([]);
        setLoading(false);
      }
    }

    void loadInventory();
    return () => controller.abort();
  }, [page, pageSize, activeSearch, reloadTick, redirectToLogin]);

  function openAssignModal() {
    setAssignModalKey((v) => v + 1);
    setAssignModalOpen(true);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    if (trimmed !== activeSearch) {
      setPage(1);
      setActiveSearch(trimmed);
    }
  }

  function clearSearch() {
    setSearchDraft("");
    setActiveSearch("");
    setPage(1);
  }

  function handlePageSizeChange(nextSize: number) {
    setPageSize(nextSize);
    setPage(1);
  }

  async function handleCopyIccid(iccid: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(iccid);
      }
      setCopiedIccid(iccid);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedIccid("");
      }, 1800);
    } catch {
      // Clipboard access denied or unavailable.
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          SIM Inventory
        </h1>

        <button
          type="button"
          onClick={openAssignModal}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary shadow-xs transition hover:bg-primary-hover sm:w-auto"
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          <span>Assign Sim</span>
        </button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <span
              role="tab"
              aria-selected="true"
              className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-semibold text-primary"
            >
              <FiCpu className="h-3.5 w-3.5" aria-hidden="true" />
              <span>ICCID</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                {totalCount}
              </span>
            </span>
            {loading && items.length > 0 ? (
              <span className="inline-flex items-center gap-2 px-1 text-xs font-medium text-muted">
                <WaveLoader size="sm" label="Refreshing" />
              </span>
            ) : null}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs md:max-w-sm">
            <FiSearch
              className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search ICCID, agent name, or email..."
              aria-label="Search SIM inventory"
              className="h-10 w-full rounded-2xl border border-line bg-page pr-9 pl-10 text-sm text-ink outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_45%,transparent)] focus:border-primary focus:shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
            />
            {searchDraft ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={clearSearch}
                className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
              >
                <FiX className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </form>
        </div>

        {loading && items.length === 0 ? (
          <SimSkeletonList />
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
              <FiCpu className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-semibold text-ink">
              Unable to load SIM inventory
            </p>
            <p className="mt-1 max-w-md text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setReloadTick((value) => value + 1)}
              className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary">
              {activeSearch ? (
                <FiSearch className="h-6 w-6" aria-hidden="true" />
              ) : (
                <FiCpu className="h-6 w-6" aria-hidden="true" />
              )}
            </span>
            <p className="mt-4 text-base font-semibold text-ink">
              {activeSearch ? "No matching ICCIDs found" : "No data found"}
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-muted">
              {activeSearch
                ? `No SIM records matched "${activeSearch}". Check the ICCID, agent name, or email and try again.`
                : "No SIMs are in your inventory yet. Assign SIM ranges to your sub-agents to get started."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {activeSearch ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-line bg-page px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                >
                  Clear search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openAssignModal}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
                >
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Assign Sim</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop & tablet view */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-page/75 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                    <th className="py-3.5 pr-3 pl-6">ICCID</th>
                    <th className="px-3 py-3.5">Agent Name</th>
                    <th className="px-3 py-3.5">Agent Email</th>
                    <th className="px-3 py-3.5">Sim Status</th>
                    <th className="py-3.5 pr-6 pl-3">IMSI Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((row) => (
                    <tr
                      key={row.iccid}
                      className="transition-colors hover:bg-soft/65"
                    >
                      <td className="py-3.5 pr-3 pl-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-semibold text-ink tabular-nums">
                            {row.iccid}
                          </span>
                          <CopyIccidButton
                            iccid={row.iccid}
                            copied={copiedIccid === row.iccid}
                            onCopy={handleCopyIccid}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3.5 font-medium text-ink">
                        {row.agentName || <span className="text-muted">—</span>}
                      </td>
                      <td className="px-3 py-3.5 text-ink">
                        <span
                          className="block max-w-[16rem] truncate"
                          title={row.agentEmail || undefined}
                        >
                          {row.agentEmail || <span className="text-muted">—</span>}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <StatusBadge status={row.simStatus} />
                      </td>
                      <td className="py-3.5 pr-6 pl-3">
                        <StatusBadge status={row.imsiStatus} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Small mobile card layout (<768px) */}
            <div className="divide-y divide-line md:hidden">
              {items.map((row) => (
                <article key={row.iccid} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                        ICCID
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold break-all text-ink tabular-nums">
                          {row.iccid}
                        </span>
                        <CopyIccidButton
                          iccid={row.iccid}
                          copied={copiedIccid === row.iccid}
                          onCopy={handleCopyIccid}
                        />
                      </div>
                    </div>
                    <StatusBadge status={row.simStatus} />
                  </div>

                  <div className="grid grid-cols-1 gap-2 rounded-2xl border border-line/70 bg-page/60 p-3 text-xs sm:grid-cols-2">
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                        Agent Name
                      </span>
                      <span className="mt-0.5 block truncate font-semibold text-ink">
                        {row.agentName || "—"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                        Agent Email
                      </span>
                      <span className="mt-0.5 block truncate text-ink">
                        {row.agentEmail || "—"}
                      </span>
                    </div>
                    <div className="min-w-0 sm:col-span-2">
                      <span className="mb-1 block text-[10px] font-semibold tracking-[0.1em] text-muted uppercase">
                        IMSI Status
                      </span>
                      <StatusBadge status={row.imsiStatus} />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={totalCount}
              totalPages={totalPages}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              disabled={loading}
              itemLabel="SIMs"
            />
          </>
        )}
      </section>

      {assignModalOpen ? (
        <AssignSimModal
          key={assignModalKey}
          open
          onClose={() => setAssignModalOpen(false)}
          onUnauthorized={redirectToLogin}
          onAssigned={(message) => {
            setAssignModalOpen(false);
            toast.success(message);
            setPage(1);
            setReloadTick((value) => value + 1);
          }}
        />
      ) : null}
    </div>
  );
}

