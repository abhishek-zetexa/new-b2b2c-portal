"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const items = [
  {
    q: "Does it cost anything to become a partner?",
    a: "Applying is free. Once approved, you top up a prepaid wallet and pay only for what you sell.",
  },
  {
    q: "How long does approval take?",
    a: "Most applications are reviewed within one business day.",
  },
  {
    q: "Do I need to hold stock?",
    a: "No. eSIMs are allocated on demand, so you never hold inventory.",
  },
  {
    q: "Will my customers see Zetexa branding?",
    a: "By default, yes. You can add your own logo, colour theme and SMTP so customers see your brand instead.",
  },
  {
    q: "Can I connect this to my own platform?",
    a: "Yes. Use the reseller API to put the catalogue in your own app or booking flow.",
  },
];

export function FaqList() {
  const [open, setOpen] = useState(0);

  return (
    <div className="divide-y divide-line rounded-3xl border border-line bg-surface">
      {items.map((item, index) => {
        const active = open === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
              aria-expanded={active}
              onClick={() => setOpen(active ? -1 : index)}
            >
              <span className="text-base font-semibold">{item.q}</span>
              <Icon
                name="chevron"
                className={`h-5 w-5 shrink-0 text-primary transition ${active ? "rotate-180" : ""}`}
              />
            </button>
            {active ? <p className="px-5 pb-5 text-sm leading-6 text-muted sm:px-6">{item.a}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
