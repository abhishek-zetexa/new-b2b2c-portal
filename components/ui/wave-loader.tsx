export function WaveLoader({
  size = "md",
  className = "",
  label = "Loading",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  return (
    <span role="status" aria-live="polite" aria-label={label} className={`wave-loader wave-loader-${size} ${className}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

export function PageLoader({
  className = "min-h-[52vh]",
}: {
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-center text-primary ${className}`}>
      <WaveLoader size="lg" />
    </div>
  );
}
