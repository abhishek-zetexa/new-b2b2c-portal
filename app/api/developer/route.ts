import { publicEnv } from "@/lib/public-env";
import { replaceApiKey } from "@/lib/auth-server";
import { readPortalSession, upstream, upstreamData } from "@/lib/upstream";

const stagingBase = "https://cust-stg.zetexa.com/api/v1/";

export async function GET(request: Request) {
  const env = new URL(request.url).searchParams.get("env");
  if (env === "staging") {
    const requested = new URL(request.url).searchParams.get("email");
    const { user } = await readPortalSession();
    const email = requested || user?.email || "";
    if (!email) return Response.json({ message: "Account email is missing." }, { status: 400 });
    return upstream(`${stagingBase}reseller/staging/onboard?email=${encodeURIComponent(email)}`);
  }
  if (env === "profile") {
    return upstream(`${publicEnv.custConfig}reseller/profileInfo`);
  }
  if (env === "account") {
    return upstream(`${publicEnv.custUrl}api/v2/reseller-dashboard-details`);
  }
  return upstream(`${publicEnv.custConfig}b2b/developer-info`);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    action?: string;
    env?: string;
    reseller_id?: string;
    password?: string;
    webhook_url?: string;
    es_webhook_alert?: string;
  } | null;
  if (!body?.reseller_id) {
    return Response.json({ message: "Reseller id is required." }, { status: 400 });
  }
  const base = body.env === "staging" ? stagingBase : publicEnv.custConfig;

  if (body.action === "password") {
    return upstream(`${base}cust/reseller/generate-password`, {
      method: "POST",
      body: JSON.stringify({ reseller_id: body.reseller_id, password: body.password }),
    });
  }

  if (body.action === "regenerate") {
    const result = await upstreamData(`${base}b2b/rollkeys?reseller_id=${encodeURIComponent(body.reseller_id)}`, {
      method: "PATCH",
      body: JSON.stringify({ reseller_id: body.reseller_id }),
    });
    const payload = result.payload as { api_key_code?: string };
    if (result.status < 400 && body.env !== "staging" && payload.api_key_code) {
      await replaceApiKey(payload.api_key_code);
    }
    if (result.status >= 400) {
      return Response.json({ message: "Failed to regenerate API key. Please try again." }, { status: result.status });
    }
    return Response.json(result.payload);
  }

  return upstream(`${base}b2b/reseller/webhookurl`, {
    method: "POST",
    body: JSON.stringify({
      webhook_url: body.webhook_url || "",
      es_webhook_alert: body.es_webhook_alert || "",
      reseller_id: body.reseller_id,
      action: body.action === "eswebhook" ? "eswebhook" : "webhook",
    }),
  });
}
