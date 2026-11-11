"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  FiChevronDown,
  FiChevronRight,
  FiEdit2,
  FiGlobe,
  FiMail,
  FiMoreHorizontal,
  FiPhone,
  FiPlus,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUserCheck,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { Pagination } from "@/components/ui/pagination";
import { WaveLoader } from "@/components/ui/wave-loader";
import { AgentDeleteModal } from "@/components/portal/agent-delete-modal";
import { AgentFormModal } from "@/components/portal/agent-form-modal";
import {
  AssignAgentRoleModal,
  CreateRoleModal,
  RolesPermissionsModal,
} from "@/components/portal/role-management-modals";
import {
  groupSubAgents,
  type AgentListResponse,
  type AgentRecord,
  type AgentTreeNode,
  type PermissionMap,
  type RoleRecord,
  type RolesCatalogResponse,
} from "@/lib/agents";

const PAGE_SIZE_OPTIONS = [30, 50, 100] as const;

type MenuPlacement = {
  top: number;
  left: number;
  openAbove: boolean;
};

type RoleModalMode = "closed" | "roles" | "create-role" | "assign-role";

function agentInitials(agent: AgentRecord): string {
  const first = agent.firstName.charAt(0).toUpperCase();
  const last = agent.lastName.charAt(0).toUpperCase();
  return `${first}${last}`.trim() || "A";
}

function formatAgentPhone(agent: AgentRecord): string {
  const full = `${agent.phoneCountryCode}${agent.phone}`.trim();
  return full || "";
}

function AgentRowActionsMenu({
  agent,
  onEdit,
  onAssignRole,
  onDelete,
}: {
  agent: AgentRecord;
  onEdit: (agent: AgentRecord) => void;
  onAssignRole: (agent: AgentRecord) => void;
  onDelete: (agent: AgentRecord) => void;
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
    const menuWidth = 196;
    const estimatedHeight = 168;
    const left = Math.max(
      12,
      Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 12),
    );
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

  const displayName = `${agent.firstName} ${agent.lastName}`.trim() || `Agent #${agent.agentId}`;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleMenu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Actions for ${displayName}`}
        title="Quick Actions"
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
              aria-label={`Actions for ${displayName}`}
              style={{
                position: "fixed",
                top: placement.top,
                left: placement.left,
                transform: placement.openAbove ? "translateY(-100%)" : undefined,
              }}
              className="z-50 w-48 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_18px_40px_color-mix(in_srgb,var(--navy)_18%,transparent)]"
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[10px] font-semibold tracking-[0.14em] text-muted uppercase">
                Quick Actions
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onEdit(agent);
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
                  onAssignRole(agent);
                }}
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm font-medium text-ink transition hover:bg-mint/70 hover:text-primary"
              >
                <FiUserCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span>Assign Agent Role</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onDelete(agent);
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

function AgentSkeletonList() {
  return (
    <div className="px-4 py-6 sm:px-6" aria-busy="true">
      <div className="mb-6 flex flex-col items-center justify-center gap-2.5 py-3 text-center">
        <WaveLoader size="lg" label="Loading agents" />
        <p className="text-sm font-medium text-muted">Loading agents...</p>
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
                <span className="block h-3.5 w-36 rounded-full bg-line" />
                <span className="block h-2.5 w-48 rounded-full bg-line/70" />
              </div>
            </div>
            <div className="hidden items-center gap-4 sm:flex">
              <span className="h-6 w-28 rounded-full bg-line/70" />
              <span className="h-9 w-9 rounded-xl bg-line/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SubAgentDesktopRows({
  nodes,
  expandedIds,
  onToggleExpand,
  onEdit,
  onAssignRole,
  onDelete,
  level = 1,
}: {
  nodes: AgentTreeNode[];
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (agent: AgentRecord) => void;
  onAssignRole: (agent: AgentRecord) => void;
  onDelete: (agent: AgentRecord) => void;
  level?: number;
}) {
  return (
    <>
      {nodes.map((child) => {
        const childId = String(child.agentId);
        const hasChildren = child.subAgents.length > 0;
        const expanded = expandedIds.has(childId);
        const fullPhone = formatAgentPhone(child);

        return (
          <Fragment key={childId}>
            <tr className="border-b border-line/70 bg-surface text-xs last:border-b-0">
              <td className="py-2.5 pr-3" style={{ paddingLeft: `${12 + (level - 1) * 18}px` }}>
                <div className="flex items-center gap-1.5">
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggleExpand(childId)}
                      aria-label={expanded ? "Collapse sub-agents" : "Expand sub-agents"}
                      className="grid h-6 w-6 cursor-pointer place-items-center rounded-lg text-muted hover:bg-mint hover:text-primary"
                    >
                      {expanded ? (
                        <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  ) : null}
                  <span className="font-mono font-semibold text-ink">{child.agentId}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 font-medium text-ink">
                {`${child.firstName} ${child.lastName}`.trim() || "—"}
              </td>
              <td className="px-3 py-2.5 text-ink">{child.email || "—"}</td>
              <td className="px-3 py-2.5 text-ink tabular-nums">{fullPhone || "—"}</td>
              <td className="px-3 py-2.5 text-ink">{child.companyCountry || "NA"}</td>
              <td className="px-3 py-2.5 text-muted">{child.description || "—"}</td>
              <td className="py-2.5 pr-3 pl-3 text-right">
                <AgentRowActionsMenu
                  agent={child}
                  onEdit={onEdit}
                  onAssignRole={onAssignRole}
                  onDelete={onDelete}
                />
              </td>
            </tr>
            {hasChildren && expanded ? (
              <SubAgentDesktopRows
                nodes={child.subAgents}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onAssignRole={onAssignRole}
                onDelete={onDelete}
                level={level + 1}
              />
            ) : null}
          </Fragment>
        );
      })}
    </>
  );
}

function AgentMobileCard({
  node,
  expandedIds,
  onToggleExpand,
  onEdit,
  onAssignRole,
  onDelete,
  nested = false,
}: {
  node: AgentTreeNode;
  expandedIds: ReadonlySet<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (agent: AgentRecord) => void;
  onAssignRole: (agent: AgentRecord) => void;
  onDelete: (agent: AgentRecord) => void;
  nested?: boolean;
}) {
  const idKey = String(node.agentId);
  const fullName = `${node.firstName} ${node.lastName}`.trim() || `Agent #${node.agentId}`;
  const fullPhone = formatAgentPhone(node);
  const roleName = node.roles[0]?.roleName || "N/A";
  const hasChildren = node.subAgents.length > 0;
  const expanded = expandedIds.has(idKey);

  return (
    <article className={nested ? "rounded-2xl border border-line bg-surface p-3.5" : "space-y-3 p-4"}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-mint text-xs font-bold text-primary ring-1 ring-primary/15"
          >
            {agentInitials(node)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{fullName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-page px-2 py-0.5 font-mono text-[11px] font-semibold text-muted">
                ID: {node.agentId}
              </span>
              <span className="rounded-full bg-mint px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                {roleName}
              </span>
            </div>
          </div>
        </div>
        <AgentRowActionsMenu
          agent={node}
          onEdit={onEdit}
          onAssignRole={onAssignRole}
          onDelete={onDelete}
        />
      </div>

      <div className="mt-3 space-y-1.5 rounded-2xl bg-page px-3.5 py-2.5 text-xs">
        <div className="flex items-center gap-2 text-ink">
          <FiMail className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="min-w-0 break-all">{node.email || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-ink">
          <FiPhone className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span className="tabular-nums">{fullPhone || "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-ink">
          <FiGlobe className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
          <span>{node.companyCountry || "NA"}</span>
        </div>
        {node.description ? (
          <p className="pt-1 text-muted">{node.description}</p>
        ) : null}
      </div>

      {hasChildren ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onToggleExpand(idKey)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-mint/75 px-3 py-1 text-xs font-semibold text-primary hover:bg-mint"
          >
            {expanded ? (
              <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>
              {node.subAgents.length}{" "}
              {node.subAgents.length === 1 ? "Sub-agent" : "Sub-agents"}
            </span>
          </button>

          {expanded ? (
            <div className="mt-2.5 space-y-2 border-l-2 border-primary/30 pl-3">
              {node.subAgents.map((sub) => (
                <AgentMobileCard
                  key={String(sub.agentId)}
                  node={sub}
                  expandedIds={expandedIds}
                  onToggleExpand={onToggleExpand}
                  onEdit={onEdit}
                  onAssignRole={onAssignRole}
                  onDelete={onDelete}
                  nested
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function AgentManagementView() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [searchDraft, setSearchDraft] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const [agentFormOpen, setAgentFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [agentFormKey, setAgentFormKey] = useState(0);
  const [deletingAgent, setDeletingAgent] = useState<AgentRecord | null>(null);

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [defaultPermissions, setDefaultPermissions] = useState<PermissionMap>({});
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [roleModalMode, setRoleModalMode] = useState<RoleModalMode>("closed");
  const [returnToMode, setReturnToMode] = useState<"roles" | "assign-role" | null>(null);
  const [roleModalKey, setRoleModalKey] = useState(0);
  const [highlightedRoleId, setHighlightedRoleId] = useState<string>("");
  const [assigningAgent, setAssigningAgent] = useState<AgentRecord | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);

  const groupedAgents = useMemo(() => groupSubAgents(agents), [agents]);

  const redirectToLogin = useCallback(() => {
    window.location.replace("/login");
  }, []);

  // Debounce search input (300ms) and reset page to 1.
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

    async function loadAgents() {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        search_key: activeSearch,
      });

      try {
        const response = await fetch(`/api/agents?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (response.status === 401) {
          redirectToLogin();
          return;
        }

        const data = (await response.json().catch(() => ({}))) as Partial<
          AgentListResponse & { message?: string }
        >;

        if (controller.signal.aborted) return;

        if (!response.ok) {
          setError(data.message || "Failed to load agents.");
          setAgents([]);
          setTotalRecords(0);
          setTotalPages(1);
          setLoading(false);
          return;
        }

        const rows = Array.isArray(data.agents) ? data.agents : [];
        const total = typeof data.totalRecords === "number" ? data.totalRecords : rows.length;
        const pages =
          typeof data.totalPages === "number" && data.totalPages >= 1
            ? data.totalPages
            : Math.max(1, Math.ceil(total / pageSize));

        if (rows.length === 0 && total > 0 && page > pages) {
          setPage(pages);
          return;
        }

        setAgents(rows);
        setTotalRecords(total);
        setTotalPages(pages);
        setLoading(false);
      } catch (reason: unknown) {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError("Cannot reach the agent service. Try again in a moment.");
        setLoading(false);
      }
    }

    void loadAgents();
    return () => controller.abort();
  }, [page, pageSize, activeSearch, reloadTick, redirectToLogin]);

  const fetchRolesCatalog = useCallback(async (selectRoleByName?: string) => {
    setLoadingRoles(true);
    try {
      const response = await fetch("/api/agents/roles", { cache: "no-store" });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }
      if (!response.ok) return;
      const data = (await response.json().catch(() => ({}))) as Partial<RolesCatalogResponse>;
      const nextRoles = Array.isArray(data.roles) ? data.roles : [];
      setRoles(nextRoles);
      if (data.defaultPermissions && typeof data.defaultPermissions === "object") {
        setDefaultPermissions(data.defaultPermissions);
      }
      if (selectRoleByName) {
        const match = nextRoles.find(
          (item) => item.name.trim().toLowerCase() === selectRoleByName.trim().toLowerCase(),
        );
        if (match) {
          setHighlightedRoleId(String(match.roleId));
        }
      }
    } catch {
      // Handled gracefully inside modal states.
    } finally {
      setLoadingRoles(false);
    }
  }, [redirectToLogin]);

  function toggleExpand(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function openCreateAgent() {
    setEditingAgent(null);
    setAgentFormKey((value) => value + 1);
    setAgentFormOpen(true);
  }

  function openEditAgent(agent: AgentRecord) {
    setEditingAgent(agent);
    setAgentFormKey((value) => value + 1);
    setAgentFormOpen(true);
  }

  function openRolesPermissions() {
    setHighlightedRoleId("");
    setReturnToMode(null);
    setRoleModalKey((value) => value + 1);
    setRoleModalMode("roles");
    void fetchRolesCatalog();
  }

  function openAssignRole(agent: AgentRecord) {
    setAssigningAgent(agent);
    setHighlightedRoleId("");
    setReturnToMode(null);
    setRoleModalKey((value) => value + 1);
    setRoleModalMode("assign-role");
    void fetchRolesCatalog();
  }

  function openCreateRoleFrom(source: "roles" | "assign-role") {
    setReturnToMode(source);
    setRoleModalKey((value) => value + 1);
    setRoleModalMode("create-role");
    if (Object.keys(defaultPermissions).length === 0) {
      void fetchRolesCatalog();
    }
  }

  function closeRoleFlow() {
    setRoleModalMode("closed");
    setReturnToMode(null);
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = searchDraft.trim();
    if (trimmed !== activeSearch) {
      setPage(1);
      setActiveSearch(trimmed);
    } else {
      setReloadTick((value) => value + 1);
    }
  }

  function clearSearch() {
    setSearchDraft("");
    setPage(1);
    setActiveSearch("");
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
          Agent Management
        </h1>

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={openRolesPermissions}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/35 bg-mint/75 px-5 text-sm font-semibold text-primary transition hover:border-primary hover:bg-mint sm:w-auto"
          >
            <FiShield className="h-4 w-4" aria-hidden="true" />
            <span>Roles &amp; Permissions</span>
          </button>
          <button
            type="button"
            onClick={openCreateAgent}
            className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary shadow-xs transition hover:bg-primary-hover sm:w-auto"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            <span>Create Agent</span>
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-surface shadow-[var(--shadow)]">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-xs font-semibold text-primary">
              <span>All Agents</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
                {totalRecords}
              </span>
            </span>
            {loading && agents.length > 0 ? (
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
              aria-label="Search agents"
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

        {loading && agents.length === 0 ? (
          <AgentSkeletonList />
        ) : error ? (
          <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-danger/10 text-danger">
              <FiUsers className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-base font-semibold text-ink">Unable to load agents</p>
            <p className="mt-1 max-w-md text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={() => setReloadTick((value) => value + 1)}
              className="mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
            >
              Try again
            </button>
          </div>
        ) : groupedAgents.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary">
              {activeSearch ? (
                <FiSearch className="h-6 w-6" aria-hidden="true" />
              ) : (
                <FiUsers className="h-6 w-6" aria-hidden="true" />
              )}
            </span>
            <p className="mt-4 text-base font-semibold text-ink">
              {activeSearch ? "No matching agents found" : "No data found"}
            </p>
            <p className="mt-1.5 max-w-sm text-sm text-muted">
              {activeSearch
                ? `No agent records matched "${activeSearch}". Try another name, email, or phone number.`
                : "No sub-agents have been created yet. Create an agent and assign a role to get started."}
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
                  onClick={openCreateAgent}
                  className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
                >
                  <FiPlus className="h-4 w-4" aria-hidden="true" />
                  <span>Create Agent</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={`transition-opacity duration-200 ${loading ? "opacity-65" : "opacity-100"}`}>
            {/* Responsive mobile & tablet card list */}
            <div className="divide-y divide-line lg:hidden">
              {groupedAgents.map((node) => (
                <AgentMobileCard
                  key={String(node.agentId)}
                  node={node}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  onEdit={openEditAgent}
                  onAssignRole={openAssignRole}
                  onDelete={setDeletingAgent}
                />
              ))}
            </div>

            {/* Desktop 9-column table matching live QA columns */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-soft/85 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
                    <th scope="col" className="py-3.5 pr-3 pl-6">
                      Agent Id
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      First Name
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Last Name
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Phone Number
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Country
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3.5">
                      Role
                    </th>
                    <th scope="col" className="py-3.5 pr-6 pl-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-sm">
                  {groupedAgents.map((row) => {
                    const idKey = String(row.agentId);
                    const hasSubAgents = row.subAgents.length > 0;
                    const expanded = expandedIds.has(idKey);
                    const fullPhone = formatAgentPhone(row);
                    const roleName = row.roles[0]?.roleName || "N/A";

                    return (
                      <Fragment key={idKey}>
                        <tr className="transition-colors hover:bg-soft/65">
                          <td className="py-3.5 pr-3 pl-6">
                            <div className="flex items-center gap-2">
                              {hasSubAgents ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(idKey)}
                                  title="View agents created by this agent"
                                  aria-label={expanded ? "Collapse sub-agents" : "Expand sub-agents"}
                                  className="grid h-7 w-7 cursor-pointer place-items-center rounded-lg border border-line bg-page text-muted transition hover:border-primary hover:text-primary"
                                >
                                  {expanded ? (
                                    <FiChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                  ) : (
                                    <FiChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                                  )}
                                </button>
                              ) : null}
                              <span className="font-mono text-xs font-semibold text-ink">
                                {row.agentId}
                              </span>
                              {hasSubAgents ? (
                                <span
                                  title="This agent has created other agents"
                                  className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-primary"
                                >
                                  {row.subAgents.length}{" "}
                                  {row.subAgents.length === 1 ? "Sub-agent" : "Sub-agents"}
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-3.5 font-semibold text-ink">
                            {row.firstName || "—"}
                          </td>
                          <td className="px-3 py-3.5 font-semibold text-ink">
                            {row.lastName || "—"}
                          </td>
                          <td className="px-3 py-3.5 text-ink">
                            <span className="block max-w-[14rem] truncate" title={row.email || undefined}>
                              {row.email || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 text-ink tabular-nums">
                            {fullPhone || <span className="text-muted">—</span>}
                          </td>
                          <td className="px-3 py-3.5 text-ink">
                            {row.companyCountry || "NA"}
                          </td>
                          <td className="px-3 py-3.5 text-muted">
                            <span
                              className="block max-w-[12rem] truncate"
                              title={row.description || undefined}
                            >
                              {row.description || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3.5">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${
                                roleName === "N/A"
                                  ? "bg-page text-muted"
                                  : "bg-mint text-primary"
                              }`}
                            >
                              {roleName}
                            </span>
                          </td>
                          <td className="py-3.5 pr-6 pl-3 text-right">
                            <div className="inline-flex items-center justify-end">
                              <AgentRowActionsMenu
                                agent={row}
                                onEdit={openEditAgent}
                                onAssignRole={openAssignRole}
                                onDelete={setDeletingAgent}
                              />
                            </div>
                          </td>
                        </tr>

                        {hasSubAgents && expanded ? (
                          <tr className="bg-page/70">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                                <p className="border-b border-line bg-soft/75 px-4 py-2 text-xs font-semibold text-ink">
                                  Agents created by {row.firstName} {row.lastName}
                                </p>
                                <table className="w-full border-collapse text-left">
                                  <thead>
                                    <tr className="border-b border-line bg-page text-[10px] font-semibold tracking-[0.12em] text-muted uppercase">
                                      <th className="py-2 pr-3 pl-3">Agent Id</th>
                                      <th className="px-3 py-2">Name</th>
                                      <th className="px-3 py-2">Email</th>
                                      <th className="px-3 py-2">Phone</th>
                                      <th className="px-3 py-2">Country</th>
                                      <th className="px-3 py-2">Description</th>
                                      <th className="py-2 pr-3 pl-3 text-right">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <SubAgentDesktopRows
                                      nodes={row.subAgents}
                                      expandedIds={expandedIds}
                                      onToggleExpand={toggleExpand}
                                      onEdit={openEditAgent}
                                      onAssignRole={openAssignRole}
                                      onDelete={setDeletingAgent}
                                    />
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={totalRecords}
          totalPages={totalPages}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          disabled={loading}
          itemLabel="agents"
        />
      </section>

      {agentFormOpen ? (
        <AgentFormModal
          key={`${editingAgent?.agentId ?? "new"}-${agentFormKey}`}
          open={agentFormOpen}
          agent={editingAgent}
          onClose={() => setAgentFormOpen(false)}
          onUnauthorized={redirectToLogin}
          onSuccess={(message) => {
            setAgentFormOpen(false);
            toast.success(message);
            if (!editingAgent) {
              setPage(1);
            }
            setReloadTick((value) => value + 1);
          }}
        />
      ) : null}

      <AgentDeleteModal
        key={deletingAgent ? String(deletingAgent.agentId) : "none"}
        agent={deletingAgent}
        onClose={() => setDeletingAgent(null)}
        onUnauthorized={redirectToLogin}
        onDeleted={(message) => {
          const deletedLastOnPage = agents.length === 1 && page > 1;
          setDeletingAgent(null);
          toast.success(message);
          if (deletedLastOnPage) {
            setPage((current) => Math.max(1, current - 1));
          } else {
            setReloadTick((value) => value + 1);
          }
        }}
      />

      {roleModalMode === "roles" ? (
        <RolesPermissionsModal
          key={`roles-${roleModalKey}`}
          open
          roles={roles}
          defaultPermissions={defaultPermissions}
          loadingRoles={loadingRoles}
          initialRoleId={highlightedRoleId}
          onClose={closeRoleFlow}
          onOpenCreateRole={() => openCreateRoleFrom("roles")}
          onUnauthorized={redirectToLogin}
          onUpdated={(message) => {
            closeRoleFlow();
            toast.success(message);
            void fetchRolesCatalog();
            setReloadTick((value) => value + 1);
          }}
        />
      ) : null}

      {roleModalMode === "create-role" ? (
        <CreateRoleModal
          key={`create-role-${roleModalKey}`}
          open
          defaultPermissions={defaultPermissions}
          loadingCatalog={loadingRoles}
          onClose={() => {
            if (returnToMode) {
              setRoleModalMode(returnToMode);
            } else {
              closeRoleFlow();
            }
          }}
          onUnauthorized={redirectToLogin}
          onCreated={async (createdName, message) => {
            toast.success(message);
            await fetchRolesCatalog(createdName);
            if (returnToMode) {
              setRoleModalKey((value) => value + 1);
              setRoleModalMode(returnToMode);
            } else {
              closeRoleFlow();
            }
          }}
        />
      ) : null}

      {roleModalMode === "assign-role" ? (
        <AssignAgentRoleModal
          key={`assign-role-${assigningAgent?.agentId ?? "none"}-${roleModalKey}`}
          open
          agent={assigningAgent}
          roles={roles}
          loadingRoles={loadingRoles}
          initialRoleId={highlightedRoleId}
          onClose={closeRoleFlow}
          onOpenCreateRole={() => openCreateRoleFrom("assign-role")}
          onUnauthorized={redirectToLogin}
          onAssigned={(message) => {
            closeRoleFlow();
            toast.success(message);
            setReloadTick((value) => value + 1);
          }}
        />
      ) : null}
    </div>
  );
}

