import { readPortalSession } from "@/lib/upstream";
import { publicEnv } from "@/lib/public-env";

export async function GET() {
  const { session, apiKey } = await readPortalSession();
  if (!session || !apiKey) return Response.json({ message: "Sign in required." }, { status: 401 });
  return Response.json({
    stripePublishableKey: publicEnv.stripePublishableKey,
    razorpayKey: publicEnv.razorpayKey,
  });
}
