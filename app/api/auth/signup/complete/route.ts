import { apiMessage, postCustomer, userFromAuthPayload, writeAuthCookies } from "@/lib/auth-server";

type CompleteBody = {
  email?: string;
  otp?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  industry?: string;
  websiteUrl?: string;
  interestedIn?: string;
  interestedProducts?: string[];
  referralCode?: string;
  country?: string;
  dialCode?: string;
  phone?: string;
  businessType?: string;
};

export async function POST(request: Request) {
  let body: CompleteBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Enter the 6-digit code." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? "";
  const otp = (body.otp ?? "").replace(/\D/g, "");
  const phone = (body.phone ?? "").replace(/\D/g, "");
  const dialCode = body.dialCode?.trim() ?? "";
  if (!email || otp.length !== 6) {
    return Response.json({ message: "Enter the 6-digit code." }, { status: 400 });
  }

  try {
    const verified = await postCustomer("Reseller/Agent/VerifyOtp", { email, otp, action: "signup" });
    if (!verified.response.ok) {
      return Response.json({ message: apiMessage(verified.payload, "The code could not be verified.") }, { status: verified.response.status || 502 });
    }
    const verifiedRecord = verified.payload && typeof verified.payload === "object"
      ? (verified.payload as { success?: boolean; message?: string })
      : {};
    if (verifiedRecord.success === false) {
      return Response.json({ message: verifiedRecord.message || "OTP verification failed." }, { status: 400 });
    }

    const products = Array.isArray(body.interestedProducts)
      ? body.interestedProducts.filter((item) => typeof item === "string")
      : [];
    const lastName = body.lastName?.trim() ?? "";
    const registration: Record<string, unknown> = {
      email,
      reseller_first_name: body.firstName?.trim() ?? "",
      company_name: body.companyName?.trim() ?? "",
      industry: body.industry?.trim() ?? "",
      website_url: body.websiteUrl?.trim().toLowerCase() ?? "",
      interested_in: body.interestedIn?.trim() ?? "",
      products_intrested_in: products,
      referral_code: body.referralCode?.trim() ?? "",
      subdomain: "",
      phone: phone ? `${dialCode}${phone}` : "",
      company_country: body.country?.trim() ?? "",
      is_newly_onboarded: true,
      is_cashback_eligible: true,
      business_type: body.businessType?.trim() ?? "",
      dashboard_enabled: false,
    };
    if (lastName) registration.reseller_last_name = lastName;

    const registered = await postCustomer("resellers/register", registration);
    if (!registered.response.ok) {
      return Response.json({ message: apiMessage(registered.payload, "The account could not be created.") }, { status: registered.response.status || 502 });
    }
    const session = userFromAuthPayload(registered.payload, email);
    if (!session) {
      return Response.json({ message: "The account was created, but the session was incomplete. Log in with the same email." }, { status: 502 });
    }
    await writeAuthCookies(session.user, session.sessionToken, session.apiKey);
    return Response.json({
      message: session.user.dashboardEnabled
        ? "Account created."
        : "Account created. One last step: verify your business.",
      user: session.user,
    });
  } catch {
    return Response.json({ message: "Cannot reach the partner service. Try again in a moment." }, { status: 502 });
  }
}
