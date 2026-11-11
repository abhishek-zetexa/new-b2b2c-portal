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
    <div className="mx-auto min-w-0 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Help</h1>
        <p className="mt-2 text-sm leading-6 text-muted">Answers for the partner portal.</p>
      </div>
      <Tabs value="faqs" onValueChange={() => undefined}>
        <TabsList>
          <TabsTrigger value="faqs">FAQs</TabsTrigger>
        </TabsList>
      </Tabs>
      {loading ? <PageLoader className="min-h-40" /> : faqs.length === 0 ? (
        <p className="text-sm">No FAQs available at the moment.</p>
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
