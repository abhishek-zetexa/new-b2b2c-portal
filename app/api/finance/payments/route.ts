import { publicEnv } from "@/lib/public-env";
import { upstream } from "@/lib/upstream";

export async function GET(request: Request) {
  const resource = new URL(request.url).searchParams.get("resource") || "methods";
  const path =
    resource === "bank"
      ? "api/v2/wallet/reseller/recharge/account-details"
      : resource === "upi"
        ? "api/v2/wallet/reseller/recharge/upi-details"
        : "api/v2/admin/get/payment/method";
  return upstream(`${publicEnv.paymentUrl}${path}`);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  if (!body || typeof body !== "object") {
    return Response.json({ message: "Payment request is empty." }, { status: 400 });
  }

  const action = body.action;
  const payload = { ...body };
  delete payload.action;

  const path =
    action === "brief"
      ? "api/v2/wallet/payment/gateways/brief"
      : action === "online"
        ? "api/v2/wallet/reseller/recharge/online"
        : action === "capture"
          ? "api/v1/reseller/capture-payment-from-payment-gateway"
          : "api/v2/wallet/reseller/recharge";

  return upstream(`${publicEnv.paymentUrl}${path}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
