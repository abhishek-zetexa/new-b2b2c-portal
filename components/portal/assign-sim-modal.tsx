"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "react-toastify";
import {
  FiCheck,
  FiChevronDown,
  FiInfo,
  FiRefreshCw,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { Modal } from "@/components/ui/modal";
import { FieldLabel, FieldMessage, TextField } from "@/components/ui/form-field";
import { WaveLoader } from "@/components/ui/wave-loader";
import type { AgentListResponse, AgentRecord } from "@/lib/agents";
import { statusBadgeTone, validateIccidRange } from "@/lib/sim-inventory";

function agentDisplayName(agent: AgentRecord): string {
  const fullName = `${agent.firstName} ${agent.lastName}`.trim();
  return fullName || agent.email || `Agent ${agent.agentId}`;
}

function agentInitials(agent: AgentRecord): string {
  const first = agent.firstName.charAt(0).toUpperCase();
  const last = agent.lastName.charAt(0).toUpperCase();
  return `${first}${last}`.trim() || agent.email.charAt(0).toUpperCase() || "A";
}

function estimateRangeSummary(start: string, end: string): string {
  const s = start.trim();
  const e = end.trim();
  if (!s || !e) return "";
  if (s === e) return "Single SIM selected";

  if (!/^\d+$/.test(s) || !/^\d+$/.test(e) || s.length !== e.length) return "";
  try {
    const startNum = BigInt(s);
    const endNum = BigInt(e);
    if (endNum < startNum) return "";
    const count = endNum - startNum + BigInt(1);
    if (count > BigInt(1_000_000)) return "Large bulk ICCID range";
    const formatted = Number(count).toLocaleString();
    return `${formatted} SIM${count === BigInt(1) ? "" : "s"} in range`;
  } catch {
    return "";
  }
}

export function AssignSimModal({
  open,
  onClose,
  onAssigned,
  onUnauthorized,
}: {
  open: boolean;
  onClose: () => void;
  onAssigned: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const [startIccid, setStartIccid] = useState("");
  const [endIccid, setEndIccid] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);

  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const [agentError, setAgentError] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const [debouncedAgentSearch, setDebouncedAgentSearch] = useState("");
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentsError, setAgentsError] = useState("");
  const [agentFetchTick, setAgentFetchTick] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const agentAbortRef = useRef<AbortController | null>(null);

  const rangeSummary = useMemo(
    () => estimateRangeSummary(startIccid, endIccid),
    [startIccid, endIccid],
  );

  // Debounce agent search input cleanly.
  useEffect(() => {
    const trimmed = agentSearch.trim();
    const timer = window.setTimeout(() => {
      setDebouncedAgentSearch(trimmed);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [agentSearch]);

  // Fetch agents list for searchable dropdown.
  useEffect(() => {
    if (!open) return;

    agentAbortRef.current?.abort();
    const controller = new AbortController();
    agentAbortRef.current = controller;

    async function loadAgents() {
      setAgentsLoading(true);
      setAgentsError("");

      const params = new URLSearchParams({
        page: "1",
        page_size: "50",
        search_key: debouncedAgentSearch,
      });

      try {
        const response = await fetch(`/api/agents?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          onUnauthorized();
          return;
        }

        const data = (await response.json().catch(() => ({}))) as Partial<
          AgentListResponse & { message?: string }
        >;

        if (controller.signal.aborted) return;

        if (!response.ok) {
          setAgentsError(data.message || "Failed to load agents.");
          setAgents([]);
          setAgentsLoading(false);
          return;
        }

        const loaded = Array.isArray(data.agents) ? data.agents : [];
        setAgents(loaded);
        setAgentsLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === "AbortError") return;
        setAgentsError("Unable to reach agents service.");
        setAgents([]);
        setAgentsLoading(false);
      }
    }

    void loadAgents();
    return () => {
      controller.abort();
    };
  }, [open, debouncedAgentSearch, agentFetchTick, onUnauthorized]);

  // Close only the dropdown when clicking outside or pressing Escape inside it.
  useEffect(() => {
    if (!dropdownOpen) return;

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node | null;
      if (target && dropdownRef.current && !dropdownRef.current.contains(target)) {
        setDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setDropdownOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [dropdownOpen]);

  function openOrToggleDropdown() {
    if (busy) return;
    setDropdownOpen((current) => {
      const next = !current;
      if (next) {
        window.setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      return next;
    });
  }

  function handleSelectAgent(agent: AgentRecord) {
    setSelectedAgent(agent);
    setAgentError("");
    setFormError("");
    setDropdownOpen(false);
  }

  function clearSelectedAgent() {
    setSelectedAgent(null);
    setAgentError("");
    setFormError("");
  }

  function clearAgentSearch() {
    setAgentSearch("");
    setDebouncedAgentSearch("");
    searchInputRef.current?.focus();
  }

  function copyStartToEnd() {
    const startTrimmed = startIccid.trim();
    if (!startTrimmed || busy) return;
    setEndIccid(startTrimmed);
    setEndError("");
    setFormError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const { startError: nextStartErr, endError: nextEndErr } = validateIccidRange(
      startIccid,
      endIccid,
    );
    const nextAgentErr = selectedAgent?.agentId ? "" : "Please select an agent.";

    setStartError(nextStartErr);
    setEndError(nextEndErr);
    setAgentError(nextAgentErr);
    setFormError("");

    if (nextStartErr || nextEndErr || nextAgentErr || !selectedAgent) {
      toast.error(
        nextStartErr || nextEndErr || nextAgentErr || "Please complete all required fields.",
      );
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/sim-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_iccid: startIccid.trim(),
          end_iccid: endIccid.trim(),
          agent_id: selectedAgent.agentId,
        }),
      });

      if (response.status === 401) {
        setBusy(false);
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || data.success === false) {
        const message = data.message || "Failed to assign SIMs.";
        setFormError(message);
        toast.error(message);
        setBusy(false);
        return;
      }

      setBusy(false);
      onAssigned(data.message || "SIMs assigned successfully.");
    } catch {
      const message = "Cannot reach the SIM inventory service. Try again in a moment.";
      setFormError(message);
      toast.error(message);
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Assign SIM"
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
            type="submit"
            form="assign-sim-form"
            disabled={busy}
            aria-busy={busy || undefined}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-wait"
          >
            {busy ? <WaveLoader size="sm" label="Assigning" /> : "Assign"}
          </button>
        </div>
      }
    >
      {formError ? (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
        >
          {formError}
        </div>
      ) : null}

      <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-mint/45 px-4 py-3 text-xs leading-relaxed text-ink">
        <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p>
          Enter the sequential <strong className="font-semibold">Start ICCID</strong> and{" "}
          <strong className="font-semibold">End ICCID</strong> range to assign SIMs to an agent. For a
          single SIM, enter the same ICCID in both fields.
        </p>
      </div>

      <form
        id="assign-sim-form"
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="assign-start-iccid"
            label="Start ICCID"
            required
            disabled={busy}
            value={startIccid}
            error={startError}
            inputMode="numeric"
            placeholder="Enter Start ICCID"
            className="font-mono text-[13px]"
            onChange={(next) => {
              setStartIccid(next);
              if (startError) setStartError("");
              if (endError) setEndError("");
              if (formError) setFormError("");
            }}
          />

          <div className="space-y-2">
            <TextField
              id="assign-end-iccid"
              label="End ICCID"
              required
              disabled={busy}
              value={endIccid}
              error={endError}
              inputMode="numeric"
              placeholder="Enter End ICCID"
              className="font-mono text-[13px]"
              onChange={(next) => {
                setEndIccid(next);
                if (endError) setEndError("");
                if (formError) setFormError("");
              }}
            />
            {startIccid.trim() && !endIccid.trim() ? (
              <button
                type="button"
                disabled={busy}
                onClick={copyStartToEnd}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-mint/80 px-2.5 py-1 text-[11px] font-semibold text-primary transition hover:bg-mint disabled:opacity-50"
              >
                Use Start ICCID (single SIM)
              </button>
            ) : rangeSummary && !startError && !endError ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-1 text-[11px] font-semibold text-primary">
                <FiCheck className="h-3 w-3" aria-hidden="true" />
                <span>{rangeSummary}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div ref={dropdownRef} className="space-y-2">
          <FieldLabel htmlFor="assign-agent-trigger" required>
            Agent
          </FieldLabel>

          <div className="relative">
            <button
              ref={triggerRef}
              id="assign-agent-trigger"
              type="button"
              disabled={busy}
              aria-haspopup="listbox"
              aria-expanded={dropdownOpen}
              aria-describedby={agentError ? "assign-agent-error" : undefined}
              onClick={openOrToggleDropdown}
              className={`flex min-h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-surface px-4 py-2.5 text-left transition outline-none disabled:cursor-not-allowed disabled:opacity-60 ${
                agentError
                  ? "border-danger bg-surface focus:border-danger"
                  : dropdownOpen
                    ? "border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
                    : "border-line hover:border-primary/60 focus:border-primary"
              }`}
            >
              {selectedAgent ? (
                <span className="flex min-w-0 flex-1 items-center gap-3 pr-7">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mint text-xs font-bold text-primary">
                    {agentInitials(selectedAgent)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {agentDisplayName(selectedAgent)}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {selectedAgent.email || `Agent #${selectedAgent.agentId}`}
                    </span>
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-2.5 text-sm text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                  <FiUsers className="h-4 w-4 text-muted" aria-hidden="true" />
                  <span>Select an Agent</span>
                </span>
              )}

              <FiChevronDown
                className={`h-4 w-4 shrink-0 text-muted transition-transform ${
                  dropdownOpen ? "rotate-180 text-primary" : ""
                }`}
                aria-hidden="true"
              />
            </button>

            {selectedAgent && !busy ? (
              <button
                type="button"
                aria-label="Clear selected agent"
                onClick={clearSelectedAgent}
                className="absolute top-1/2 right-10 grid h-7 w-7 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
              >
                <FiX className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          {dropdownOpen ? (
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_16px_36px_color-mix(in_srgb,var(--navy)_12%,transparent)]">
              <div className="border-b border-line bg-page/75 p-2.5">
                <div className="relative">
                  <FiSearch
                    className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                  <input
                    ref={searchInputRef}
                    type="search"
                    value={agentSearch}
                    onChange={(event) => setAgentSearch(event.target.value)}
                    placeholder="Search agent by name or email..."
                    aria-label="Search agents"
                    className="h-10 w-full rounded-xl border border-line bg-surface pr-8 pl-9 text-sm text-ink outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_45%,transparent)] focus:border-primary"
                  />
                  {agentSearch ? (
                    <button
                      type="button"
                      aria-label="Clear agent search"
                      onClick={clearAgentSearch}
                      className="absolute top-1/2 right-2 grid h-6 w-6 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-mint hover:text-ink"
                    >
                      <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              {agentsLoading ? (
                <div className="flex items-center justify-center gap-2.5 px-4 py-8 text-xs font-medium text-muted">
                  <WaveLoader size="sm" label="Loading agents" />
                </div>
              ) : agentsError ? (
                <div className="flex flex-col items-center justify-center px-4 py-7 text-center">
                  <p className="text-xs font-medium text-danger">{agentsError}</p>
                  <button
                    type="button"
                    onClick={() => setAgentFetchTick((v) => v + 1)}
                    className="mt-3 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-page px-3.5 text-xs font-semibold text-ink transition hover:border-primary hover:text-primary"
                  >
                    <FiRefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Retry</span>
                  </button>
                </div>
              ) : agents.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-ink">No agents found</p>
                  <p className="mt-1 text-xs text-muted">
                    {debouncedAgentSearch
                      ? `No agents matched "${debouncedAgentSearch}".`
                      : "Create an agent first under Agent Management."}
                  </p>
                </div>
              ) : (
                <ul
                  role="listbox"
                  aria-label="Available agents"
                  className="max-h-56 divide-y divide-line overflow-y-auto p-1.5"
                >
                  {agents.map((agent) => {
                    const isSelected = selectedAgent?.agentId === agent.agentId;
                    const statusTone = statusBadgeTone(agent.status);
                    return (
                      <li key={agent.agentId} className="first:rounded-t-xl last:rounded-b-xl">
                        <button
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelectAgent(agent)}
                          className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                            isSelected
                              ? "bg-mint/85 text-ink"
                              : "hover:bg-soft/75 text-ink"
                          }`}
                        >
                          <span className="flex min-w-0 flex-1 items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mint text-xs font-bold text-primary">
                              {agentInitials(agent)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className="truncate text-sm font-semibold text-ink">
                                  {agentDisplayName(agent)}
                                </span>
                                {agent.status ? (
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                                      statusTone === "ok"
                                        ? "bg-mint text-primary"
                                        : statusTone === "warn"
                                          ? "bg-danger/10 text-danger"
                                          : "bg-page text-muted"
                                    }`}
                                  >
                                    {agent.status}
                                  </span>
                                ) : null}
                              </span>
                              <span className="block truncate text-xs text-muted">
                                {agent.email || `ID: ${agent.agentId}`}
                              </span>
                            </span>
                          </span>

                          {isSelected ? (
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
                              <FiCheck className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          ) : (
                            <span className="shrink-0 font-mono text-[11px] text-muted">
                              #{agent.agentId}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : null}

          <FieldMessage id="assign-agent-error">{agentError}</FieldMessage>
        </div>
      </form>
    </Modal>
  );
}
