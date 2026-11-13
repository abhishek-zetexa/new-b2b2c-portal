"use client";

import { useEffect, useState } from "react";
import { FlagImage } from "react-international-phone";
import { toast } from "react-toastify";
import { CustomerFormModal } from "@/components/portal/customer-form-modal";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { checkoutId } from "@/lib/buy-sims";
import type { CustomerCountryOption, CustomerListResponse, CustomerRecord } from "@/lib/customers";
import { portalRequest, requestErrorMessage, text } from "@/lib/portal-fetch";
import { fieldClass, ghostButton, primaryButton } from "@/components/portal/buy-sims/shared";

const pageSizes = [10, 25, 50, 100];

export function AssignCustomerDialog({
  open,
  onClose,
  onAssigned,
  bindCheckout = true,
}: {
  open: boolean;
  onClose: () => void;
  onAssigned: (customer: CustomerRecord) => void;
  bindCheckout?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState<CustomerRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerRecord | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [countries, setCountries] = useState<CustomerCountryOption[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [pending, setPending] = useState<CustomerRecord | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), query: debounced });
      portalRequest<CustomerListResponse>(`/api/customers?${params.toString()}`)
        .then((payload) => {
          setRows(payload.customers ?? []);
          setTotal(payload.totalCustomers ?? payload.customers?.length ?? 0);
          setTotalPages(payload.totalPages ?? 1);
        })
        .catch((err) => {
          setRows([]);
          setError(requestErrorMessage(err, "Could not load customers."));
        })
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, page, pageSize, debounced, reload]);

  function openForm(customer: CustomerRecord | null) {
    setEditing(customer);
    setFormKey((value) => value + 1);
    setFormOpen(true);
    if (countries.length || loadingCountries) return;
    setLoadingCountries(true);
    fetch("/api/customers/countries")
      .then((response) => response.ok ? response.json() : [])
      .then((data) => { if (Array.isArray(data)) setCountries(data as CustomerCountryOption[]); })
      .catch(() => undefined)
      .finally(() => setLoadingCountries(false));
  }

  async function confirm() {
    if (!pending || confirming) return;
    if (!bindCheckout) {
      onAssigned(pending);
      setPending(null);
      onClose();
      return;
    }
    setConfirming(true);
    try {
      const result = await portalRequest<{ success?: boolean; message?: string }>("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "assign-customer", customer_id: pending.id, checkout_id: checkoutId() }),
      });
      if (result.success === false) {
        toast.error(text(result.message) || "Could not assign this customer.");
        return;
      }
      await portalRequest("/api/buy-sims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: "assign-address", checkout_id: checkoutId() }),
      }).catch(() => undefined);
      toast.success("Customer selected successfully!");
      onAssigned(pending);
      setPending(null);
      onClose();
    } catch (err) {
      toast.error(requestErrorMessage(err, "Checkout creation failed. Please try again."));
    } finally {
      setConfirming(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        title="Assign to Customers"
        onClose={onClose}
        footer={null}
      >
        <div className="flex flex-wrap items-center gap-2">
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Search Customer" className={fieldClass} />
          <button type="button" onClick={() => openForm(null)} className={primaryButton}>Add Customer</button>
        </div>
        <div className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto">
          {loading ? <p className="text-sm text-muted">Loading customers…</p> : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {!loading && rows.length === 0 ? <p className="py-8 text-center text-sm text-muted">No Records</p> : null}
          {rows.map((customer) => (
            <article key={customer.id} className="rounded-2xl border border-line p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  {customer.profileImg ? <img src={customer.profileImg} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-mint text-sm font-semibold text-primary">{initials(customer)}</span>}
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{customer.firstName} {customer.lastName}</p>
                    <p className="text-xs text-muted">ID: {customer.id}</p>
                  </div>
                </div>
                <div className="min-w-0 text-sm text-ink">
                  <p className="truncate">{customer.email || "—"}</p>
                  <p>{customer.phone || "—"}</p>
                  <p className="flex items-center gap-2">{customer.countryCode ? <FlagImage iso2={customer.countryCode.toLowerCase()} size="1rem" /> : null}{customer.country || "—"}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setPending(customer)} className={primaryButton}>Assign</button>
                  <button type="button" onClick={() => openForm(customer)} className={ghostButton}>Edit</button>
                </div>
              </div>
            </article>
          ))}
        </div>
        <Pagination page={page} pageSize={pageSize} totalItems={total} totalPages={totalPages} pageSizeOptions={pageSizes} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} disabled={loading} itemLabel="customers" className="mt-3" />
      </Modal>
      <Modal open={Boolean(pending)} title="User details Confirmation" onClose={() => { if (!confirming) setPending(null); }}>
        {pending ? (
          <div className="space-y-3 text-sm">
            <p className="text-muted">Assigned user will be emailed all the details of the sim you purchase.</p>
            <p><span className="text-muted">Name: </span><span className="font-semibold text-ink">{pending.firstName} {pending.lastName}</span></p>
            <p><span className="text-muted">Email Id: </span><span className="font-semibold text-ink">{pending.email}</span></p>
            <p><span className="text-muted">Phone: </span><span className="font-semibold text-ink">{pending.phone || "—"}</span></p>
            <p><span className="text-muted">Country: </span><span className="font-semibold text-ink">{pending.country || "—"}</span></p>
            <button type="button" disabled={confirming} onClick={() => void confirm()} className={primaryButton}>{confirming ? "Assigning…" : "Confirm"}</button>
          </div>
        ) : null}
      </Modal>
      {formOpen ? (
        <CustomerFormModal
          key={`${editing?.id ?? "new"}-${formKey}`}
          open={formOpen}
          customer={editing}
          countries={countries}
          loadingCountries={loadingCountries}
          onClose={() => setFormOpen(false)}
          onUnauthorized={() => { window.location.assign("/login"); }}
          onSuccess={(message) => {
            setFormOpen(false);
            toast.success(message);
            setPage(1);
            setReload((value) => value + 1);
          }}
        />
      ) : null}
    </>
  );
}

function initials(customer: CustomerRecord) {
  return `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase() || "C";
}
