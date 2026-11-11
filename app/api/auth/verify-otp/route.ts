import { apiMessage, postCustomer, userFromAuthPayload, writeAuthCookies } from "@/lib/auth-server";

export async function POST(request: Request) {
  let body: { email?: string; otp?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Enter the 6-digit code." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const otp = (body.otp ?? "").replace(/\D/g, "");
  const action = body.action === "signup" ? "signup" : "login";
  if (!email || otp.length !== 6) {
    return Response.json({ message: "Enter the 6-digit code." }, { status: 400 });
  }

  try {
    const { response, payload } = await postCustomer("Reseller/Agent/VerifyOtp", { email, otp, action });
    if (!response.ok) {
      return Response.json({ message: apiMessage(payload, "The code could not be verified.") }, { status: response.status || 502 });
    }
    const record = payload && typeof payload === "object" ? (payload as { success?: boolean; message?: string }) : {};
    if (record.success === false) {
      return Response.json({ message: record.message || "OTP verification failed." }, { status: 400 });
    }
    if (action === "signup") {
      return Response.json({ verified: true, message: record.message || "Code verified." });
    }

    const session = userFromAuthPayload(payload, email);
    if (!session) {
      return Response.json({ message: "The code was accepted, but the session was incomplete. Try again." }, { status: 502 });
    }
    await writeAuthCookies(session.user, session.sessionToken, session.apiKey);
    return Response.json({
      message: "OTP verified successfully.",
      user: session.user,
    });
  } catch {
    return Response.json({ message: "Cannot reach the partner service. Try again in a moment." }, { status: 502 });
  }
}
