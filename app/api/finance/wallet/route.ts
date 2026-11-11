import { publicEnv } from "@/lib/public-env";
import { upstream, upstreamData } from "@/lib/upstream";

function normalizeCurrency(raw: unknown) {
  const value = String(raw || "").toUpperCase();
  if (value === "INR" || value === "₹" || value.includes("INR")) return "INR";
  if (value === "USD" || value === "$" || value.includes("USD")) return "USD";
  return null;
}

function isSuccessfulTopUp(transaction: Record<string, unknown>) {
  if (String(transaction.transaction_status || "").toUpperCase() !== "SUCCESS") return false;
  return !/\bDR\b|DEBIT|ORDER|PURCHASE|DEDUCT|REFUND/.test(String(transaction.transaction_type || "").toUpperCase());
}

async function initialTopUp() {
  let page = 1;
  let currency: "INR" | "USD" | null = null;
  let total = 0;

  while (page < 50) {
    const result = await upstreamData(
      `${publicEnv.paymentUrl}api/v1/reseller/dahsboard/wallet-transaction?page=${page}&page_size=100`,
    );
    if (result.status === 403) {
      return Response.json(
        { message: "Access Denied. You dont have permission to view this page. Please contact the admin for access." },
        { status: 403 },
      );
    }
    if (result.status >= 400) {
      return Response.json(result.payload, { status: result.status });
    }
    const body = result.payload as { success?: boolean; data?: Record<string, unknown>[]; wallet_details?: { currency?: unknown; balance?: unknown }; total_records?: unknown };
    const transactions = Array.isArray(body.data) ? body.data : [];
    if (page === 1) {
      currency = normalizeCurrency(body.wallet_details?.currency);
      const balance = Number(body.wallet_details?.balance);
      total = Number(body.total_records ?? transactions.length);
      const hasWallet = !!body.success && !!currency && Number.isFinite(balance) && Number.isFinite(total);
      if (!hasWallet || balance !== 0) {
        return Response.json({ required: false, currency: null });
      }
    }
    if (transactions.some(isSuccessfulTopUp)) {
      return Response.json({ required: false, currency: null });
    }
    if (page * 100 >= total) break;
    page += 1;
  }

  return Response.json({ required: Boolean(currency), currency });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") || "wallet";
  if (view === "initial") return initialTopUp();

  const page = searchParams.get("page") || "1";
  const pageSize = searchParams.get("page_size") || "10";
  const query = `page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`;
  const url =
    view === "orders"
      ? `${publicEnv.paymentConfig}reseller/dashboard/wallet-transaction-orders?${query}`
      : `${publicEnv.paymentUrl}api/v1/reseller/dahsboard/wallet-transaction?${query}`;

  const response = await upstream(url);
  if (response.status === 403 && view !== "orders") {
    return Response.json(
      { message: "Access Denied. You dont have permission to view this page. Please contact the admin for access." },
      { status: 403 },
    );
  }
  return response;
}
