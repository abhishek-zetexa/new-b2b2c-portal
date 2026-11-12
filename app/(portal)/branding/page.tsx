import type { Metadata } from "next";
import { BrandingView } from "@/components/portal/branding/branding-view";

export const metadata: Metadata = {
  title: "Branding & Preference | Partner Portal",
  description: "White-label customization, logos, email templates, theme colors, and support contacts.",
};

export default function Page() {
  return <BrandingView />;
}
