import "server-only";

import { cookies } from "next/headers";
import { apiMessage, clearAuthCookies, readUpstream } from "@/lib/auth-server";
import { apiKeyCookie, parseAuthUser, sessionCookie, userCookie, type AuthUser } from "@/lib/auth-session";

export async function readPortalSession(): Promise<{ session: string; apiKey: string; user: AuthUser | null }> {
  const jar = await cookies();
  return {
    session: jar.get(sessionCookie)?.value ?? "",
    apiKey: jar.get(apiKeyCookie)?.value ?? "",
    user: parseAuthUser(jar.get(userCookie)?.value),
  };
}

export async function upstreamData(url: string, init: RequestInit = {}, timeoutMs = 25000) {
  const { session, apiKey } = await readPortalSession();
  if (!session || !apiKey) {
    return { status: 401, payload: { message: "Sign in required." } as unknown };
  }

  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${session}`);
  headers.set("AccessToken", apiKey);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: init.signal ?? AbortSignal.timeout(timeoutMs),
    });
    const payload = await readUpstream(response);
    if (response.status === 401 && sessionRejected(apiMessage(payload, ""))) await clearAuthCookies();
    return { status: response.status, payload };
  } catch {
    return { status: 504, payload: { message: "The service did not respond." } };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sessionRejected(message: string) {
  if (/service connection failed|unable to validate reseller/i.test(message)) return false;
  return /unauthorized|invalid token|token expired|authentication failed|not authenticated|sign in required/i.test(message);
}

const inflight = new Map<string, Promise<Response>>();

export async function upstream(url: string, init: RequestInit = {}, timeoutMs = 25000) {
  const method = (init.method || "GET").toUpperCase();
  if (method === "GET") {
    const existing = inflight.get(url);
    if (existing) return existing.then((response) => response.clone());
  }
  const request = sendUpstream(url, init, timeoutMs);
  if (method !== "GET") return request;
  inflight.set(url, request);
  return request.finally(() => inflight.delete(url));
}

export function upstreamResponse(result: { status: number; payload: unknown }) {
  if (result.status >= 400) {
    const message = apiMessage(result.payload, "The service request failed.");
    const connectionFailed = /service connection failed|unable to validate reseller/i.test(message);
    if (result.status === 401 && sessionRejected(message)) {
      return Response.json({ message: "Sign in required." }, { status: 401 });
    }
    if (connectionFailed || result.status === 401) {
      return Response.json(
        { message: "The destination service did not respond. Please try again." },
        { status: 503 },
      );
    }
    return Response.json({ message }, { status: result.status });
  }
  return Response.json(result.payload);
}

async function sendUpstream(url: string, init: RequestInit, timeoutMs: number) {
  const method = (init.method || "GET").toUpperCase();
  let result = await upstreamData(url, init, timeoutMs);
  // A 503 from inventory often clears within a second. An immediate second call hits the same outage.
  if (method === "GET") {
    for (const pause of [700, 1400]) {
      if (result.status !== 502 && result.status !== 503) break;
      await wait(pause);
      result = await upstreamData(url, init, timeoutMs);
    }
  }
  return upstreamResponse(result);
}
