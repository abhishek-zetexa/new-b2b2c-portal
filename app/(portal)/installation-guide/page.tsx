import type { Metadata } from "next";
import { InstallationGuideView } from "@/components/portal/installation/installation-guide-view";

export const metadata: Metadata = {
  title: "Installation Guide | Partner Portal",
  description: "Step-by-step visual eSIM installation guides for iPhone, Android, and manual carrier activation codes.",
};

export default function Page() {
  return <InstallationGuideView />;
}
