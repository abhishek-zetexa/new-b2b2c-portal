import { PageLoader } from "@/components/ui/wave-loader";

export default function Loading() {
  return <PageLoader className="min-h-[calc(100dvh-var(--header-h)-4rem)]" />;
}