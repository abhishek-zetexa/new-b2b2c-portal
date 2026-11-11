import { NextRequest } from "next/server";
import { publicEnv } from "@/lib/public-env";
import { apiMessage, readSessionTokens, readUpstream } from "@/lib/auth-server";
import {
  countPermissions,
  normalizePermissionMap,
  normalizeRole,
  type PermissionMap,
  type RolesCatalogResponse,
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

export async function GET() {
  const tokens = await readSessionTokens();
  if (!tokens) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "Role service is not configured." }, { status: 500 });
  }

  try {
    const [rolesRes, permsRes] = await Promise.all([
      fetch(`${publicEnv.custConfig}reseller/agent/assign-role/`, {
        headers: authHeaders(tokens.session, tokens.apiKey),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }),
      fetch(`${publicEnv.custConfig}internal/default-permissions/`, {
        headers: authHeaders(tokens.session, tokens.apiKey),
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }),
    ]);

    if (rolesRes.status === 401 || permsRes.status === 401) {
      return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
    }

    const rolesPayload = await readUpstream(rolesRes);
    const permsPayload = await readUpstream(permsRes);

    if (!rolesRes.ok) {
      return Response.json(
        { message: apiMessage(rolesPayload, "Failed to load roles.") },
        { status: rolesRes.status || 502 },
      );
    }

    const rolesRecord =
      rolesPayload && typeof rolesPayload === "object"
        ? (rolesPayload as Record<string, unknown>)
        : {};
    if (rolesRecord.success === false) {
      return Response.json(
        { message: apiMessage(rolesPayload, "Failed to load roles.") },
        { status: 400 },
      );
    }

    const rawRoles = Array.isArray(rolesRecord.data) ? rolesRecord.data : [];
    const roles = rawRoles
      .map((item) => normalizeRole(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    let defaultPermissions: PermissionMap = {};
    if (permsRes.ok && permsPayload && typeof permsPayload === "object") {
      const permsRecord = permsPayload as Record<string, unknown>;
      defaultPermissions = normalizePermissionMap(permsRecord.permission_list);
    }

    const result: RolesCatalogResponse = { roles, defaultPermissions };
    return Response.json(result);
  } catch {
    return Response.json(
      { message: "Cannot reach the role service. Try again in a moment." },
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
    return Response.json({ message: "Role service is not configured." }, { status: 500 });
  }

  let body: {
    role_id?: number | string;
    name?: string;
    description?: string;
    permissions?: PermissionMap;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Invalid role payload." }, { status: 400 });
  }

  const permissions = normalizePermissionMap(body.permissions);
  if (countPermissions(permissions) === 0) {
    return Response.json({ message: "At least one permission must be selected." }, { status: 400 });
  }

  const isUpdateRolePermissions =
    body.role_id !== undefined && body.role_id !== null && String(body.role_id).trim() !== "";

  let upstreamBody: Record<string, unknown>;
  if (isUpdateRolePermissions) {
    upstreamBody = {
      role_id: body.role_id,
      permissions,
    };
  } else {
    const name = (body.name ?? "").trim();
    if (!name) {
      return Response.json({ message: "Role name is required." }, { status: 400 });
    }
    upstreamBody = {
      name,
      description: (body.description ?? "").trim(),
      permissions,
    };
  }

  try {
    const response = await fetch(`${publicEnv.custConfig}reseller/agent/assign-role/`, {
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
          message: apiMessage(
            payload,
            isUpdateRolePermissions ? "Failed to update role permissions." : "Failed to create role.",
          ),
        },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message: isUpdateRolePermissions
        ? "Agent role updated successfully"
        : "Role created successfully!",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the role service. Try again in a moment." },
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
    return Response.json({ message: "Role service is not configured." }, { status: 500 });
  }

  let body: {
    role_id?: number | string;
    agent_id?: number | string;
    allowed_permissions?: PermissionMap;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "Invalid role assignment payload." }, { status: 400 });
  }

  if (body.role_id === undefined || body.role_id === null || String(body.role_id).trim() === "") {
    return Response.json({ message: "Select a role to assign." }, { status: 400 });
  }
  if (body.agent_id === undefined || body.agent_id === null || String(body.agent_id).trim() === "") {
    return Response.json({ message: "Agent ID is required." }, { status: 400 });
  }

  const allowedPermissions = normalizePermissionMap(body.allowed_permissions);
  if (countPermissions(allowedPermissions) === 0) {
    return Response.json({ message: "Selected role has no permissions configured." }, { status: 400 });
  }

  try {
    const response = await fetch(`${publicEnv.custConfig}reseller/agent/assign-role/`, {
      method: "PUT",
      headers: authHeaders(tokens.session, tokens.apiKey, true),
      body: JSON.stringify({
        role_id: body.role_id,
        agent_id: body.agent_id,
        allowed_permissions: allowedPermissions,
      }),
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
        { message: apiMessage(payload, "Failed to assign agent role.") },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message: "Agent role updated successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the role service. Try again in a moment." },
      { status: 502 },
    );
  }
}

