import type { ReactNode } from "react";

export type BadgeVariant =
  | "default"
  | "mint"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "navy";

export function Badge({
  variant = "default",
  className = "",
  children,
}: {
  variant?: BadgeVariant;
  className?: string;
  children: ReactNode;
}) {
  const variantStyles: Record<BadgeVariant, string> = {
    default: "bg-mist text-ink border-line",
    mint: "bg-mint text-primary font-semibold border-teal/20",
    success: "bg-mint text-primary font-semibold border-teal/20",
    warning: "bg-amber-50 text-amber-800 border-amber-200",
    danger: "bg-red-50 text-danger border-red-200",
    outline: "bg-surface text-muted border-line",
    navy: "bg-navy text-white border-transparent",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

