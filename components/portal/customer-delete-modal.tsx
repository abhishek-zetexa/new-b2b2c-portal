"use client";

import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";
import { Modal } from "@/components/ui/modal";
import { WaveLoader } from "@/components/ui/wave-loader";
import type { CustomerRecord } from "@/lib/customers";

export function CustomerDeleteModal({
  customer,
  onClose,
  onDeleted,
  onUnauthorized,
}: {
  customer: CustomerRecord | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete() {
    if (!customer || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        `/api/customers?customer_id=${encodeURIComponent(customer.id)}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || data.success === false) {
        setError(data.message || "Failed to delete customer.");
        setBusy(false);
        return;
      }

      onDeleted(data.message || "Customer deleted successfully");
    } catch {
      setError("Cannot reach the customer service. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(customer)}
      title="Confirm Deletion"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={confirmDelete}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-full bg-danger px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-wait"
          >
            {busy ? <WaveLoader size="sm" label="Deleting" /> : "Delete"}
          </button>
        </div>
      }
    >
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-danger/10 text-danger">
          <FiTrash2 className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm leading-6 text-ink">
            Are you sure you want to delete this customer?
          </p>
          {customer ? (
            <div className="mt-3 rounded-2xl border border-line bg-page px-4 py-3">
              <p className="truncate text-sm font-semibold text-ink">{customer.name}</p>
              {customer.email ? (
                <p className="mt-0.5 truncate text-xs text-muted">{customer.email}</p>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p role="alert" className="mt-3 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

