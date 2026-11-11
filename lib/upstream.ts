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

export async function upstreamData(url: string, init: RequestInit = {}) {
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
      signal: AbortSignal.timeout(25000),
    });
    const payload = await readUpstream(response);
    if (response.status === 401) await clearAuthCookies();
    return { status: response.status, payload };
  } catch {
    return { status: 504, payload: { message: "The service did not respond." } };
  }
}

export async function upstream(url: string, init: RequestInit = {}) {
  const result = await upstreamData(url, init);
  if (result.status === 401) {
    return Response.json({ message: "Sign in required." }, { status: 401 });
  }
  if (result.status >= 400) {
    return Response.json(
      { message: apiMessage(result.payload, "The service request failed.") },
      { status: result.status },
    );
  }
  return Response.json(result.payload);
}
