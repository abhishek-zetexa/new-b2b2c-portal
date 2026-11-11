import { NextRequest } from "next/server";
import { publicEnv } from "@/lib/public-env";
import { apiMessage, readAuthUser, readSessionTokens, readUpstream } from "@/lib/auth-server";
import {
  normalizeSimInventoryItem,
  validateIccidRange,
  type AssignSimPayload,
  type SimInventoryListResponse,
} from "@/lib/sim-inventory";

function authHeaders(session: string, apiKey: string, withJson = false) {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${session}`,
    AccessToken: apiKey,
  };
  if (withJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function clampPositiveInt(raw: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

export async function GET(request: NextRequest) {
  const [tokens, user] = await Promise.all([readSessionTokens(), readAuthUser()]);
  if (!tokens || !user) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "SIM inventory service is not configured." }, { status: 500 });
  }
  if (!user.resellerId) {
    return Response.json(
      { message: "Reseller ID is missing from your session. Sign out and sign in again." },
      { status: 400 },
    );
  }

  const params = request.nextUrl.searchParams;
  const page = clampPositiveInt(params.get("page"), 1, 10_000);
  const pageSize = clampPositiveInt(params.get("page_size"), 10, 100);
  const searchKey = (params.get("search_key") ?? "").trim();

  const upstreamUrl = new URL(`${publicEnv.custConfig}External/Reseller/Get-SIM-Inventory`);
  upstreamUrl.searchParams.set("page", String(page));
  upstreamUrl.searchParams.set("page_size", String(pageSize));
  upstreamUrl.searchParams.set("reseller_id", user.resellerId);
  upstreamUrl.searchParams.set("search_key", searchKey);

  try {
    const response = await fetch(upstreamUrl, {
      headers: authHeaders(tokens.session, tokens.apiKey),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await readUpstream(response);

    if (response.status === 401) {
      return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }
    if (!response.ok) {
      return Response.json(
        { message: apiMessage(payload, "Failed to load SIM inventory.") },
        { status: response.status || 502 },
      );
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (record.success === false) {
      return Response.json(
        { message: apiMessage(payload, "Failed to load SIM inventory.") },
        { status: 400 },
      );
    }

    const rawList = Array.isArray(record.data) ? record.data : [];
    const items = rawList
      .map((item) => normalizeSimInventoryItem(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalCountRaw = Number(record.total_count);
    const totalCount =
      Number.isFinite(totalCountRaw) && totalCountRaw >= 0 ? totalCountRaw : items.length;
    const totalPagesRaw = Number(record.total_pages);
    const totalPages =
      Number.isFinite(totalPagesRaw) && totalPagesRaw >= 1
        ? totalPagesRaw
        : Math.max(1, Math.ceil(totalCount / pageSize));
    const currentPageRaw = Number(record.current_page);
    const currentPage =
      Number.isFinite(currentPageRaw) && currentPageRaw >= 1 ? currentPageRaw : page;

    const result: SimInventoryListResponse = {
      items,
      currentPage,
      totalPages,
      totalCount,
    };
    return Response.json(result);
  } catch {
    return Response.json(
      { message: "Cannot reach the SIM inventory service. Try again in a moment." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const [tokens, user] = await Promise.all([readSessionTokens(), readAuthUser()]);
  if (!tokens || !user) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "SIM inventory service is not configured." }, { status: 500 });
  }
  if (!user.resellerId) {
    return Response.json(
      { message: "Reseller ID is missing from your session. Sign out and sign in again." },
      { status: 400 },
    );
  }

  let body: Partial<AssignSimPayload>;
  try {
    body = (await request.json()) as Partial<AssignSimPayload>;
  } catch {
    return Response.json({ message: "Invalid assign SIM payload." }, { status: 400 });
  }

  const startIccid = (body.start_iccid ?? "").trim();
  const endIccid = (body.end_iccid ?? "").trim();
  const agentId = (body.agent_id ?? "").trim();

  const { startError, endError } = validateIccidRange(startIccid, endIccid);
  if (startError) return Response.json({ message: startError }, { status: 400 });
  if (endError) return Response.json({ message: endError }, { status: 400 });
  if (!agentId) {
    return Response.json({ message: "Please select an agent." }, { status: 400 });
  }

  const upstreamBody = {
    start_iccid: startIccid,
    end_iccid: endIccid,
    agent_id: agentId,
    reseller_id: user.resellerId,
  };

  try {
    const response = await fetch(
      `${publicEnv.custConfig}Internal/Reseller/Assign-SIM-Bulk`,
      {
        method: "POST",
        headers: authHeaders(tokens.session, tokens.apiKey, true),
        body: JSON.stringify(upstreamBody),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    const payload = await readUpstream(response);

    if (response.status === 401) {
      return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (!response.ok || record.success === false) {
      return Response.json(
        { message: apiMessage(payload, "Failed to assign SIMs.") },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : "SIMs assigned successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the SIM inventory service. Try again in a moment." },
      { status: 502 },
    );
  }
}

