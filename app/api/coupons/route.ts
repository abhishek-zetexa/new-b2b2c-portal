import { publicEnv } from "@/lib/public-env";
import { upstream } from "@/lib/upstream";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") || "programs";

  if (resource === "program") {
    const id = searchParams.get("id");
    if (!id) return Response.json({ message: "Program id is required." }, { status: 400 });
    return upstream(`${publicEnv.adminConfig}partner/programs/${encodeURIComponent(id)}`);
  }

  if (resource === "countries") {
    return upstream(`${publicEnv.adminConfig}Country-Region-List`);
  }

  if (resource === "codes") {
    const params = new URLSearchParams();
    for (const key of ["program_id", "search", "page", "page_size", "usage_state"]) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }
    if (params.has("page")) params.set("page_number", params.get("page") || "1");
    const query = params.toString();
    return upstream(`${publicEnv.custConfig}progrms/coupon-codes-list${query ? `?${query}` : ""}`);
  }

  return upstream(`${publicEnv.adminConfig}partner/programs`);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (!body) return Response.json({ message: "Request is empty." }, { status: 400 });

  if (body.action === "sync") {
    return upstream(`${publicEnv.custConfig}reseller/sync-with-unlimit`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  const payload = { ...body };
  delete payload.action;
  const path = body.action === "revoke" ? "rewards/coupon/revoke" : "rewards/travelers/register";
  return upstream(`${publicEnv.custConfig}${path}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
