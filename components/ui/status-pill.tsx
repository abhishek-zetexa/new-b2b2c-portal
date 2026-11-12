export function StatusPill({ status }: { status: string }) {
  const clean = status.trim();
  if (!clean) return <span className="text-xs text-muted">—</span>;

  const value = clean.toUpperCase();
  const ok = value === "SUCCESS" || value === "ACTIVE" || value === "USED" || value === "VERIFIED";
  const warn = value === "PENDING" || value === "EXPIRED" || value === "REVOKED" || value === "INACTIVE" || value === "FAILED";
  const toneClasses = ok
    ? "bg-mint text-primary"
    : warn
      ? "bg-danger/10 text-danger"
      : "border border-line bg-page text-muted";
  const dotClasses = ok ? "bg-primary" : warn ? "bg-danger" : "bg-muted";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${toneClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotClasses}`} aria-hidden="true" />
      <span>{clean}</span>
    </span>
  );
}
