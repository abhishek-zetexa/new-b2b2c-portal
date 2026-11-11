"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { FlagImage } from "react-international-phone";
import {
  FiEdit2,
  FiGlobe,
  FiMail,
  FiMoreHorizontal,
  FiPhone,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { Pagination } from "@/components/ui/pagination";
import { WaveLoader } from "@/components/ui/wave-loader";
import { CustomerDeleteModal } from "@/components/portal/customer-delete-modal";
import { CustomerFormModal } from "@/components/portal/customer-form-modal";
import {
  customerInitials,
  type CustomerCountryOption,
  type CustomerListResponse,
  type CustomerRecord,
} from "@/lib/customers";

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const;

type MenuPlacement = {
  top: number;
  left: number;
  openAbove: boolean;
};

function CustomerAvatar({ name, src }: { name: string; src: string }) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        loading="lazy"
        onError={() => setBroken(true)}
        className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-line"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-primary ring-1 ring-primary/15"
    >
      {customerInitials(name)}
    </span>
  );
}

function CountryBadge({
  country,
  countryCode,
}: {
  country: string;
  countryCode: string;
}) {
  const iso2 = countryCode.trim().toLowerCase();
  const hasIso2 = /^[a-z]{2}$/.test(iso2);

  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-page px-2.5 py-1 text-xs font-medium text-ink">
      {hasIso2 ? (
        <FlagImage iso2={iso2} size="1rem" className="shrink-0" />
      ) : (
        <FiGlobe className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
      )}
      <span className="truncate">{country || "NA"}</span>
    </span>
  );
}

function RowActionsMenu({
  customer,
  onEdit,
  onDelete,
}: {
  customer: CustomerRecord;
  onEdit: (customer: CustomerRecord) => void;
  onDelete: (customer: CustomerRecord) => void;
}) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<MenuPlacement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setOpen(false);
  }, []);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const button = triggerRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 176;
    const estimatedHeight = 132;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setPlacement({
      top: openAbove ? rect.top - 8 : rect.bottom + 8,
      left,
      openAbove,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      closeMenu();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    }

    function handleViewportChange() {
      closeMenu();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, [open, closeMenu]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${customer.name}`}
        title="Actions"
        className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition ${
          open
            ? "border-primary bg-mint text-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
            : "border-line bg-page text-muted hover:border-primary/45 hover:bg-mint/60 hover:text-primary"
        }`}
      >
        <FiMoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && placement && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Actions for ${customer.name}`}
              style={{
                position: "fixed",
                top: placement.top,
                left: placement.left,
                transform: placement.openAbove ? "translateY(-100%)" : undefined,
              }}
              className="z-50 w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_color-mix(in_srgb,var(--navy)_18%,transparent)]"
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                Quick Actions
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onEdit(customer);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink transition hover:bg-mint/70 hover:text-primary"
              >
                <FiEdit2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onDelete(customer);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-danger transition hover:bg-danger/10"
              >
                <FiTrash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Delete</span>
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function CustomerSkeletonList() {
  return (
    <div className="px-4 py-6 sm:px-6" aria-busy="true">
      <div className="mb-6 flex flex-col items-center justify-center gap-2.5 py-3 text-center">
        <WaveLoader size="lg" label="Loading customers" />
        <p className="text-sm font-medium text-muted">Loading customers...</p>
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map((row) => (
          <div
            key={row}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line/70 bg-page/60 px-4 py-3.5 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-mint/70" />
              <div className="space-y-2">
                <span className="block h-3.5 w-32 rounded-full bg-line" />
                <span className="block h-2.5 w-44 rounded-full bg-line/70" />
              </div>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <span className="h-6 w-24 rounded-full bg-line/70" />
              <span className="h-9 w-9 rounded-xl bg-line/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerManagementView() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchDraft, setSearchDraft] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [countries, setCountries] = useState<CustomerCountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRecord | null>(null);
  const [formInstanceKey, setFormInstanceKey] = useState(0);
  const [deletingCustomer, setDeletingCustomer] = useState<CustomerRecord | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);

  const redirectToLogin = useCallback(() => {
    window.location.replace("/login");
  }, []);

  // Debounce search input (300ms) and reset pagination back to page 1.
  useEffect(() => {
    const trimmed = searchDraft.trim();
    if (trimmed === activeQuery) return;
    const timer = window.setTimeout(() => {
      setPage(1);
      setActiveQuery(trimmed);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchDraft, activeQuery]);

  // Fetch customer list whenever page, pageSize, activeQuery, or reloadTick changes.
  useEffect(() => {
    listAbortRef.current?.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    async function load() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        query: activeQuery,
      });

      try {
        const response = await fetch(`/api/customers?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data = (await response.json().catch(() => ({}))) as Partial<
          CustomerListResponse & { message?: string }
        >;

        if (controller.signal.aborted) return;

        if (!response.ok) {
          setError(data.message || "Failed to load customers.");
          setCustomers([]);
          setTotalCustomers(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        const rows = Array.isArray(data.customers) ? data.customers : [];
        const total = typeof data.totalCustomers === "number" ? data.totalCustomers : rows.length;
        const pages =
          typeof data.totalPages === "number" && data.totalPages >= 1
            ? data.totalPages
            : Math.max(1, Math.ceil(total / pageSize));

        if (rows.length === 0 && total > 0 && page > pages) {
          setPage(pages);
          return;
        }

        setCustomers(rows);
        setTotalCustomers(total);
        setTotalPages(pages);
        setLoading(false);
      } catch (reason: unknown) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Cannot reach the customer service. Try again in a moment.");
        setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [page, pageSize, activeQuery, reloadTick, redirectToLogin]);

  const ensureCountriesLoaded = useCallback(async () => {
    if (countries.length > 0 || loadingCountries) return;
    setLoadingCountries(true);
    try {
      const response = await fetch("/api/customers/countries");
      if (!response.ok) return;
      const data = (await response.json()) as unknown;
      if (Array.isArray(data)) {
        setCountries(data as CustomerCountryOption[]);
      }
    } catch {
      // Handled gracefully in modal.
    } finally {
      setLoadingCountries(false);
    }
  }, [countries.length, loadingCountries]);

  function openAddModal() {
    void ensureCountriesLoaded();
    setEditingCustomer(null);
    setFormInstanceKey((value) => value + 1);
    setFormOpen(true);
  }

  function openEditModal(customer: CustomerRecord) {
    void ensureCountriesLoaded();
    setEditingCustomer(customer);
    setFormInstanceKey((value) => value + 1);
    setFormOpen(true);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    if (trimmed !== activeQuery) {
      setPage(1);
      setActiveQuery(trimmed);
    } else {
      setReloadTick((value) => value + 1);
    }
  }

  function clearSearch() {
    setSearchDraft("");
    setPage(1);
    setActiveQuery("");
  }

  function handlePageChange(nextPage: number) {
    if (nextPage === page || nextPage < 1 || nextPage > totalPages) return;
    setPage(nextPage);
  }

  function handlePageSizeChange(nextSize: number) {
    if (nextSize === pageSize) return;
    setPageSize(nextSize);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Customer Management
        </h1>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex h-11 w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary shadow-xs transition hover:bg-primary-hover sm:w-auto"
        >
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          <span>Add Customer</span>
        </button>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-semibold text-primary">
              <span>All Customers</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                {totalCustomers}
              </span>
            </span>
            {loading && customers.length > 0 ? (
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
              placeholder="Search name, email, or phone..."
              aria-label="Search customers"
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

        {loading && customers.length === 0 ? (
          <CustomerSkeletonList />
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
              <FiUsers className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-semibold text-ink">Unable to load customers</p>
            <p className="mt-1 max-w-md text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setReloadTick((value) => value + 1)}
              className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
            >
              Try again
            </button>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary">
              {activeQuery ? (
                <FiSearch className="h-6 w-6" aria-hidden="true" />
              ) : (
                <FiUsers className="h-6 w-6" aria-hidden="true" />
              )}
            </span>
            <p className="mt-4 text-base font-semibold text-ink">
              {activeQuery ? "No matching customers found" : "No data found"}
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-muted">
              {activeQuery
                ? `No customer records matched "${activeQuery}". Try a different name, email, or phone number.`
                : "Your customer directory is empty. Add your first customer to start managing orders faster."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              {activeQuery ? (
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
                  onClick={openAddModal}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
                >
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Add Customer</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`transition-opacity duration-200 ${loading ? "opacity-65" : "opacity-100"}`}>
            {/* Responsive mobile / small-tablet card layout */}
            <div className="divide-y divide-line md:hidden">
              {customers.map((row) => (
                <article key={row.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CustomerAvatar name={row.name} src={row.profileImg} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{row.name}</p>
                        <div className="mt-1">
                          <CountryBadge country={row.country} countryCode={row.countryCode} />
                        </div>
                      </div>
                    </div>
                    <RowActionsMenu
                      customer={row}
                      onEdit={openEditModal}
                      onDelete={setDeletingCustomer}
                    />
                  </div>

                  <div className="space-y-1.5 rounded-2xl bg-page px-3.5 py-2.5 text-xs">
                    <div className="flex items-center gap-2 text-ink">
                      <FiMail className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="min-w-0 break-all">{row.email || "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-ink">
                      <FiPhone className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                      <span className="tabular-nums">{row.phone || "—"}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop / tablet table layout */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-soft/85 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                    <th scope="col" className="py-3.5 pr-4 pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Email
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Phone Number
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Country
                    </th>
                    <th scope="col" className="py-3.5 pr-6 pl-4 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {customers.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-soft/65"
                    >
                      <td className="py-3.5 pr-4 pl-6">
                        <div className="flex items-center gap-3">
                          <CustomerAvatar name={row.name} src={row.profileImg} />
                          <span className="font-semibold text-ink">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ink">
                        <span className="block max-w-[16rem] truncate" title={row.email || undefined}>
                          {row.email || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-ink tabular-nums">
                        {row.phone || <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <CountryBadge country={row.country} countryCode={row.countryCode} />
                      </td>
                      <td className="py-3.5 pr-6 pl-4 text-right">
                        <div className="inline-flex items-center justify-end">
                          <RowActionsMenu
                            customer={row}
                            onEdit={openEditModal}
                            onDelete={setDeletingCustomer}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalCustomers}
          totalPages={totalPages}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          disabled={loading}
          itemLabel="customers"
        />
      </section>

      {formOpen ? (
        <CustomerFormModal
          key={`${editingCustomer?.id ?? "new"}-${formInstanceKey}`}
          open={formOpen}
          customer={editingCustomer}
          countries={countries}
          loadingCountries={loadingCountries}
          onClose={() => setFormOpen(false)}
          onUnauthorized={redirectToLogin}
          onSuccess={(message) => {
            setFormOpen(false);
            toast.success(message);
            if (!editingCustomer) {
              setPage(1);
            }
            setReloadTick((value) => value + 1);
          }}
        />
      ) : null}

      <CustomerDeleteModal
        key={deletingCustomer?.id ?? "none"}
        customer={deletingCustomer}
        onClose={() => setDeletingCustomer(null)}
        onUnauthorized={redirectToLogin}
        onDeleted={(message) => {
          const deletedLastOnPage = customers.length === 1 && page > 1;
          setDeletingCustomer(null);
          toast.success(message);
          if (deletedLastOnPage) {
            setPage((current) => Math.max(1, current - 1));
          } else {
            setReloadTick((value) => value + 1);
          }
        }}
      />
    </div>
  );
}
