"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FieldLabel } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";

export type SearchOption = {
  value: string;
  label: string;
};

export function SearchableSelect({
  id,
  label,
  placeholder,
  options,
  value,
  onSelect,
  disabled = false,
}: {
  id: string;
  label: string;
  placeholder: string;
  options: SearchOption[];
  value: string;
  onSelect: (option: SearchOption) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const needle = query.trim().toLowerCase();
  const visible = needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options;

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          setQuery("");
          setOpen((current) => !current);
        }}
        style={{ color: selected ? "var(--ink)" : "color-mix(in srgb, var(--ink) 45%, transparent)" }}
        className={`field mt-2 flex items-center justify-between gap-3 text-left ${
          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
        }`}
      >
        <span className="truncate">{selected?.label || placeholder}</span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow)]">
          <div className="border-b border-line p-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              aria-label="Search"
              className="field"
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-60 overflow-y-auto p-1.5">
            {visible.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted">No results Found!</li>
            ) : (
              visible.map((option) => (
                <li key={option.value} role="option" aria-selected={option.value === value}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(option);
                      setQuery("");
                      setOpen(false);
                    }}
                    className={`flex w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm ${
                      option.value === value ? "bg-mint font-semibold text-primary" : "text-ink hover:bg-mint/70"
                    }`}
                  >
                    {option.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
