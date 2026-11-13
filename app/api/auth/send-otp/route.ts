import { apiMessage, postCustomer } from "@/lib/auth-server";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/;

export async function POST(request: Request) {
  let body: { email?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Enter a valid email ID." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const action = body.action === "signup" ? "signup" : "login";
  if (!emailPattern.test(email)) {
    return Response.json({ message: "Enter a valid email ID." }, { status: 400 });
  }

  try {
    let { response, payload } = await postCustomer("Reseller/Agent/SendOtp", { email, action });
    if (!response.ok && (response.status === 502 || response.status === 503)) {
      ({ response, payload } = await postCustomer("Reseller/Agent/SendOtp", { email, action }));
    }
    if (!response.ok) {
      return Response.json({ message: apiMessage(payload, "Could not send the code. Try again.") }, { status: response.status || 502 });
    }
    const record = payload && typeof payload === "object" ? (payload as { success?: boolean; message?: string }) : {};
    if (record.success === false) {
      return Response.json({ message: record.message || "Could not send the code. Try again." }, { status: 400 });
    }
    return Response.json({ message: record.message || "OTP sent for verification." });
  } catch {
    return Response.json({ message: "Cannot reach the partner service. Try again in a moment." }, { status: 502 });
  }
}
