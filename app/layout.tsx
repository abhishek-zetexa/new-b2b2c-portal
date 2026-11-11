import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { FreshNavigation } from "@/components/auth/fresh-navigation";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} h-full`}
      data-scroll-behavior="smooth"
      style={themeVars()}
    >
      <body className="min-h-full bg-page text-ink antialiased">
        <FreshNavigation />
        {children}
      </body>
    </html>
  );
}
