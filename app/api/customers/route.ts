import { NextRequest } from "next/server";
import { publicEnv } from "@/lib/public-env";
import { apiMessage, readSessionTokens, readUpstream } from "@/lib/auth-server";
import {
  normalizeCustomer,
  type CustomerFormPayload,
  type CustomerListResponse,
} from "@/lib/customers";

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

function buildCustomerBody(body: Partial<CustomerFormPayload>) {
  const firstName = (body.first_name ?? "").trim();
  const lastName = (body.last_name ?? "").trim();
  return {
    first_name: firstName,
    last_name: lastName,
    email: (body.email ?? "").trim(),
    country: (body.country ?? "").trim().toUpperCase(),
    customer_country: (body.customer_country ?? "").trim().toUpperCase(),
    address: (body.address ?? "").trim(),
    city: (body.city ?? "").trim(),
    state: (body.state ?? "").trim(),
    pincode: (body.pincode ?? "").trim(),
    customer_id: body.customer_id ?? null,
    user_name: (body.user_name ?? `${firstName} ${lastName}`).trim(),
    phone_number: (body.phone_number ?? "").trim(),
  };
}

export async function GET(request: NextRequest) {
  const tokens = await readSessionTokens();
  if (!tokens) {
    return Response.json({ message: "Your session has expired. Sign in again." }, { status: 401 });
  }
  if (!publicEnv.custConfig) {
    return Response.json({ message: "Customer service is not configured." }, { status: 500 });
  }

  const params = request.nextUrl.searchParams;
  const page = clampPositiveInt(params.get("page"), 1, 10_000);
  const pageSize = clampPositiveInt(params.get("page_size"), 5, 100);
  const query = (params.get("query") ?? "").trim();

  const upstreamUrl = new URL(`${publicEnv.custConfig}reseller/get-customer`);
  upstreamUrl.searchParams.set("page", String(page));
  upstreamUrl.searchParams.set("page_size", String(pageSize));
  upstreamUrl.searchParams.set("query", query);

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
        { message: apiMessage(payload, "Failed to load customers.") },
        { status: response.status || 502 },
      );
    }

    const record =
      payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    if (record.success === false) {
      return Response.json(
        { message: apiMessage(payload, "Failed to load customers.") },
        { status: 400 },
      );
    }

    const list = Array.isArray(record.customer_info) ? record.customer_info : [];
    const customers = list
      .map((item) => normalizeCustomer(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const totalCustomersRaw = Number(record.total_customers);
    const totalCustomers =
      Number.isFinite(totalCustomersRaw) && totalCustomersRaw >= 0
        ? totalCustomersRaw
        : customers.length;
    const totalPagesRaw = Number(record.total_pages);
    const totalPages =
      Number.isFinite(totalPagesRaw) && totalPagesRaw >= 1
        ? totalPagesRaw
        : Math.max(1, Math.ceil(totalCustomers / pageSize));
    const currentPageRaw = Number(record.current_page);
    const currentPage =
      Number.isFinite(currentPageRaw) && currentPageRaw >= 1 ? currentPageRaw : page;

    const result: CustomerListResponse = {
      customers,
      currentPage,
      totalPages,
      totalCustomers,
    };
    return Response.json(result);
  } catch {
    return Response.json(
      { message: "Cannot reach the customer service. Try again in a moment." },
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
    return Response.json({ message: "Customer service is not configured." }, { status: 500 });
  }

  let body: Partial<CustomerFormPayload>;
  try {
    body = (await request.json()) as Partial<CustomerFormPayload>;
  } catch {
    return Response.json({ message: "Invalid customer payload." }, { status: 400 });
  }

  const upstreamBody = buildCustomerBody({ ...body, customer_id: null });

  try {
    const response = await fetch(`${publicEnv.custConfig}reseller/customer`, {
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
          message: apiMessage(payload, "Failed to add customer."),
          errors: Array.isArray(record.errors) ? record.errors : undefined,
        },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message: typeof record.message === "string" && record.message ? record.message : "Customer added successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the customer service. Try again in a moment." },
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
    return Response.json({ message: "Customer service is not configured." }, { status: 500 });
  }

  let body: Partial<CustomerFormPayload>;
  try {
    body = (await request.json()) as Partial<CustomerFormPayload>;
  } catch {
    return Response.json({ message: "Invalid customer update payload." }, { status: 400 });
  }

  const customerId = String(body.customer_id ?? "").trim();
  if (!customerId) {
    return Response.json({ message: "Customer ID is required." }, { status: 400 });
  }

  const parsedNumericId = Number(customerId);
  const normalizedCustomerId =
    Number.isFinite(parsedNumericId) && parsedNumericId > 0 ? parsedNumericId : customerId;

  const upstreamBody = {
    ...buildCustomerBody({ ...body, customer_id: normalizedCustomerId }),
    is_default: true,
  };

  const upstreamUrl = `${publicEnv.custConfig}reseller/customer/addAddress?customer_id=${encodeURIComponent(customerId)}`;

  try {
    const response = await fetch(upstreamUrl, {
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
          message: apiMessage(payload, "Failed to update customer."),
          errors: Array.isArray(record.errors) ? record.errors : undefined,
        },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message: "Customer updated successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the customer service. Try again in a moment." },
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
    return Response.json({ message: "Customer service is not configured." }, { status: 500 });
  }

  const customerId = (request.nextUrl.searchParams.get("customer_id") ?? "").trim();
  if (!customerId) {
    return Response.json({ message: "Customer ID is required." }, { status: 400 });
  }

  const upstreamUrl = `${publicEnv.custConfig}reseller/customerInfo/delete?customer_id=${encodeURIComponent(customerId)}`;

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: authHeaders(tokens.session, tokens.apiKey, true),
      body: JSON.stringify({}),
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
        { message: apiMessage(payload, "Failed to delete customer.") },
        { status: !response.ok ? response.status || 400 : 400 },
      );
    }

    return Response.json({
      success: true,
      message: "Customer deleted successfully",
    });
  } catch {
    return Response.json(
      { message: "Cannot reach the customer service. Try again in a moment." },
      { status: 502 },
    );
  }
}

