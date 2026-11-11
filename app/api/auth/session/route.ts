import { readAuthUser } from "@/lib/auth-server";

export async function GET() {
  const user = await readAuthUser();
  if (!user) return Response.json({ ok: false }, { status: 401 });
  return Response.json({ ok: true, dashboardEnabled: user.dashboardEnabled });
}
