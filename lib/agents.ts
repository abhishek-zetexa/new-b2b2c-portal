export type PermissionMap = Record<string, string[]>;

export type AgentRoleSummary = {
  roleId: number | string;
  roleName: string;
};

export type AgentRecord = {
  agentId: number | string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  companyCountry: string;
  status: string;
  description: string;
  roles: AgentRoleSummary[];
  parentAgentId: string;
};

export type AgentTreeNode = AgentRecord & {
  subAgents: AgentTreeNode[];
};

export type AgentListResponse = {
  agents: AgentRecord[];
  currentPage: number;
  totalPages: number;
  totalRecords: number;
};

export type RoleRecord = {
  roleId: number | string;
  name: string;
  description: string;
  status: boolean;
  permissions: PermissionMap;
};

export type RolesCatalogResponse = {
  roles: RoleRecord[];
  defaultPermissions: PermissionMap;
};

export type CreateAgentPayload = {
  agent_first_name: string;
  agent_last_name: string;
  email: string;
  phone: string;
  phone_country_code: string;
  status: string;
  description: string;
};

export type UpdateAgentPayload = {
  agent_id: number | string;
  phone: string;
  phone_country_code: string;
  status: string;
  description: string;
};

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function readId(value: unknown): number | string {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value.trim();
  return "";
}

export function normalizePermissionMap(raw: unknown): PermissionMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result: PermissionMap = {};
  for (const [category, list] of Object.entries(raw as Record<string, unknown>)) {
    const key = category.trim();
    if (!key || !Array.isArray(list)) continue;
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const item of list) {
      const perm = typeof item === "string" ? item.trim() : "";
      if (perm && !seen.has(perm)) {
        seen.add(perm);
        cleaned.push(perm);
      }
    }
    if (cleaned.length > 0) {
      result[key] = cleaned;
    }
  }
  return result;
}

export function mergePermissionCatalogs(
  baseCatalog: PermissionMap,
  extraPermissions?: PermissionMap,
): PermissionMap {
  const merged: PermissionMap = {};
  for (const [category, items] of Object.entries(baseCatalog)) {
    merged[category] = [...items];
  }
  if (!extraPermissions) return merged;
  for (const [category, items] of Object.entries(extraPermissions)) {
    const existing = merged[category] ?? [];
    const seen = new Set(existing);
    for (const perm of items) {
      if (!seen.has(perm)) {
        seen.add(perm);
        existing.push(perm);
      }
    }
    if (existing.length > 0) {
      merged[category] = existing;
    }
  }
  return merged;
}

export function countPermissions(permissions: PermissionMap): number {
  let count = 0;
  for (const items of Object.values(permissions)) {
    count += items.length;
  }
  return count;
}

export function normalizeAgent(raw: unknown): AgentRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const agentId = readId(record.agent_id ?? record.id);
  if (agentId === "") return null;

  const rawRoles = Array.isArray(record.roles) ? record.roles : [];
  const roles: AgentRoleSummary[] = [];
  for (const item of rawRoles) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const roleId = readId(entry.role_id ?? entry.id);
    const roleName = readText(entry.role_name ?? entry.name);
    if (roleId !== "" || roleName) {
      roles.push({ roleId, roleName: roleName || "Unnamed Role" });
    }
  }

  const parentObj =
    record.parent_agent && typeof record.parent_agent === "object"
      ? (record.parent_agent as Record<string, unknown>)
      : null;

  const rawCode = readText(record.phone_country_code);
  const phoneCountryCode = rawCode && !rawCode.startsWith("+") ? `+${rawCode}` : rawCode;
  const rawPhone = readText(record.phone);
  const phone = /none|null|undefined/i.test(rawPhone) ? "" : rawPhone;

  return {
    agentId,
    firstName: readText(record.agent_first_name ?? record.first_name),
    lastName: readText(record.agent_last_name ?? record.last_name),
    email: readText(record.email),
    phone,
    phoneCountryCode: /none|null|undefined/i.test(phoneCountryCode) ? "" : phoneCountryCode,
    companyCountry: readText(record.company_country ?? record.nationality) || "NA",
    status: readText(record.status).toUpperCase() || "ACTIVE",
    description: readText(record.description),
    roles,
    parentAgentId: readText(parentObj?.id ?? parentObj?.agent_id),
  };
}

export function normalizeRole(raw: unknown): RoleRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const roleId = readId(record.role_id ?? record.id);
  if (roleId === "") return null;

  return {
    roleId,
    name: readText(record.name ?? record.role_name) || `Role #${roleId}`,
    description: readText(record.description),
    status: Boolean(record.status),
    permissions: normalizePermissionMap(record.permissions),
  };
}

/**
 * Groups flat agents into a hierarchy based on `parentAgentId` while
 * defending against self-references or cyclic parent pointers.
 */
export function groupSubAgents(agents: AgentRecord[]): AgentTreeNode[] {
  const byId = new Map<string, AgentTreeNode>();
  const orderedNodes: AgentTreeNode[] = [];

  for (const agent of agents) {
    const node: AgentTreeNode = { ...agent, subAgents: [] };
    byId.set(String(agent.agentId), node);
    orderedNodes.push(node);
  }

  const roots: AgentTreeNode[] = [];

  for (const node of orderedNodes) {
    const idKey = String(node.agentId);
    const parentKey = node.parentAgentId;
    if (!parentKey || parentKey === idKey) {
      roots.push(node);
      continue;
    }

    const parent = byId.get(parentKey);
    if (!parent) {
      roots.push(node);
      continue;
    }

    // Cycle check: walk upward from parent to confirm `node` is not an ancestor.
    let createsCycle = false;
    let cursor: AgentTreeNode | undefined = parent;
    const seen = new Set<string>([idKey]);
    while (cursor) {
      const cursorKey = String(cursor.agentId);
      if (seen.has(cursorKey)) {
        createsCycle = true;
        break;
      }
      seen.add(cursorKey);
      cursor = cursor.parentAgentId ? byId.get(cursor.parentAgentId) : undefined;
    }

    if (createsCycle) {
      roots.push(node);
    } else {
      parent.subAgents.push(node);
    }
  }

  return roots;
}

const agentFieldMap: Record<string, string> = {
  agent_first_name: "firstName",
  first_name: "firstName",
  agent_last_name: "lastName",
  last_name: "lastName",
  email: "email",
  phone: "phone",
  phone_country_code: "phone",
  status: "status",
  description: "description",
};

export function extractAgentFieldErrors(payload: unknown): Record<string, string> {
  if (!payload || typeof payload !== "object") return {};
  const errors = (payload as { errors?: unknown }).errors;
  if (!errors) return {};

  const mapped: Record<string, string> = {};
  if (Array.isArray(errors)) {
    for (const item of errors) {
      if (!item || typeof item !== "object") continue;
      const entry = item as Record<string, unknown>;
      const key = agentFieldMap[readText(entry.field)] ?? readText(entry.field);
      const message = readText(entry.message);
      if (key && message) mapped[key] = message;
    }
    return mapped;
  }

  if (typeof errors === "object") {
    for (const [rawKey, rawVal] of Object.entries(errors as Record<string, unknown>)) {
      const key = agentFieldMap[rawKey] ?? rawKey;
      const message =
        typeof rawVal === "string"
          ? rawVal.trim()
          : Array.isArray(rawVal) && typeof rawVal[0] === "string"
            ? rawVal[0].trim()
            : "";
      if (key && message) mapped[key] = message;
    }
  }

  return mapped;
}

