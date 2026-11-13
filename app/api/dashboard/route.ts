import { publicEnv } from "@/lib/public-env";
import { upstream } from "@/lib/upstream";

function queryValue(params: URLSearchParams, key: string) {
  return params.get(key) ?? "";
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const resource = params.get("resource") || "details";
  const resellerId = queryValue(params, "reseller_id");
  const agentId = queryValue(params, "agent_id");

  if (resource === "services") {
    const query = new URLSearchParams({
      reseller_id: resellerId,
      agent_id: agentId,
      isPartnersPortalRequest: "true",
    });
    return upstream(`${publicEnv.invConfig}b2b-partner/airport-addons/available-services?${query.toString()}`);
  }

  if (resource === "banners") {
    return upstream(
      `${publicEnv.adminConfig}promotional-banner/referral/based?reseller_id=${encodeURIComponent(resellerId)}`,
    );
  }

  if (resource === "destinations") {
    return upstream(`${publicEnv.custConfig}External/Reseller/TopDestinations`);
  }

  if (resource === "orders") {
    const query = new URLSearchParams({
      page: "1",
      page_size: "10",
      agent_id: agentId,
    });
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/order-list/search?${query.toString()}`);
  }

  if (resource === "checkout") {
    return upstream(`${publicEnv.orderNewConfig}v2/reseller/agent/last-checkout`);
  }

  return upstream(`${publicEnv.custUrl}api/v2/reseller-dashboard-details`, {}, 8000);
}

export async function POST(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource");
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ message: "Request is empty." }, { status: 400 });

  if (resource === "revenue") {
    if (!body.fromDate || !body.toDate || !body.reseller_id) {
      return Response.json(
        { message: "Could not load dashboard data. Try changing the date range or refresh." },
        { status: 400 },
      );
    }
    return upstream(`${publicEnv.ordersConfig}services/revenue`, {
      method: "POST",
      body: JSON.stringify({
        fromDate: body.fromDate,
        toDate: body.toDate,
        reseller_id: body.reseller_id,
        reseller_currency: body.reseller_currency || "USD",
      }),
    });
  }

  if (resource !== "coupon") {
    return Response.json({ message: "Unknown dashboard resource." }, { status: 400 });
  }
  if (!body.checkout_id || !body.coupon_code) {
    return Response.json({ message: "Checkout and coupon are required." }, { status: 400 });
  }

  return upstream(`${publicEnv.ordersConfig}Reseller/Agent/Add-Free-Coupon`, {
    method: "POST",
    body: JSON.stringify({
      checkout_id: body.checkout_id,
      coupon_code: body.coupon_code,
    }),
  });
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body?.service_name || !body.reseller_id) {
    return Response.json({ message: "Service and reseller are required." }, { status: 400 });
  }
  return upstream(`${publicEnv.invConfig}b2b-partner/addon-service/status`, {
    method: "PATCH",
    body: JSON.stringify({
      service_name: body.service_name,
      reseller_id: body.reseller_id,
      status: body.status === true,
    }),
  });
}
