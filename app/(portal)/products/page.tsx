import type { Metadata } from "next";
import { SectionPage } from "@/components/portal/section-page";

export const metadata: Metadata = { title: "Products" };

export default function Page() {
  return (
    <SectionPage
      eyebrow="Products"
      title="Products"
      description="Search the partner catalogue and open a plan when you are ready to sell it."
    />
  );
}
