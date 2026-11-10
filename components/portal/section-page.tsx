export function SectionPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-3 text-base leading-7 text-muted">{description}</p>
      <div className="mt-8 rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)] sm:p-8">
        <p className="text-sm leading-6 text-muted">
          This screen is part of the new portal shell. The list, filters, and actions from the current partner portal will connect here without changing the navigation around them.
        </p>
      </div>
    </div>
  );
}
