"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function Modal({ open, title, onClose, children, footer }: ModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const focusable = [...items].filter((item) => !item.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-pointer bg-[color-mix(in_srgb,var(--navy)_46%,transparent)]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[min(40rem,calc(100dvh-1.5rem))] w-full max-w-3xl flex-col overflow-hidden rounded-[1.75rem] border border-line bg-surface shadow-[0_24px_70px_color-mix(in_srgb,var(--navy)_22%,transparent)]"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-7">
          <h2 id={titleId} className="text-lg font-semibold text-ink">
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-10 w-10 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
        {footer ? (
          <div className="flex justify-end border-t border-line px-5 py-4 sm:px-7">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
