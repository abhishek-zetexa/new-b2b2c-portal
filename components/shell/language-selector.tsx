"use client";

import { useEffect, useRef, useState } from "react";
import { FlagImage } from "react-international-phone";
import { Icon } from "@/components/ui/icon";
import {
  applyGoogleTranslateDomPatch,
  findPortalLanguage,
  persistLanguage,
  portalLanguages,
  readSavedLanguage,
  selectPortalLanguage,
  triggerComboTranslation,
  type PortalLanguageCode,
} from "@/lib/portal-translate";
import "./portal-widgets.css";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement?: new (
          options: {
            pageLanguage: string;
            includedLanguages: string;
            autoDisplay?: boolean;
          },
          elementId: string,
        ) => unknown;
      };
    };
  }
}

const includedLanguages = portalLanguages.map((item) => item.code).join(",");

export function GoogleTranslateEngine({
  language,
  onSyncLanguage,
}: {
  language: PortalLanguageCode;
  onSyncLanguage: (next: PortalLanguageCode) => void;
}) {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    applyGoogleTranslateDomPatch();
    const initial = readSavedLanguage();
    if (initial !== "en") {
      persistLanguage(initial);
      onSyncLanguage(initial);
    }

    const initWidget = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      const mountNode = document.getElementById("google_translate_element");
      if (!TranslateElement || !mountNode || mountNode.childElementCount > 0) return;
      new TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages,
          autoDisplay: false,
        },
        "google_translate_element",
      );
      if (initial !== "en") {
        window.setTimeout(() => {
          triggerComboTranslation(initial);
        }, 120);
      }
    };

    window.googleTranslateElementInit = initWidget;
    if (window.google?.translate?.TranslateElement) {
      initWidget();
    } else if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    }
  }, [onSyncLanguage]);

  return (
    <div
      id="google_translate_element"
      className="pointer-events-none fixed top-0 -left-[9999px] h-px w-px overflow-hidden opacity-0"
      aria-hidden="true"
    />
  );
}

export function LanguageSelector({
  language,
  onChange,
  variant = "sidebar",
}: {
  language: PortalLanguageCode;
  onChange: (next: PortalLanguageCode) => void;
  variant?: "sidebar" | "header";
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const active = findPortalLanguage(language);
  const isHeader = variant === "header";

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleSelect(code: PortalLanguageCode) {
    setOpen(false);
    selectPortalLanguage(code, language, onChange);
  }

  return (
    <div ref={rootRef} className="notranslate relative">
      {open ? (
        <div
          role="listbox"
          aria-label="Select portal language"
          className={`absolute z-50 overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-[0_20px_48px_color-mix(in_srgb,var(--navy)_18%,transparent)] ${isHeader
              ? "top-full right-0 mt-2 w-60"
              : "right-0 bottom-full left-0 mb-2"
            }`}
        >
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Select language
          </p>
          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {portalLanguages.map((item) => {
              const selected = item.code === active.code;
              return (
                <button
                  key={item.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => handleSelect(item.code)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-sm transition ${selected
                      ? "bg-mint font-semibold text-primary"
                      : "text-ink hover:bg-soft"
                    }`}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <FlagImage iso2={item.flag} size="1.25rem" className="shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate leading-tight">{item.name}</span>
                      {item.nativeName !== item.name ? (
                        <span
                          className={`block truncate text-[11px] leading-tight ${selected ? "text-primary/80" : "text-muted"
                            }`}
                        >
                          {item.nativeName}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tracking-wider ${selected ? "bg-white text-primary" : "bg-page text-muted"
                        }`}
                    >
                      {item.short}
                    </span>
                    {selected ? <Icon name="check" className="h-3.5 w-3.5 text-primary" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {isHeader ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`Language: ${active.name}`}
          title={`Language: ${active.name}`}
          className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-xs font-semibold transition sm:text-sm ${open
              ? "border-primary bg-mint text-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
              : "border-primary/35 bg-mint/75 text-ink hover:border-primary hover:bg-mint"
            }`}
        >
          <FlagImage iso2={active.flag} size="1.15rem" className="shrink-0" />
          <span>{active.short}</span>
          <Icon
            name="chevron"
            className={`h-3.5 w-3.5 text-navy transition-transform duration-200 ${open ? "rotate-180" : ""
              }`}
          />
        </button>
      ) : (
        <div>
          <p className="mb-1.5 px-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
            Language
          </p>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`Language: ${active.name}`}
            className={`flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-2xl border px-3 py-2.5 text-left shadow-xs transition ${open
                ? "border-primary bg-mint shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_16%,transparent)]"
                : "border-primary/35 bg-mint/70 hover:border-primary hover:bg-mint"
              }`}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <FlagImage iso2={active.flag} size="1.25rem" className="shrink-0" />
              <span className="truncate text-sm font-semibold text-ink">{active.name}</span>
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-bold tracking-wider text-primary">
                {active.short}
              </span>
            </span>
            <Icon
              name="chevron"
              className={`h-4 w-4 shrink-0 text-navy transition-transform duration-200 ${open ? "rotate-0" : "rotate-180"
                }`}
            />
          </button>
        </div>
      )}
    </div>
  );
}
