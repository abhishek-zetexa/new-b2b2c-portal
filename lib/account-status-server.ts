import "server-only";
import { publicEnv } from "@/lib/public-env";
import { readSessionTokens } from "@/lib/auth-server";
import { parseAccountStatus } from "@/lib/account-status";

export async function readAccountStatus(role: string) {
  const tokens = await readSessionTokens();
  if (!tokens || !publicEnv.custUrl) return null;

  try {
    const response = await fetch(`${publicEnv.custUrl}api/v2/reseller-dashboard-details`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tokens.session}`,
        AccessToken: tokens.apiKey,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return parseAccountStatus(await response.json(), role);
  } catch {
    return null;
  }
}
