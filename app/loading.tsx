import { PageLoader } from "@/components/ui/wave-loader";

export default function Loading() {
  return (
    <div className="bg-page">
      <PageLoader className="min-h-dvh" />
    </div>
  );
}
