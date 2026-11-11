import { publicEnv } from "@/lib/public-env";
import { readPortalSession, upstream } from "@/lib/upstream";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { user } = await readPortalSession();
  const resellerId = user?.resellerId || "";
  if (!resellerId) {
    return Response.json({ message: "Reseller account is missing from this session." }, { status: 400 });
  }

  const view = searchParams.get("view") || "offers";
  if (view === "history") {
    const page = searchParams.get("page") || "1";
    const pageSize = searchParams.get("page_size") || "10";
    const params = new URLSearchParams({
      reseller_id: resellerId,
      page,
      per_page: pageSize,
    });
    return upstream(`${publicEnv.paymentConfig}/reseller/cashback-offers-history/?${params.toString()}`);
  }

  const currency = searchParams.get("currency") || "USD";
  const params = new URLSearchParams({ currency, reseller_id: resellerId });
  return upstream(`${publicEnv.paymentConfig}/reseller/default/cashback-offers?${params.toString()}`);
}
