import { readAuthUser } from "@/lib/auth-server";

export async function GET() {
  const user = await readAuthUser();
  if (!user) return Response.json({ message: "Sign in required." }, { status: 401 });
  return Response.json({
    email: user.email,
    name: user.name,
    firstName: user.firstName,
    resellerId: user.resellerId,
    agentId: user.agentId,
    role: user.role,
    cashbackEligible: user.cashbackEligible,
    featureAccess: user.featureAccess,
  });
}
