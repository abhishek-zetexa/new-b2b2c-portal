"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import { Dialog, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckField, FieldLabel, FieldMessage } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { WaveLoader } from "@/components/ui/wave-loader";
import { addonMarkupError } from "@/lib/account-settings";
import {
  asList,
  asRecord,
  errorText,
  PortalRequestError,
  portalRequest,
  requestErrorMessage,
  text,
  type JsonRecord,
} from "@/lib/portal-fetch";

type AddonRow = {
  id: string;
  serviceName: string;
  description: string;
  markup: string;
  sendEmail: boolean | null;
};

function emailFlag(value: unknown): boolean | null {
  if (value == null || value === "") return null;
  if (value === true || value === "true" || value === 1 || value === "1") return true;
  if (value === false || value === "false" || value === 0 || value === "0") return false;
  return null;
}

function addonRows(payload: unknown): AddonRow[] {
  const root = asRecord(payload);
  const nested = asRecord(root?.data);
  const candidates = [payload, root?.data, root?.settings, root?.results, nested?.settings, nested?.results, nested?.data];
  const rows = candidates.find((candidate) => Array.isArray(candidate));
  return asList(rows).map((row) => {
    const rawMarkup = row.reseller_mark_up_percentage;
    return {
      id: text(row.addons_settings_id || row.id),
      serviceName: text(row.service_name || row.addon_name || row.service || row.name),
      description: text(row.description),
      markup: rawMarkup == null || rawMarkup === "" ? "" : String(rawMarkup),
      sendEmail: emailFlag(row.send_email_to_customer),
    };
  });
}

function EditMenu({ label, onEdit }: { label: string; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ top: number; left: number; openAbove: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeMenu = useCallback(() => setOpen(false), []);

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const button = triggerRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 180;
    const estimatedHeight = 92;
    const left = Math.max(12, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12));
    const spaceBelow = window.innerHeight - rect.bottom;
    const openAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight;
    setPlacement({ top: openAbove ? rect.top - 8 : rect.bottom + 8, left, openAbove });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", closeMenu, true);
    window.addEventListener("resize", closeMenu);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", closeMenu, true);
      window.removeEventListener("resize", closeMenu);
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
        aria-label={`Actions for ${label}`}
        title="Actions"
        className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border transition ${
          open
            ? "border-primary bg-mint text-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
            : "border-line bg-page text-muted hover:border-primary/45 hover:bg-mint/60 hover:text-primary"
        }`}
      >
        <Icon name="more-horizontal" className="h-4 w-4" />
      </button>
      {open && placement
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{
                position: "fixed",
                top: placement.top,
                left: placement.left,
                transform: placement.openAbove ? "translateY(-100%)" : undefined,
              }}
              className="z-50 w-44 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_color-mix(in_srgb,var(--navy)_18%,transparent)]"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onEdit();
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink transition hover:bg-mint/70 hover:text-primary"
              >
                <Icon name="edit" className="h-3.5 w-3.5 shrink-0 text-primary" />
                Edit Setting
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function EmailMark({ sent }: { sent: boolean }) {
  return sent ? (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-mint text-primary" aria-label="Email enabled">
      <Icon name="check" className="h-4 w-4" />
    </span>
  ) : (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-danger/10 text-danger" aria-label="Email disabled">
      <Icon name="close" className="h-4 w-4" />
    </span>
  );
}

export function AddonsSettings({ resellerId, agentId }: { resellerId: string; agentId: string }) {
  const [rows, setRows] = useState<AddonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AddonRow | null>(null);
  const [markup, setMarkup] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [attempted, setAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const markupError = addonMarkupError(markup);

  const load = useCallback(async (initial: boolean) => {
    if (initial) setLoading(true);
    try {
      const query = new URLSearchParams({
        resource: "addons",
        reseller_id: resellerId,
        agent_id: agentId,
      });
      const res = await portalRequest<JsonRecord>(`/api/settings?${query.toString()}`);
      setRows(addonRows(res));
    } catch (err) {
      if (!(err instanceof PortalRequestError && err.status === 401)) console.error(err);
      if (initial) setRows([]);
    } finally {
      if (initial) setLoading(false);
    }
  }, [agentId, resellerId]);

  useEffect(() => {
    let ignore = false;
    load(true).catch(() => {
      if (!ignore) setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [load]);

  function openEditor(row: AddonRow) {
    setEditing(row);
    setMarkup(row.markup);
    setSendEmail(row.sendEmail == null ? true : row.sendEmail);
    setAttempted(false);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setAttempted(true);
    if (addonMarkupError(markup)) {
      toast.error("Please fill all required fields correctly!");
      return;
    }
    setSaving(true);
    try {
      const res = await portalRequest<JsonRecord>("/api/settings?resource=addons", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addons_settings_id: editing.id,
          reseller_mark_up_percentage: Number(markup),
          send_email_to_customer: sendEmail,
          status: true,
        }),
      });
      if (res.success === false) throw new Error(errorText(res) || "Failed to update settings!");
      toast.success(text(res.message) || "Settings updated successfully!");
      setEditing(null);
      await load(false);
    } catch (err) {
      const message = requestErrorMessage(err, "Failed to update settings!");
      if (message) toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
      <div className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-ink">Addons Settings</h2>
      </div>
      {loading ? (
        <div className="flex items-center gap-3 px-5 pb-6 text-sm text-muted sm:px-6">
          <WaveLoader size="sm" className="text-primary" />
          Loading Addons settings...
        </div>
      ) : rows.length === 0 ? (
        <div className="px-5 pb-10 text-center sm:px-6">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mint text-primary">
            <Icon name="box" className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-medium text-ink">No Addons settings available</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-line md:hidden">
            {rows.map((row, index) => (
              <article key={`${row.id}-${index}`} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{row.serviceName}</p>
                    <p className="mt-1 text-sm leading-5 text-muted">{row.description}</p>
                  </div>
                  <EditMenu label={row.serviceName || "addon"} onEdit={() => openEditor(row)} />
                </div>
                <div className="grid grid-cols-2 gap-3 rounded-2xl bg-page px-3.5 py-2.5 text-xs">
                  <p><span className="block text-muted">Reseller Markup</span><span className="font-semibold text-ink">{row.markup === "" ? "—" : `${row.markup}%`}</span></p>
                  <p className="flex items-center justify-between gap-2"><span className="text-muted">Send Email</span><EmailMark sent={row.sendEmail === true} /></p>
                </div>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line bg-soft/85 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  <th scope="col" className="py-3.5 pr-4 pl-6">Service Name</th>
                  <th scope="col" className="px-4 py-3.5">Description</th>
                  <th scope="col" className="px-4 py-3.5">Reseller Markup</th>
                  <th scope="col" className="px-4 py-3.5">Send Email</th>
                  <th scope="col" className="py-3.5 pr-6 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                {rows.map((row, index) => (
                  <tr key={`${row.id}-${index}`} className="transition-colors hover:bg-soft/65">
                    <td className="py-3.5 pr-4 pl-6 font-semibold text-ink">{row.serviceName}</td>
                    <td className="max-w-sm px-4 py-3.5 text-muted">{row.description}</td>
                    <td className="px-4 py-3.5 text-ink">{row.markup === "" ? "—" : `${row.markup}%`}</td>
                    <td className="px-4 py-3.5"><EmailMark sent={row.sendEmail === true} /></td>
                    <td className="py-3.5 pr-6 pl-4 text-right">
                      <EditMenu label={row.serviceName || "addon"} onEdit={() => openEditor(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => { if (!open && !saving) setEditing(null); }}>
        <DialogHeader>
          <DialogTitle>Edit Addons Setting</DialogTitle>
        </DialogHeader>
        {editing ? (
          <form noValidate onSubmit={save}>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-ink">Service Name</p>
                <p className="mt-1 text-sm text-muted">{editing.serviceName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Description</p>
                <p className="mt-1 text-sm leading-6 text-muted">{editing.description}</p>
              </div>
              <div>
                <FieldLabel htmlFor="addon-markup" required>Reseller Markup Percentage</FieldLabel>
                <input
                  id="addon-markup"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={markup}
                  onChange={(event) => setMarkup(event.target.value)}
                  aria-invalid={attempted && markupError ? true : undefined}
                  onBlur={() => setAttempted(true)}
                  className="field mt-2"
                />
                <FieldMessage>{attempted ? markupError : ""}</FieldMessage>
              </div>
              <CheckField
                id="addon-send-email"
                label="Send email to customer"
                checked={sendEmail}
                onChange={setSendEmail}
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => { if (!saving) setEditing(null); }}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-5 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={Boolean(markupError) || saving}
                aria-busy={saving}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </DialogFooter>
          </form>
        ) : null}
      </Dialog>
    </section>
  );
}
