import { apiMessage, postCustomer } from "@/lib/auth-server";

const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/;
const websitePattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;

type SignupBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
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
  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Check the form and try again." }, { status: 400 });
  }

  const firstName = body.firstName?.trim() ?? "";
  const lastName = body.lastName?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const companyName = body.companyName?.trim() ?? "";
  const websiteUrl = body.websiteUrl?.trim().toLowerCase() ?? "";
  const phone = (body.phone ?? "").replace(/\D/g, "");
  const dialCode = body.dialCode?.trim() ?? "";
  const country = body.country?.trim() ?? "";
  const businessType = body.businessType?.trim() ?? "";
  const products = Array.isArray(body.interestedProducts)
    ? body.interestedProducts.filter((item) => typeof item === "string" && item.trim())
    : [];

  if (!firstName) return Response.json({ message: "Please enter First Name." }, { status: 400 });
  if (!emailPattern.test(email)) return Response.json({ message: "Please enter a valid Email." }, { status: 400 });
  if (!country || !dialCode) return Response.json({ message: "Please select a Country." }, { status: 400 });
  if (!phone) return Response.json({ message: "Please enter mobile number." }, { status: 400 });
  if (!companyName) return Response.json({ message: "Please enter Company Name." }, { status: 400 });
  if (!businessType) return Response.json({ message: "Please select a Business Type." }, { status: 400 });
  if (websiteUrl && !websitePattern.test(websiteUrl)) {
    return Response.json({ message: "Please enter a valid website." }, { status: 400 });
  }

  const payload = {
    agent_name: lastName ? `${firstName} ${lastName}` : firstName,
    email,
    company_name: companyName,
    industry: body.industry?.trim() ?? "",
    website_url: websiteUrl,
    interested_in: body.interestedIn?.trim() ?? "",
    interested_products: products,
    referral_code: body.referralCode?.trim() ?? "",
    register_agent: true,
    action: "signup",
    phone: `${dialCode}${phone}`,
    business_type: businessType,
  };

  try {
    const { response, payload: result } = await postCustomer("Reseller/Agent/SendOtp", payload);
    if (!response.ok) {
      return Response.json({ message: apiMessage(result, "Could not send the code. Try again.") }, { status: response.status || 502 });
    }
    const record = result && typeof result === "object" ? (result as { success?: boolean; message?: string }) : {};
    if (record.success === false) {
      return Response.json({ message: record.message || "Could not send the code. Try again." }, { status: 400 });
    }
    return Response.json({ message: record.message || "OTP sent for verification." });
  } catch {
    return Response.json({ message: "Cannot reach the partner service. Try again in a moment." }, { status: 502 });
  }
}
