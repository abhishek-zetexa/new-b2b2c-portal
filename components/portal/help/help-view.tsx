"use client";

import { useEffect, useState } from "react";
import { asList, portalRequest, text, type JsonRecord } from "@/lib/portal-fetch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageLoader } from "@/components/ui/wave-loader";

export function HelpView() {
  const [faqs, setFaqs] = useState<JsonRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalRequest<JsonRecord>("/api/help/faqs")
      .then((res) => {
        if (res.success) setFaqs(asList(res.data).filter((item) => text(item.page_type) === "B2B"));
      })
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto min-w-0 max-w-6xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">Help</h1>
      <Tabs value="faqs" onValueChange={() => undefined}>
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading ? <PageLoader className="min-h-40" /> : faqs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-line bg-surface px-6 py-16 text-center shadow-[var(--shadow)]">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-mint text-primary"><span className="text-lg font-semibold">?</span></span>
          <p className="mt-4 text-base font-semibold text-ink">No data found</p>
          <p className="mt-1.5 max-w-sm text-sm text-muted">No FAQs available at the moment.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {faqs.map((faq, index) => (
            <article key={text(faq.id) || index} className="rounded-3xl border border-line bg-surface p-5 shadow-[var(--shadow)]">
              <h2 className="font-semibold leading-6">{text(faq.question)}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{text(faq.answer)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
