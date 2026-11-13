import { publicEnv } from "@/lib/public-env";
import { upstream } from "@/lib/upstream";

export async function GET(request: Request) {
  const resellerId = new URL(request.url).searchParams.get("reseller_id") ?? "";
  return upstream(
    `${publicEnv.invConfig}reseller/overall/services?reseller_id=${encodeURIComponent(resellerId)}`,
  );
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ message: "Request is empty." }, { status: 400 });

  if (body.action === "whatsapp") {
    return upstream(`${publicEnv.resellerBrandingPreference}api/v1/reseller/whatsapp-bot-request`, {
      method: "POST",
      body: JSON.stringify({
        reseller_firstname: body.reseller_firstname ?? "",
        reseller_lastname: body.reseller_lastname ?? "",
        email: body.email ?? "",
        reseller_id: body.reseller_id ?? "",
      }),
    });
  }

  return upstream(`${publicEnv.invConfig}b2b/addon-service/mapping`, {
    method: "POST",
    body: JSON.stringify({
      service_name: body.service_name ?? "",
      reseller_id: body.reseller_id ?? "",
      reseller_markup_percentage: Number(body.reseller_markup_percentage),
      send_email_to_customer: body.send_email_to_customer === true,
    }),
  });
}
