import { clearAuthCookies } from "@/lib/auth-server";

export async function POST() {
  await clearAuthCookies();
  return Response.json({ ok: true });
}
