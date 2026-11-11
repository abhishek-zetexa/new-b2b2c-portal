import type { CSSProperties } from "react";

const hexColor = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

const themeKeys = {
  "--teal": ["THEME_TEAL", "#0fa892"],
  "--teal-deep": ["THEME_TEAL_DEEP", "#087f70"],
  "--mint": ["THEME_MINT", "#e4f6f2"],
  "--mist": ["THEME_MIST", "#f5faf9"],
  "--navy": ["THEME_NAVY", "#344f70"],
  "--white": ["THEME_WHITE", "#ffffff"],
  "--danger": ["THEME_DANGER", "#dc2626"],
} as const;

function readColor(name: string, fallback: string) {
  const value = process.env[name]?.trim() ?? "";
  return hexColor.test(value) ? value : fallback;
}

export function themeVars(): CSSProperties {
  const style: Record<string, string> = {};
  for (const [variable, [name, fallback]] of Object.entries(themeKeys)) {
    style[variable] = readColor(name, fallback);
  }
  return style as CSSProperties;
}
