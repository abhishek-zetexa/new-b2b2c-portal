import { NextRequest } from "next/server";
import { publicEnv } from "@/lib/public-env";
import { apiMessage, readSessionTokens, readUpstream } from "@/lib/auth-server";
import {
  normalizeAgent,
  type AgentListResponse,
  type CreateAgentPayload,
  type UpdateAgentPayload,
} from "@/lib/agents";

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
  const tokens = await readSessionTokens();
  if (!tokens) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "Agent service is not configured." }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const page = clampPositiveInt(params.get("page"), 1, 10_000);
  const pageSize = clampPositiveInt(params.get("page_size"), 30, 100);
  const searchKey = (params.get("search_key") ?? "").trim();

  const upstreamUrl = new URL(`${publicEnv.custConfig}reseller/agent`);
  upstreamUrl.searchParams.set("page", String(page));
  upstreamUrl.searchParams.set("page_size", String(pageSize));
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
        { message: apiMessage(payload, "Failed to load agents.") },
        { status: response.status || 502 },
      );
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (record.success === false) {
      return Response.json(
        { message: apiMessage(payload, "Failed to load agents.") },
        { status: 400 },
      );
    }

    const rawList = Array.isArray(record.agents) ? record.agents : [];
    const agents = rawList
      .map((item) => normalizeAgent(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalRecordsRaw = Number(record.total_records);
    const totalRecords =
      Number.isFinite(totalRecordsRaw) && totalRecordsRaw >= 0
        ? totalRecordsRaw
        : agents.length;
    const totalPagesRaw = Number(record.total_pages);
    const totalPages =
      Number.isFinite(totalPagesRaw) && totalPagesRaw >= 1
        ? totalPagesRaw
        : Math.max(1, Math.ceil(totalRecords / pageSize));
    const currentPageRaw = Number(record.current_page);
    const currentPage =
      Number.isFinite(currentPageRaw) && currentPageRaw >= 1 ? currentPageRaw : page;

    const result: AgentListResponse = {
      agents,
      currentPage,
      totalPages,
      totalRecords,
    };
    return Response.json(result);
  } catch {
    return Response.json(
      { message: "Cannot reach the agent service. Try again in a moment." },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  const tokens = await readSessionTokens();
  if (!tokens) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "Agent service is not configured." }, { status: 500 });
  }

  let body: Partial<CreateAgentPayload>;
  try {
    body = (await request.json()) as Partial<CreateAgentPayload>;
  } catch {
    return Response.json({ message: "Invalid agent payload." }, { status: 400 });
  }

  const upstreamBody: CreateAgentPayload = {
    agent_first_name: (body.agent_first_name ?? "").trim(),
    agent_last_name: (body.agent_last_name ?? "").trim(),
    email: (body.email ?? "").trim().toLowerCase(),
    phone: (body.phone ?? "").trim(),
    phone_country_code: (body.phone_country_code ?? "").trim(),
    status: (body.status ?? "ACTIVE").trim().toUpperCase(),
    description: (body.description ?? "").trim(),
  };

  try {
    const response = await fetch(`${publicEnv.custConfig}reseller/agent`, {
      method: "POST",
      headers: authHeaders(tokens.session, tokens.apiKey, true),
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await readUpstream(response);

    if (response.status === 401) {
      return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (!response.ok || record.success === false) {
      return Response.json(
        {
          message: apiMessage(payload, "Failed to create agent."),
          errors: record.errors,
        },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : "Agent created successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the agent service. Try again in a moment." },
      { status: 502 },
    );
  }
}

export async function PUT(request: NextRequest) {
  const tokens = await readSessionTokens();
  if (!tokens) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "Agent service is not configured." }, { status: 500 });
  }

  let body: Partial<UpdateAgentPayload>;
  try {
    body = (await request.json()) as Partial<UpdateAgentPayload>;
  } catch {
    return Response.json({ message: "Invalid agent update payload." }, { status: 400 });
  }

  if (body.agent_id === undefined || body.agent_id === null || String(body.agent_id).trim() === "") {
    return Response.json({ message: "Agent ID is required." }, { status: 400 });
  }

  const upstreamBody: UpdateAgentPayload = {
    agent_id: body.agent_id,
    phone: (body.phone ?? "").trim(),
    phone_country_code: (body.phone_country_code ?? "").trim(),
    status: (body.status ?? "ACTIVE").trim().toUpperCase(),
    description: (body.description ?? "").trim(),
  };

  try {
    const response = await fetch(`${publicEnv.custConfig}reseller/agent`, {
      method: "PUT",
      headers: authHeaders(tokens.session, tokens.apiKey, true),
      body: JSON.stringify(upstreamBody),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await readUpstream(response);

    if (response.status === 401) {
      return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (!response.ok || record.success === false) {
      return Response.json(
        {
          message: apiMessage(payload, "Failed to update agent."),
          errors: record.errors,
        },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : "Agent updated successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the agent service. Try again in a moment." },
      { status: 502 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const tokens = await readSessionTokens();
  if (!tokens) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "Agent service is not configured." }, { status: 500 });
  }

  let agentId: number | string = request.nextUrl.searchParams.get("agent_id")?.trim() ?? "";
  if (!agentId) {
    try {
      const body = (await request.json()) as { agent_id?: number | string };
      if (body.agent_id !== undefined && body.agent_id !== null) {
        agentId = body.agent_id;
      }
    } catch {
      // Handled by empty check below.
    }
  }

  if (String(agentId).trim() === "") {
    return Response.json({ message: "Agent ID is required." }, { status: 400 });
  }

  const parsedNum = Number(agentId);
  const normalizedId =
    typeof agentId === "number"
      ? agentId
      : Number.isFinite(parsedNum) && /^\d+$/.test(agentId)
        ? parsedNum
        : agentId;

  try {
    const response = await fetch(`${publicEnv.custConfig}reseller/agent`, {
      method: "DELETE",
      headers: authHeaders(tokens.session, tokens.apiKey, true),
      body: JSON.stringify({ agent_id: normalizedId }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const payload = await readUpstream(response);

    if (response.status === 401) {
      return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (!response.ok || record.success === false) {
      return Response.json(
        { message: apiMessage(payload, "Failed to delete agent.") },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message:
        typeof record.message === "string" && record.message
          ? record.message
          : "Agent deleted successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the agent service. Try again in a moment." },
      { status: 502 },
    );
  }
}

