import { publicEnv } from "@/lib/public-env";
import { upstream, upstreamData } from "@/lib/upstream";

function smtpUrl(resellerId: string) {
  return `${publicEnv.resellerBrandingPreference}api/v1/admin/internal/set-smtp-reseller?reseller_id=${encodeURIComponent(resellerId)}`;
}

function smtpFallback(notice: string | null) {
  if (notice === "tls") return "Failed to update TLS!";
  if (notice === "remove") return "Failed to remove SMTP configuration!";
  return "Failed to save SMTP configuration!";
}

function smtpFailureMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.error === "string" && nested.error.trim()) return nested.error.trim();
    if (nested.errors !== undefined && nested.errors !== null) return JSON.stringify(nested.errors);
  }
  if (record.errors !== undefined && record.errors !== null) return JSON.stringify(record.errors);
  return fallback;
}

function smtpBody(body: Record<string, unknown>) {
  return {
    reseller_id: body.reseller_id == null ? "" : String(body.reseller_id),
    reseller_name: body.reseller_name == null ? "" : String(body.reseller_name),
    email_host: body.email_host == null ? "" : String(body.email_host),
    email_port: body.email_port == null ? "" : String(body.email_port),
    email_host_user: body.email_host_user == null ? "" : String(body.email_host_user),
    email_host_password: body.email_host_password == null ? "" : String(body.email_host_password),
    default_from_email: body.default_from_email == null ? "" : String(body.default_from_email),
    email_use_tls: body.email_use_tls === true,
    action: Array.isArray(body.action) ? body.action.map((item) => String(item)) : [],
  };
}

async function smtpResult(request: Request, method: "POST" | "PUT" | "DELETE", body?: unknown) {
  const params = new URL(request.url).searchParams;
  const result = await upstreamData(smtpUrl(params.get("reseller_id") ?? ""), {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (result.status === 401) {
    return Response.json({ message: "Sign in required." }, { status: 401 });
  }
  if (result.status >= 400) {
    return Response.json(
      { message: smtpFailureMessage(result.payload, smtpFallback(params.get("notice"))) },
      { status: result.status },
    );
  }
  return Response.json(result.payload);
}

async function readBody(request: Request) {
  return (await request.json().catch(() => null)) as Record<string, unknown> | null;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const resource = params.get("resource");
  const resellerId = params.get("reseller_id") ?? "";
  const agentId = params.get("agent_id") ?? "";

  if (resource === "markup") {
    return upstream(`${publicEnv.custConfig}reseller/fetch_markup?reseller_id=${encodeURIComponent(resellerId)}`);
  }
  if (resource === "countries") {
    return upstream(`${publicEnv.adminConfig}Country-Region-List`);
  }
  if (resource === "destinations") {
    return upstream(`${publicEnv.custConfig}External/Reseller/TopDestinations`);
  }
  if (resource === "smtp") {
    const result = await upstreamData(smtpUrl(resellerId));
    if (result.status === 401) return Response.json({ message: "Sign in required." }, { status: 401 });
    if (result.status >= 400) return Response.json({ success: false });
    return Response.json(result.payload);
  }
  if (resource === "addons") {
    const query = new URLSearchParams({ reseller_id: resellerId, agent_id: agentId });
    return upstream(`${publicEnv.invConfig}b2b-partner/airport-addons/get-settings?${query.toString()}`);
  }
  return Response.json({ message: "Unknown settings resource." }, { status: 400 });
}

export async function POST(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource");
  const body = await readBody(request);
  if (!body) return Response.json({ message: "Request is empty." }, { status: 400 });

  if (resource === "markup") {
    return upstream(`${publicEnv.custConfig}reseller/markup`, {
      method: "POST",
      body: JSON.stringify({ markup: body.markup }),
    });
  }
  if (resource === "destinations") {
    return upstream(`${publicEnv.custConfig}External/Reseller/TopDestinations`, {
      method: "POST",
      body: JSON.stringify({ countries_ids: body.countries_ids }),
    });
  }
  if (resource === "smtp") return smtpResult(request, "POST", smtpBody(body));
  return Response.json({ message: "Unknown settings resource." }, { status: 400 });
}

export async function PUT(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource");
  const body = await readBody(request);
  if (!body) return Response.json({ message: "Request is empty." }, { status: 400 });

  if (resource === "smtp") return smtpResult(request, "PUT", smtpBody(body));
  if (resource === "addons") {
    return upstream(`${publicEnv.invConfig}b2b-partner/airport-addons/update-settings`, {
      method: "PUT",
      body: JSON.stringify({
        addons_settings_id: body.addons_settings_id,
        reseller_mark_up_percentage: Number(body.reseller_mark_up_percentage),
        send_email_to_customer: body.send_email_to_customer === true,
        status: true,
      }),
    });
  }
  return Response.json({ message: "Unknown settings resource." }, { status: 400 });
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const resource = params.get("resource");
  const resellerId = params.get("reseller_id") ?? "";

  if (resource === "destinations") {
    return upstream(
      `${publicEnv.custConfig}External/Reseller/TopDestinations?reseller_id=${encodeURIComponent(resellerId)}`,
      { method: "DELETE" },
    );
  }
  if (resource === "smtp") return smtpResult(request, "DELETE");
  return Response.json({ message: "Unknown settings resource." }, { status: 400 });
}
