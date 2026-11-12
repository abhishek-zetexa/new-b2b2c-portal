"use client";

import { useEffect, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";

export function Dialog({
  open,
  onOpenChange,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[color-mix(in_srgb,var(--navy)_40%,transparent)] backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Modal Container */}
      <div className={`relative z-10 w-full max-w-lg rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)] transition-all sm:p-7 max-h-[90vh] overflow-y-auto ${className}`}>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute top-5 right-5 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-mist hover:text-ink transition"
          aria-label="Close dialog"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`space-y-1.5 text-left mb-5 ${className}`}>{children}</div>;
}

export function DialogTitle({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <h3 className={`text-xl font-semibold tracking-tight text-ink ${className}`}>{children}</h3>;
}

export function DialogDescription({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <p className={`text-sm leading-relaxed text-muted ${className}`}>{children}</p>;
}

export function DialogFooter({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={`mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end ${className}`}>{children}</div>;
}

