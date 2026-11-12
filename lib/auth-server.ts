import "server-only";

import { cookies } from "next/headers";
import { publicEnv } from "@/lib/public-env";
import {
  apiKeyCookie,
  featureAccessFrom,
  parseAuthUser,
  sessionCookie,
  userCookie,
  type AuthUser,
} from "@/lib/auth-session";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

export function apiMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const record = body as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail) return record.detail;
  if (typeof record.message === "string" && record.message) return record.message;
  if (typeof record.error === "string" && record.error) return record.error;
  if (record.error && typeof record.error === "object") {
    const nested = record.error as Record<string, unknown>;
    if (typeof nested.detail === "string" && nested.detail) return nested.detail;
    if (typeof nested.message === "string" && nested.message) return nested.message;
    if (typeof nested.error === "string" && nested.error) return nested.error;
  }
  if (Array.isArray(record.errors) && record.errors[0] && typeof record.errors[0] === "object") {
    const message = (record.errors[0] as { message?: unknown }).message;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

export async function readUpstream(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.replace(/\s+/g, " ").slice(0, 240) };
  }
}

export async function postCustomer(path: string, body: unknown) {
  const base = publicEnv.custConfig;
  if (!base) throw new Error("Customer API is not configured.");
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const payload = await readUpstream(response);
  return { response, payload };
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function userFromAuthPayload(payload: unknown, fallbackEmail: string): { user: AuthUser; sessionToken: string; apiKey: string } | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const reseller = record.reseller_data && typeof record.reseller_data === "object"
    ? (record.reseller_data as Record<string, unknown>)
    : null;
  const info = record.user_info && typeof record.user_info === "object"
    ? (record.user_info as Record<string, unknown>)
    : null;
  const sessionToken = text(record.session_token);
  const apiKey = text(record.api_access_token) || text(reseller?.api_key_code);
  if (!sessionToken || !apiKey) return null;

  const first = text(info?.reseller_first_name) || text(info?.first_name) || text(reseller?.reseller_first_name);
  const last = text(info?.reseller_last_name) || text(info?.last_name) || text(reseller?.reseller_last_name);
  const name = `${first} ${last}`.trim() || fallbackEmail.split("@")[0] || "Partner";
  const email = text(info?.email) || text(info?.reseller_email) || text(reseller?.email) || fallbackEmail;
  const roles = record.roles_info && typeof record.roles_info === "object"
    ? (record.roles_info as Record<string, unknown>)
    : null;
  const cashback = info?.is_cashback_eligible;

  return {
    sessionToken,
    apiKey,
    user: {
      email,
      name,
      firstName: text(info?.first_name) || first,
      resellerId: text(info?.reseller_id) || text(reseller?.reseller_id),
      agentId: text(info?.agent_id),
      role: text(record.role),
      dashboardEnabled: info?.dashboard_enabled !== false,
      cashbackEligible: cashback === true || cashback === "true",
      featureAccess: featureAccessFrom(roles?.["role-access"]),
    },
  };
}

export async function writeAuthCookies(user: AuthUser, sessionToken: string, apiKey: string) {
  const jar = await cookies();
  jar.set(sessionCookie, sessionToken, cookieOptions);
  jar.set(apiKeyCookie, apiKey, cookieOptions);
  jar.set(userCookie, JSON.stringify(user), cookieOptions);
}

export async function replaceApiKey(apiKey: string) {
  const jar = await cookies();
  jar.set(apiKeyCookie, apiKey, cookieOptions);
}

export async function clearAuthCookies() {
  const jar = await cookies();
  jar.delete(sessionCookie);
  jar.delete(apiKeyCookie);
  jar.delete(userCookie);
}

export async function readAuthUser() {
  const jar = await cookies();
  const session = jar.get(sessionCookie)?.value;
  if (!session) return null;
  return parseAuthUser(jar.get(userCookie)?.value);
}

export async function readSessionTokens() {
  const jar = await cookies();
  const session = jar.get(sessionCookie)?.value;
  const apiKey = jar.get(apiKeyCookie)?.value;
  if (!session || !apiKey) return null;
  return { session, apiKey };
}
