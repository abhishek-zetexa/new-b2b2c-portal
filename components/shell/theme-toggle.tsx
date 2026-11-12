"use client";

import { useLayoutEffect } from "react";
import { Icon } from "@/components/ui/icon";

const storageKey = "portal-theme";

export function ThemeBoot() {
  useLayoutEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === "dark" || saved === "light") document.documentElement.dataset.theme = saved;
    } catch {
      /* the preference is optional */
    }
  }, []);
  return null;
}

export function applyTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    /* the preference is optional */
  }
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      aria-label="Switch color theme"
      title="Switch color theme"
      onClick={() => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")}
      className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line text-ink"
    >
      <Icon name="moon" className="theme-moon h-[18px] w-[18px]" />
      <Icon name="sun" className="theme-sun h-[18px] w-[18px]" />
    </button>
  );
}
