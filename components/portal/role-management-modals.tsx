"use client";

import { useMemo, useState, type FormEvent } from "react";
import { FiCheckCircle, FiInfo, FiPlus, FiSearch, FiShield, FiX } from "react-icons/fi";
import { Modal } from "@/components/ui/modal";
import { FieldLabel, FieldMessage, SelectField, TextField } from "@/components/ui/form-field";
import { WaveLoader } from "@/components/ui/wave-loader";
import {
  countPermissions,
  mergePermissionCatalogs,
  type AgentRecord,
  type PermissionMap,
  type RoleRecord,
} from "@/lib/agents";

function togglePermissionItem(
  map: PermissionMap,
  category: string,
  permission: string,
): PermissionMap {
  const current = map[category] ?? [];
  const exists = current.includes(permission);
  const nextList = exists
    ? current.filter((item) => item !== permission)
    : [...current, permission];

  const nextMap: PermissionMap = { ...map };
  if (nextList.length === 0) {
    delete nextMap[category];
  } else {
    nextMap[category] = nextList;
  }
  return nextMap;
}

function toggleCategoryItems(
  map: PermissionMap,
  category: string,
  allItems: string[],
  selectAll: boolean,
): PermissionMap {
  const nextMap: PermissionMap = { ...map };
  if (!selectAll || allItems.length === 0) {
    delete nextMap[category];
  } else {
    nextMap[category] = [...allItems];
  }
  return nextMap;
}

function PermissionGridPicker({
  catalog,
  selected,
  filter,
  onFilterChange,
  onChange,
  disabled = false,
}: {
  catalog: PermissionMap;
  selected: PermissionMap;
  filter: string;
  onFilterChange: (next: string) => void;
  onChange: (next: PermissionMap) => void;
  disabled?: boolean;
}) {
  const totalCatalogCount = useMemo(() => countPermissions(catalog), [catalog]);
  const selectedCount = useMemo(() => countPermissions(selected), [selected]);
  const allSelected = totalCatalogCount > 0 && selectedCount >= totalCatalogCount;

  const filteredEntries = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const entries = Object.entries(catalog);
    if (!query) return entries;
    return entries
      .map(([category, perms]): [string, string[]] => {
        if (category.toLowerCase().includes(query)) return [category, perms];
        return [
          category,
          perms.filter((perm) => perm.toLowerCase().includes(query)),
        ];
      })
      .filter(([, perms]) => perms.length > 0);
  }, [catalog, filter]);

  function handleToggleAll() {
    if (disabled) return;
    if (allSelected) {
      onChange({});
      return;
    }
    const next: PermissionMap = {};
    for (const [category, items] of Object.entries(catalog)) {
      if (items.length > 0) next[category] = [...items];
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <FiSearch
            className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Filter permissions or modules..."
            aria-label="Filter permissions"
            className="h-9 w-full rounded-xl border border-line bg-page pr-8 pl-9 text-xs text-ink outline-none placeholder:text-muted focus:border-primary"
          />
          {filter ? (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => onFilterChange("")}
              className="absolute top-1/2 right-2 grid h-5 w-5 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint hover:text-ink"
            >
              <FiX className="h-3 w-3" aria-hidden="true" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-primary tabular-nums">
            {selectedCount} / {totalCatalogCount} selected
          </span>
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
            <input
              type="checkbox"
              checked={allSelected}
              disabled={disabled || totalCatalogCount === 0}
              onChange={handleToggleAll}
              className="h-4 w-4 accent-[var(--teal)]"
            />
            <span>Select All</span>
          </label>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="rounded-2xl border border-line bg-page px-4 py-8 text-center text-xs text-muted">
          No permissions match &ldquo;{filter}&rdquo;.
        </div>
      ) : (
        <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
          {filteredEntries.map(([category, items], index) => {
            const chosen = selected[category] ?? [];
            const chosenSet = new Set(chosen);
            const allInCategory = items.every((perm) => chosenSet.has(perm));

            return (
              <div
                key={category}
                className="rounded-2xl border border-line bg-page/70 p-3.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 place-items-center rounded-lg bg-mint text-[11px] font-bold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-xs font-semibold text-ink sm:text-sm">
                      {category}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      onChange(
                        toggleCategoryItems(selected, category, items, !allInCategory),
                      )
                    }
                    className="cursor-pointer text-xs font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allInCategory ? "Clear group" : "Select group"}
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-2">
                  {items.map((perm) => {
                    const checked = chosenSet.has(perm);
                    return (
                      <label
                        key={`${category}:${perm}`}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${checked
                          ? "border-primary/40 bg-mint text-primary"
                          : "border-line bg-surface text-ink hover:border-primary/30"
                          } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() =>
                            onChange(togglePermissionItem(selected, category, perm))
                          }
                          className="h-3.5 w-3.5 accent-[var(--teal)]"
                        />
                        <span>{perm}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function RolesPermissionsModal({
  open,
  roles,
  defaultPermissions,
  loadingRoles,
  initialRoleId,
  onClose,
  onOpenCreateRole,
  onUpdated,
  onUnauthorized,
}: {
  open: boolean;
  roles: RoleRecord[];
  defaultPermissions: PermissionMap;
  loadingRoles: boolean;
  initialRoleId?: string;
  onClose: () => void;
  onOpenCreateRole: () => void;
  onUpdated: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const defaultSelectedId =
    initialRoleId && roles.some((r) => String(r.roleId) === initialRoleId)
      ? initialRoleId
      : roles[0]
        ? String(roles[0].roleId)
        : "";

  const [selectedRoleId, setSelectedRoleId] = useState(defaultSelectedId);
  const effectiveRoleId =
    selectedRoleId && roles.some((r) => String(r.roleId) === selectedRoleId)
      ? selectedRoleId
      : defaultSelectedId;

  const activeRole = useMemo(
    () => roles.find((item) => String(item.roleId) === effectiveRoleId) ?? null,
    [roles, effectiveRoleId],
  );

  const [draftsByRole, setDraftsByRole] = useState<Record<string, PermissionMap>>({});
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentPermissions = activeRole
    ? (draftsByRole[String(activeRole.roleId)] ?? activeRole.permissions)
    : {};

  const mergedCatalog = useMemo(
    () => mergePermissionCatalogs(defaultPermissions, activeRole?.permissions),
    [defaultPermissions, activeRole],
  );

  function updateCurrentPermissions(next: PermissionMap) {
    if (!activeRole) return;
    setError("");
    setDraftsByRole((prev) => ({
      ...prev,
      [String(activeRole.roleId)]: next,
    }));
  }

  async function handleSave() {
    if (!activeRole || busy) return;
    if (countPermissions(currentPermissions) === 0) {
      setError("At least one permission must be selected.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/agents/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          role_id: activeRole.roleId,
          permissions: currentPermissions,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || data.success === false) {
        setError(data.message || "Failed to update role permissions.");
        setBusy(false);
        return;
      }

      onUpdated(data.message || "Agent role updated successfully");
    } catch {
      setError("Cannot reach the role service. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Roles & Permissions"
      onClose={() => {
        if (!busy) onClose();
      }}
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onOpenCreateRole}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full border border-primary/35 bg-mint/70 px-4 text-xs font-semibold text-primary transition hover:border-primary hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            <span>Create New Role</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full border border-line bg-surface px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="button"
              disabled={busy || !activeRole || countPermissions(currentPermissions) === 0}
              aria-busy={busy || undefined}
              onClick={handleSave}
              className="inline-flex h-10 min-w-36 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? <WaveLoader size="sm" label="Updating" /> : "Update Permissions"}
            </button>
          </div>
        </div>
      }
    >
      {loadingRoles ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <WaveLoader size="lg" label="Loading roles" />
          <p className="text-sm text-muted">Loading roles and permissions...</p>
        </div>
      ) : roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-primary">
            <FiShield className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-base font-semibold text-ink">No roles available</p>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Create your first role to define allowed modules and actions for sub-agents.
          </p>
          <button
            type="button"
            onClick={onOpenCreateRole}
            className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-on-primary transition hover:bg-primary-hover"
          >
            <FiPlus className="h-4 w-4" aria-hidden="true" />
            <span>Create New Role</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-2.5">
            <SelectField
              id="roles-select"
              label="Role"
              value={effectiveRoleId}
              disabled={busy}
              onChange={(nextId) => {
                setSelectedRoleId(nextId);
                setError("");
              }}
            >
              {roles.map((role) => (
                <option key={String(role.roleId)} value={String(role.roleId)}>
                  {role.name}
                </option>
              ))}
            </SelectField>
            {activeRole?.description ? (
              <div className="flex items-start gap-2.5 rounded-2xl border border-primary/20 bg-mint/45 px-3.5 py-2.5">
                <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
                    Role Overview
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-ink sm:text-sm sm:leading-5">
                    {activeRole.description}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Allowed Permissions</p>
            <PermissionGridPicker
              catalog={mergedCatalog}
              selected={currentPermissions}
              filter={filter}
              onFilterChange={setFilter}
              onChange={updateCurrentPermissions}
              disabled={busy}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

export function CreateRoleModal({
  open,
  defaultPermissions,
  loadingCatalog,
  onClose,
  onCreated,
  onUnauthorized,
}: {
  open: boolean;
  defaultPermissions: PermissionMap;
  loadingCatalog: boolean;
  onClose: () => void;
  onCreated: (createdRoleName: string, message: string) => void;
  onUnauthorized: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<PermissionMap>({});
  const [filter, setFilter] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const flatPermissions = useMemo(() => {
    const items: string[] = [];
    for (const list of Object.values(permissions)) {
      items.push(...list);
    }
    return items;
  }, [permissions]);

  const nameError = submitted && !name.trim() ? "Role name is required." : "";
  const permError =
    submitted && flatPermissions.length === 0
      ? "At least one permission must be selected."
      : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSubmitted(true);
    setFormError("");

    const trimmedName = name.trim();
    if (!trimmedName || flatPermissions.length === 0) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/agents/roles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim(),
          permissions,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || data.success === false) {
        setFormError(data.message || "Failed to create role.");
        setBusy(false);
        return;
      }

      onCreated(trimmedName, data.message || "Role created successfully!");
    } catch {
      setFormError("Cannot reach the role service. Try again in a moment.");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Create Role"
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
            form="create-role-form"
            disabled={busy || loadingCatalog}
            aria-busy={busy || undefined}
            className="inline-flex h-11 min-w-28 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <WaveLoader size="sm" label="Creating" /> : "Create"}
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

      <form id="create-role-form" noValidate className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          id="role-name"
          label="Role Name"
          required
          disabled={busy}
          value={name}
          error={nameError}
          placeholder="Enter Role Name"
          onChange={(next) => {
            setName(next);
            setFormError("");
          }}
        />

        <div>
          <FieldLabel htmlFor="role-description">Role Description</FieldLabel>
          <textarea
            id="role-description"
            rows={2}
            disabled={busy}
            value={description}
            placeholder="Enter Role Description"
            onChange={(event) => setDescription(event.target.value)}
            className="field mt-2 resize-y"
          />
        </div>

        <div>
          <FieldLabel htmlFor="role-permissions-picker" required>
            Select Permissions
          </FieldLabel>
          <div id="role-permissions-picker" className="mt-2">
            {loadingCatalog ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-line bg-page py-8 text-xs text-muted">
                <WaveLoader size="sm" label="Loading permissions" />
                <span>Loading permissions catalog...</span>
              </div>
            ) : (
              <PermissionGridPicker
                catalog={defaultPermissions}
                selected={permissions}
                filter={filter}
                onFilterChange={setFilter}
                onChange={(next) => {
                  setPermissions(next);
                  setFormError("");
                }}
                disabled={busy}
              />
            )}
          </div>
          <FieldMessage>{permError}</FieldMessage>
        </div>

        <div>
          <p className="text-sm font-medium text-ink">
            Assigned Permissions <span className="text-primary">*</span>
          </p>
          <div className="mt-2 max-h-28 overflow-y-auto rounded-2xl border border-line bg-page px-3.5 py-2.5 text-xs leading-5 text-ink">
            {flatPermissions.length === 0 ? (
              <span className="text-muted">No permissions selected yet.</span>
            ) : (
              <ol className="space-y-0.5">
                {flatPermissions.map((perm, idx) => (
                  <li key={`${perm}-${idx}`}>
                    {idx + 1}. {perm}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function AssignAgentRoleModal({
  open,
  agent,
  roles,
  loadingRoles,
  initialRoleId,
  onClose,
  onOpenCreateRole,
  onAssigned,
  onUnauthorized,
}: {
  open: boolean;
  agent: AgentRecord | null;
  roles: RoleRecord[];
  loadingRoles: boolean;
  initialRoleId?: string;
  onClose: () => void;
  onOpenCreateRole: () => void;
  onAssigned: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const agentRoleId = agent?.roles[0]?.roleId ? String(agent.roles[0].roleId) : "";
  const preferredId = initialRoleId || agentRoleId;
  const validInitial =
    preferredId && roles.some((r) => String(r.roleId) === preferredId)
      ? preferredId
      : "";

  const [selectedRoleId, setSelectedRoleId] = useState(validInitial);
  const effectiveRoleId =
    selectedRoleId && roles.some((r) => String(r.roleId) === selectedRoleId)
      ? selectedRoleId
      : validInitial;

  const selectedRole = useMemo(
    () => roles.find((item) => String(item.roleId) === effectiveRoleId) ?? null,
    [roles, effectiveRoleId],
  );

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const categoryEntries = useMemo(
    () => (selectedRole ? Object.entries(selectedRole.permissions) : []),
    [selectedRole],
  );

  async function handleAssign() {
    if (!agent || !selectedRole || busy) return;
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/agents/roles", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          role_id: selectedRole.roleId,
          agent_id: agent.agentId,
          allowed_permissions: selectedRole.permissions,
        }),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
      };

      if (!response.ok || data.success === false) {
        setError(data.message || "Failed to assign role.");
        setBusy(false);
        return;
      }

      onAssigned(data.message || "Agent role updated successfully");
    } catch {
      setError("Cannot reach the role service. Try again in a moment.");
      setBusy(false);
    }
  }

  const agentName = agent ? `${agent.firstName} ${agent.lastName}`.trim() : "";

  return (
    <Modal
      open={open && Boolean(agent)}
      title="Assign Agent Role"
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
            disabled={busy || !selectedRole || categoryEntries.length === 0}
            aria-busy={busy || undefined}
            onClick={handleAssign}
            className="inline-flex h-11 min-w-32 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-semibold text-on-primary transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? <WaveLoader size="sm" label="Assigning" /> : "Assign Role"}
          </button>
        </div>
      }
    >
      {loadingRoles ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12">
          <WaveLoader size="lg" label="Loading roles" />
          <p className="text-sm text-muted">Loading available roles...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-danger/25 bg-danger/5 px-4 py-3 text-sm font-medium text-danger"
            >
              {error}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-[0.88fr_1.12fr]">
            <div className="space-y-4 rounded-2xl border border-line bg-page p-4">
              {agent ? (
                <div className="flex items-center gap-3 border-b border-line pb-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-primary">
                    <FiShield className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {agentName || `Agent #${agent.agentId}`}
                    </p>
                    <p className="truncate text-xs text-muted">{agent.email}</p>
                  </div>
                </div>
              ) : null}

              <SelectField
                id="assign-agent-role"
                label="Select Role"
                value={effectiveRoleId}
                disabled={busy}
                onChange={(nextId) => {
                  setSelectedRoleId(nextId);
                  setError("");
                }}
              >
                <option value="">Choose a role...</option>
                {roles.map((role) => (
                  <option key={String(role.roleId)} value={String(role.roleId)}>
                    {role.name}
                  </option>
                ))}
              </SelectField>

              {selectedRole?.description ? (
                <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-mint/45 px-3 py-2.5">
                  <FiInfo className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                  <p className="text-xs leading-5 text-ink">{selectedRole.description}</p>
                </div>
              ) : null}

              <button
                type="button"
                disabled={busy}
                onClick={onOpenCreateRole}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-mint/65 px-3 py-2.5 text-xs font-semibold text-primary transition hover:border-primary hover:bg-mint disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FiPlus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Create New Role</span>
              </button>
            </div>

            <div className="rounded-2xl border border-line bg-page/60 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">Allowed Permissions</p>
                <span className="rounded-full bg-mint px-2.5 py-0.5 text-xs font-semibold text-primary tabular-nums">
                  {categoryEntries.length} {categoryEntries.length === 1 ? "category" : "categories"}
                </span>
              </div>

              {categoryEntries.length === 0 ? (
                <div className="flex min-h-44 items-center justify-center rounded-2xl border border-dashed border-line bg-surface px-4 text-center text-xs text-muted">
                  Select a role to view its permissions
                </div>
              ) : (
                <div className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                  {categoryEntries.map(([category, perms], idx) => (
                    <div
                      key={category}
                      className="rounded-2xl border border-line bg-surface p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-5 w-5 place-items-center rounded-md bg-mint text-[11px] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-ink">{category}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {perms.map((perm) => (
                          <span
                            key={`${category}-${perm}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-mint/70 px-2 py-1 text-[11px] font-medium text-primary"
                          >
                            <FiCheckCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                            <span>{perm}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

