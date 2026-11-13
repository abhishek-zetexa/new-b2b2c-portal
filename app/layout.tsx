import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { FreshNavigation } from "@/components/auth/fresh-navigation";
import { ThemeBoot } from "@/components/shell/theme-toggle";
import { ToastProvider } from "@/components/ui/toast-provider";
import { themeVars } from "@/lib/theme";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Zetexa Partners",
    template: "%s · Zetexa Partners",
  },
  description:
    "Sell travel eSIMs and airport services under your own brand. One partner account for agencies, fintechs, and telecom resellers.",
  icons: { icon: "/brand/favicon.png" },
};

const themeStyle = `
html[data-theme="dark"] {
  --mint: #1f5c54 !important;
  --mist: #101820 !important;
  --page: #0d141c;
  --surface: #16202b;
  --ink: #e8eef5;
  --muted: #9aafc3;
  --line: color-mix(in srgb, #e8eef5 14%, #16202b);
  --soft: #101820;
  --shadow: 0 18px 40px rgb(0 0 0 / 45%);
  --stage-soft: color-mix(in srgb, #ffffff 82%, transparent);
  color-scheme: dark;
}
html[data-theme="dark"] .text-mint {
  color: #e4f6f2;
}
html[data-theme="dark"] .border-mint {
  border-color: #e4f6f2;
}
html[data-theme="dark"] .bg-mint.text-primary,
html[data-theme="dark"] .text-primary.bg-mint {
  color: var(--ink);
}
html[data-theme="dark"] .bg-mint .text-primary:not(.bg-white) {
  color: #b7f3e8;
}
html[data-theme="dark"] body {
  background:
    radial-gradient(900px 360px at 100% -8%, color-mix(in srgb, var(--teal) 24%, transparent), transparent 62%),
    var(--page);
}
html[data-theme="dark"] .theme-moon,
html:not([data-theme="dark"]) .theme-sun {
  display: none;
}
html[data-theme="dark"] .carrier-logo {
  filter: brightness(2.2);
}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full`}
      data-scroll-behavior="smooth"
      style={themeVars()}
    >
      <body className="min-h-full bg-page text-ink antialiased">
        <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
        <ThemeBoot />
        <FreshNavigation />
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
