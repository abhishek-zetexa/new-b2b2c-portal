export type SimInventoryRecord = {
  iccid: string;
  agentName: string;
  agentEmail: string;
  simStatus: string;
  imsiStatus: string;
};

export type SimInventoryListResponse = {
  items: SimInventoryRecord[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
};

export type AssignSimPayload = {
  start_iccid: string;
  end_iccid: string;
  agent_id: string;
};

function readText(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return /^(null|undefined|none)$/i.test(trimmed) ? "" : trimmed;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function normalizeSimInventoryItem(raw: unknown): SimInventoryRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const iccid = readText(record.iccid);
  if (!iccid) return null;

  const first = readText(record.first_name ?? record.agent_first_name);
  const last = readText(record.last_name ?? record.agent_last_name);
  const agentName = readText(record.agent_name) || `${first} ${last}`.trim();

  return {
    iccid,
    agentName,
    agentEmail: readText(record.agent_email ?? record.email),
    simStatus: readText(record.status ?? record.sim_status),
    imsiStatus: readText(record.imsi_status),
  };
}

export function statusBadgeTone(status: string): "ok" | "warn" | "muted" {
  const normalized = status.trim().toUpperCase();
  if (!normalized) return "muted";
  if (/^(ACTIVE|AVAILABLE|ASSIGNED|READY|ENABLED|SUCCESS)/.test(normalized)) {
    return "ok";
  }
  if (/^(INACTIVE|EXPIRED|SUSPENDED|BLOCKED|LOCKED|DISABLED|FAILED|TERMINATED)/.test(normalized)) {
    return "warn";
  }
  return "muted";
}

export function validateIccidRange(start: string, end: string): {
  startError: string;
  endError: string;
} {
  const s = start.trim();
  const e = end.trim();

  let startError = "";
  let endError = "";

  if (!s) {
    startError = "Start ICCID is required.";
  } else if (/\s/.test(s)) {
    startError = "Start ICCID cannot contain spaces.";
  }

  if (!e) {
    endError = "End ICCID is required.";
  } else if (/\s/.test(e)) {
    endError = "End ICCID cannot contain spaces.";
  }

  if (!startError && !endError && /^\d+$/.test(s) && /^\d+$/.test(e)) {
    try {
      if (BigInt(e) < BigInt(s)) {
        endError = "End ICCID must be greater than or equal to Start ICCID.";
      }
    } catch {
      // Ignore BigInt parse failures.
    }
  }

  return { startError, endError };
}

