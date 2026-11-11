import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { publicEnv } from "@/lib/public-env";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface text-ink">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo className="h-7 w-auto text-ink" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
            Travel connectivity and airport services for businesses, in 180+ countries.
          </p>
          <p className="mt-4 text-sm text-muted">English · USD $ · {publicEnv.gitVersion || "QA"}</p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Products</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/#catalogue" className="hover:text-primary">Travel eSIM</Link></li>
            <li><Link href="/#catalogue" className="hover:text-primary">Local SIM</Link></li>
            <li><Link href="/#catalogue" className="hover:text-primary">Airport services</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Partners</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/signup" className="hover:text-primary">Apply</Link></li>
            <li><Link href="/login" className="hover:text-primary">Log in</Link></li>
            <li><Link href="/developer-api" className="hover:text-primary">API</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Company</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><a href="https://zetexa.com" className="hover:text-primary">zetexa.com</a></li>
            <li><a href="mailto:support@zetexa.com" className="hover:text-primary">Contact</a></li>
            <li><a href="mailto:support@zetexa.com" className="hover:text-primary">Privacy</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
