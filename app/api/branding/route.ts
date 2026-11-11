import { publicEnv } from "@/lib/public-env";
import { readPortalSession, upstream } from "@/lib/upstream";

const brandingUrl = `${publicEnv.resellerBrandingPreference}api/v1/partners/reseller/branding`;

export async function GET() {
  const { user } = await readPortalSession();
  if (!user?.resellerId) {
    return Response.json({ message: "Reseller account is missing from this session." }, { status: 400 });
  }
  return upstream(`${brandingUrl}?reseller_id=${encodeURIComponent(user.resellerId)}`);
}

export async function POST(request: Request) {
  const { user } = await readPortalSession();
  if (!user?.resellerId) {
    return Response.json({ message: "Reseller account is missing from this session." }, { status: 400 });
  }

  const incoming = await request.formData();
  const logo = incoming.get("logo");
  if (!(logo instanceof File) || logo.size === 0) {
    return Response.json({ message: "A logo file is required to save branding." }, { status: 400 });
  }

  const form = new FormData();
  form.set("logo", logo);
  form.set("reseller_id", user.resellerId);
  form.set("reseller_name", user.firstName || user.name);
  form.set("display_name", String(incoming.get("display_name") || ""));
  form.set("support_email", String(incoming.get("support_email") || ""));
  form.set("primary_color", String(incoming.get("primary_color") || ""));
  form.set("secondary_color", String(incoming.get("secondary_color") || ""));
  form.set("star_color", String(incoming.get("star_color") || ""));

  return upstream(brandingUrl, { method: "POST", body: form });
}
