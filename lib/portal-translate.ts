import type { CountryIso2 } from "react-international-phone";

export type PortalLanguage = {
  code: "en" | "fr" | "de" | "es" | "ar" | "ru" | "hi" | "ur";
  short: string;
  name: string;
  nativeName: string;
  flag: CountryIso2;
};

export const portalLanguages: readonly PortalLanguage[] = [
  { code: "en", short: "EN", name: "English", nativeName: "English", flag: "gb" },
  { code: "fr", short: "FR", name: "French", nativeName: "Français", flag: "fr" },
  { code: "de", short: "DE", name: "German", nativeName: "Deutsch", flag: "de" },
  { code: "es", short: "ES", name: "Spanish", nativeName: "Español", flag: "es" },
  { code: "ar", short: "AR", name: "Arabic", nativeName: "العربية", flag: "sa" },
  { code: "ru", short: "RU", name: "Russian", nativeName: "Русский", flag: "ru" },
  { code: "hi", short: "HI", name: "Hindi", nativeName: "हिन्दी", flag: "in" },
  { code: "ur", short: "UR", name: "Urdu", nativeName: "اردو", flag: "pk" },
] as const;

export type PortalLanguageCode = PortalLanguage["code"];

const STORAGE_KEY = "portal_language";
const languageSet = new Set<string>(portalLanguages.map((item) => item.code));

export function isPortalLanguage(value: string): value is PortalLanguageCode {
  return languageSet.has(value);
}

export function findPortalLanguage(code: string): PortalLanguage {
  return portalLanguages.find((item) => item.code === code) ?? portalLanguages[0];
}

function readGoogTransCookie(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);
  if (!match) return "";
  const value = decodeURIComponent(match[1]);
  return value.split("/").pop()?.trim().toLowerCase() ?? "";
}

export function readSavedLanguage(): PortalLanguageCode {
  if (typeof window === "undefined") return "en";
  const fromCookie = readGoogTransCookie();
  if (isPortalLanguage(fromCookie)) return fromCookie;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)?.trim().toLowerCase() ?? "";
    if (isPortalLanguage(stored)) return stored;
  } catch {
    // Ignore storage access errors.
  }
  return "en";
}

function clearGoogTransCookie() {
  if (typeof document === "undefined") return;
  const expired = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = expired;
  const host = window.location.hostname;
  if (host && host.includes(".") && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    document.cookie = `${expired} domain=${host};`;
    document.cookie = `${expired} domain=.${host};`;
  }
}

export function persistLanguage(code: PortalLanguageCode) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Ignore storage access errors.
  }
  if (code === "en") {
    clearGoogTransCookie();
    return;
  }
  document.cookie = `googtrans=/en/${code}; path=/; SameSite=Lax;`;
}

/**
 * Guards React 19 DOM reconciliation against `<font>` wrapper nodes inserted by
 * Google Translate / browser translation engines across route transitions.
 */
export function applyGoogleTranslateDomPatch() {
  if (typeof window === "undefined") return;
  const patchedWindow = window as Window & { __gtDomPatched?: boolean };
  if (patchedWindow.__gtDomPatched) return;
  patchedWindow.__gtDomPatched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function removeChildPatched<T extends Node>(
    this: Node,
    child: T,
  ): T {
    if (child.parentNode !== this) {
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function insertBeforePatched<T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

export function triggerComboTranslation(code: PortalLanguageCode): boolean {
  if (typeof document === "undefined") return false;
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (!combo) return false;
  if (combo.value !== code) {
    combo.value = code;
    combo.dispatchEvent(new Event("change"));
  }
  return true;
}

export function isPageTranslated(): boolean {
  if (typeof document === "undefined") return false;
  const html = document.documentElement;
  if (html.classList.contains("translated-ltr") || html.classList.contains("translated-rtl")) {
    return true;
  }
  const combo = document.querySelector<HTMLSelectElement>(".goog-te-combo");
  if (combo && combo.value && combo.value !== "en") return true;
  const cookieLang = readGoogTransCookie();
  return Boolean(cookieLang && cookieLang !== "en");
}

let pendingComboRetry: number | null = null;

export function selectPortalLanguage(
  code: PortalLanguageCode,
  current: PortalLanguageCode,
  onChange: (next: PortalLanguageCode) => void,
) {
  if (code === current) return;

  if (pendingComboRetry !== null) {
    window.clearInterval(pendingComboRetry);
    pendingComboRetry = null;
  }

  const wasTranslated = isPageTranslated();
  persistLanguage(code);
  onChange(code);

  if (code === "en") {
    if (wasTranslated) {
      window.location.reload();
    }
    return;
  }

  if (triggerComboTranslation(code)) return;

  let attempts = 0;
  pendingComboRetry = window.setInterval(() => {
    attempts += 1;
    if (triggerComboTranslation(code) || attempts >= 25) {
      if (pendingComboRetry !== null) {
        window.clearInterval(pendingComboRetry);
        pendingComboRetry = null;
      }
    }
  }, 150);
}
